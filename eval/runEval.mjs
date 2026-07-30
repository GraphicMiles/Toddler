/**
 * ForgeAI eval harness.
 *
 * Usage:  GROQ_API_KEY=... node eval/runEval.mjs
 *
 * Scores three dimensions with a measured, reproducible methodology:
 *   1. Intent understanding  — offline, deterministic (intentUnderstanding layer)
 *   2. Agentic reliability   — live model + real agenticLoop against a mock FS
 *   3. Contextualization      — subset of agentic cases needing read/search/multi-file
 *
 * No API key hardcoded; read from env only.
 */

import { understand } from '../src/agent/intentUnderstanding.js';
import { runAgenticLoop } from '../src/agent/agenticLoop.js';
import { parseLlamaFunctionSyntax } from '../src/agent/toolSchemas.js';
import { UNDERSTAND_CASES, AGENTIC_CASES } from './corpus.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const API_KEY = process.env.GROQ_API_KEY || '';
const MODEL_ID = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const BASE_URL = 'https://api.groq.com/openai/v1';

// ---------------------------------------------------------------------------
// Minimal localStorage shim (some modules touch it).
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

// ---------------------------------------------------------------------------
// A real OpenAI-compatible provider hitting Groq with native tools. Kept local
// to the harness so it never depends on nativeBridge/browser globals.
function groqProvider() {
  return {
    supportsToolUse: true,
    async loadModel() { return { loaded: true }; },
    async stream({ messages, tools, onToken, signal }) {
      const body = { model: MODEL_ID, messages: messages.map(m => (
        m.role === 'tool' ? { role: 'tool', tool_call_id: m.tool_call_id, content: String(m.content ?? '') }
        : m.role === 'assistant' && Array.isArray(m.tool_calls) ? { role: 'assistant', content: m.content ? String(m.content) : null, tool_calls: m.tool_calls }
        : { role: m.role || 'user', content: String(m.content ?? '') }
      )), stream: false };
      if (Array.isArray(tools) && tools.length) { body.tools = tools; body.tool_choice = 'auto'; }
      // Retry on 429 (free-tier TPM) with backoff so the eval completes.
      let res;
      for (let attempt = 0; attempt < 5; attempt++) {
        res = await fetch(`${BASE_URL}/chat/completions`, {
          method: 'POST', signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
          body: JSON.stringify(body),
        });
        if (res.status !== 429) break;
        await sleep(15000);
      }
      if (!res.ok) {
        let payload = null; const raw = await res.text();
        try { payload = JSON.parse(raw); } catch {}
        // Mirror the provider's tool_use_failed recovery so the eval measures the
        // fixed behaviour (Groq/Llama <function=...> salvage).
        const fg = payload?.error?.failed_generation;
        if (res.status === 400 && fg) {
          const recovered = parseLlamaFunctionSyntax(fg);
          if (recovered.length) {
            const toolCalls = recovered.map((c, i) => ({ id: `rec_${i}`, type: 'function', function: { name: c.tool, arguments: JSON.stringify(c.args) } }));
            return { content: '', toolCalls };
          }
        }
        const e = new Error(`HTTP ${res.status}: ${raw.slice(0, 200)}`); e.status = res.status; throw e;
      }
      const json = await res.json();
      const msg = json.choices?.[0]?.message || {};
      if (msg.content) onToken?.(msg.content);
      return { content: msg.content || '', toolCalls: Array.isArray(msg.tool_calls) ? msg.tool_calls : undefined };
    },
    async stop() {}, async unloadModel() {},
  };
}

// In-memory workspace matching the loop's expected interface.
function mockWorkspace(initial = {}) {
  const files = new Map(Object.entries(initial));
  const folders = new Set();
  return {
    async readText(p) { if (!files.has(p)) throw new Error('ENOENT: no such file ' + p); return files.get(p); },
    async writeText(p, c) { files.set(p, c); },
    async createFile(p) { if (!files.has(p)) files.set(p, ''); },
    async createFolder(p) { folders.add(p); },
    async delete(p) { files.delete(p); },
    async inspect(p) { if (!files.has(p) && !folders.has(p)) throw new Error('missing'); return { path: p }; },
    async list() { return { items: [...files.keys()].map(name => ({ name, type: 'file' })) }; },
    _files: files, _folders: folders,
  };
}

const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

// ---------------------------------------------------------------------------
// 1) Intent understanding (offline, deterministic)
function runUnderstand() {
  let pass = 0;
  const fails = [];
  for (const c of UNDERSTAND_CASES) {
    const u = understand(c.text, { history: c.history });
    const e = c.expect;
    let ok = true;
    if (e.category && u.category !== e.category) ok = false;
    if (e.vague !== undefined && u.vague !== e.vague) ok = false;
    if (e.needsEmpty && u.needs.length !== 0) ok = false;
    if (e.needsIncludes && !u.needs.some(n => n.includes(e.needsIncludes))) ok = false;
    if (e.resolvedTargetIncludes && !(u.resolvedTarget || '').includes(e.resolvedTargetIncludes)) ok = false;
    if (e.workflow !== undefined && u.workflow !== e.workflow) ok = false;
    if (ok) pass++; else fails.push({ id: c.id, text: c.text, got: { category: u.category, vague: u.vague, needs: u.needs, resolvedTarget: u.resolvedTarget, workflow: u.workflow }, want: e });
  }
  return { total: UNDERSTAND_CASES.length, pass, fails };
}

// ---------------------------------------------------------------------------
// 2) Agentic reliability (live model)
async function runAgentic() {
  const results = [];
  // Optional slicing so free-tier TPM limits don't cascade: EVAL_START/EVAL_LIMIT.
  const start = parseInt(process.env.EVAL_START || '0', 10);
  const limit = parseInt(process.env.EVAL_LIMIT || String(AGENTIC_CASES.length), 10);
  const cases = AGENTIC_CASES.slice(start, start + limit);
  for (const c of cases) {
    const ws = mockWorkspace(c.files || {});
    const usedTools = [];
    let outcome = { id: c.id, family: c.family, pass: false, detail: '' };
    try {
      const r = await runAgenticLoop({
        provider: groqProvider(), model: { modelId: MODEL_ID }, userMessage: c.text,
        workspaceProvider: ws, isNative: true,
        workspaceFiles: Object.keys(c.files || {}),
        onToolCall: ({ tool }) => usedTools.push(tool),
      });
      const answer = r.response || '';
      const checks = [];
      if (c.expectTools) checks.push([`tools⊇[${c.expectTools}]`, c.expectTools.every(t => usedTools.includes(t))]);
      if (c.minToolCalls) checks.push([`>=${c.minToolCalls} tool calls`, usedTools.length >= c.minToolCalls]);
      if (c.expectAnswer) checks.push(['answer matches', c.expectAnswer.test(answer)]);
      if (c.expectFile) checks.push([`file ${c.expectFile.path}`, (ws._files.get(c.expectFile.path) || '').includes(c.expectFile.includes)]);
      if (c.expectFileAny) checks.push(['any expected file', c.expectFileAny.some(f => (ws._files.get(f.path) || '').includes(f.includes))]);
      if (c.expectAsksOrResponds) checks.push(['asked or responded (no blind action)', r.awaitingUserInput === true || (usedTools.filter(t => !['respond', 'ask_user'].includes(t)).length === 0)]);
      outcome.pass = checks.length > 0 && checks.every(([, ok]) => ok);
      outcome.detail = checks.map(([n, ok]) => `${ok ? '✓' : '✗'} ${n}`).join('  ') + `  | tools: [${usedTools.join(', ')}]`;
    } catch (err) {
      outcome.detail = 'ERROR: ' + err.message;
    }
    results.push(outcome);
    process.stdout.write(outcome.pass ? '.' : 'x');
    await sleep(6000); // stay under free-tier tokens-per-minute
  }
  process.stdout.write('\n');
  return results;
}

// ---------------------------------------------------------------------------
(async () => {
  console.log(`\n=== ForgeAI Eval — model: ${MODEL_ID} ===\n`);

  const u = runUnderstand();
  console.log(`1) Intent understanding (offline): ${u.pass}/${u.total} = ${pct(u.pass, u.total)}%`);
  for (const f of u.fails) console.log(`   ✗ ${f.id} "${f.text}" got=${JSON.stringify(f.got)} want=${JSON.stringify(f.want)}`);

  if (!API_KEY) {
    console.log('\n(no GROQ_API_KEY — skipping live agentic eval)\n');
    return;
  }

  console.log(`\n2) Agentic reliability (live model): running ${AGENTIC_CASES.length} cases...`);
  const a = await runAgentic();
  const aPass = a.filter(r => r.pass).length;
  for (const r of a) console.log(`   ${r.pass ? '✓' : '✗'} ${r.id} [${r.family}] ${r.detail}`);
  console.log(`\n   Agentic: ${aPass}/${a.length} = ${pct(aPass, a.length)}%`);

  // Contextualization subset: cases that require reading/searching existing code.
  const ctxIds = new Set(['a01', 'a04', 'a05', 'a06', 'a07']);
  const ctx = a.filter(r => ctxIds.has(r.id));
  const ctxPass = ctx.filter(r => r.pass).length;
  console.log(`   Contextualization subset: ${ctxPass}/${ctx.length} = ${pct(ctxPass, ctx.length)}%`);

  // Weighted overall smartness score (0-10).
  const uScore = u.pass / u.total;
  const aScore = aPass / a.length;
  const cScore = ctx.length ? ctxPass / ctx.length : 0;
  const overall = (uScore * 0.3 + aScore * 0.45 + cScore * 0.25) * 10;
  console.log(`\n=== SCORES ===`);
  console.log(`Intent understanding : ${(uScore * 10).toFixed(1)}/10`);
  console.log(`Agentic reliability  : ${(aScore * 10).toFixed(1)}/10`);
  console.log(`Contextualization    : ${(cScore * 10).toFixed(1)}/10`);
  console.log(`Weighted overall     : ${overall.toFixed(1)}/10`);
  console.log('');
})();
