/**
 * Mission Planner
 *
 * Before the agentic loop starts editing, a capable model turns the request into
 * a structured mission: goal, what it needs, what's missing, complexity, and an
 * ordered step plan. This is the "reason about the work first" behaviour that
 * makes leading agents feel smart — and the plan is injected into the loop so
 * the model finishes the whole job (UI → backend → tests → verify) instead of
 * stopping at the first edit.
 *
 * Capability-gated: only runs for tool-capable providers (cloud). Small
 * on-device models would emit noisy plans and burn their context, so they skip
 * planning entirely and use the lean guided path.
 */

const PLAN_SYSTEM_PROMPT = `You are the planning stage of a coding agent. Given the user's request and workspace context, produce a concise structured plan.

Respond with ONLY a JSON object (no markdown, no prose) in this exact shape:
{
  "goal": "one sentence describing the concrete outcome",
  "confidence": 0.0-1.0,
  "requires": ["read_files" | "write_files" | "terminal" | "tests" | "web" | "git"],
  "missing": ["specific info you'd need but don't have, e.g. 'error log', 'target file'"],
  "complexity": "trivial" | "low" | "medium" | "high",
  "steps": ["ordered, concrete actions — include verification/tests as steps"],
  "risks": ["anything that could break, or empty array"]
}

Rules:
- Keep steps concrete and ordered; the LAST steps should verify the work (read back, lint, test, build).
- "confidence" reflects how sure you are you understood the request, not how easy it is.
- If the request is ambiguous, lower confidence and list what's missing.
- Prefer 3-10 steps. Don't pad.`;

function safeJsonExtract(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; } } }
  }
  return null;
}

function normalizePlan(raw, request) {
  const plan = raw && typeof raw === 'object' ? raw : {};
  const asArray = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()) : []);
  let confidence = Number(plan.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));
  const validComplexity = ['trivial', 'low', 'medium', 'high'];
  return {
    goal: typeof plan.goal === 'string' && plan.goal.trim() ? plan.goal.trim() : String(request).slice(0, 160),
    confidence,
    requires: asArray(plan.requires),
    missing: asArray(plan.missing),
    complexity: validComplexity.includes(plan.complexity) ? plan.complexity : 'medium',
    steps: asArray(plan.steps),
    risks: asArray(plan.risks),
  };
}

/**
 * Should we run the mission planner for this request?
 * Only for tool-capable providers, and skip trivial/very short messages.
 */
export function shouldPlanMission({ toolCapable = false, message = '' } = {}) {
  if (!toolCapable) return false;
  const text = String(message).trim();
  if (text.length < 12) return false;
  return true;
}

/**
 * Produce a structured mission plan. Never throws — on any failure it returns a
 * minimal fallback plan so the agentic loop can still proceed.
 *
 * @returns {Promise<{goal,confidence,requires,missing,complexity,steps,risks}>}
 */
export async function planMission({ provider, model, request, workspaceContext = '', workspaceFiles = [], signal }) {
  const fileHint = workspaceFiles.length
    ? `\n\nWorkspace files (sample):\n${workspaceFiles.slice(0, 40).join('\n')}`
    : '';
  const contextHint = workspaceContext ? `\n\nRelevant context:\n${String(workspaceContext).slice(0, 2000)}` : '';
  try {
    let output = '';
    await provider.stream({
      model,
      signal,
      messages: [
        { role: 'system', content: PLAN_SYSTEM_PROMPT },
        { role: 'user', content: `Request: ${request}${fileHint}${contextHint}` },
      ],
      onToken: token => { output += token; },
    });
    return normalizePlan(safeJsonExtract(output), request);
  } catch {
    return normalizePlan(null, request);
  }
}

/**
 * Render a plan as a compact system-prompt block to inject into the agentic loop
 * so the model follows its own plan and finishes the whole job.
 */
export function formatPlanForPrompt(plan) {
  if (!plan) return '';
  const lines = [`MISSION PLAN (follow this; complete every step before you respond):`];
  lines.push(`Goal: ${plan.goal}`);
  if (plan.steps.length) lines.push(`Steps:\n${plan.steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`);
  if (plan.requires.length) lines.push(`Requires: ${plan.requires.join(', ')}`);
  if (plan.risks.length) lines.push(`Risks to avoid: ${plan.risks.join('; ')}`);
  lines.push(`Do not stop after the first edit — work through the plan, verify your changes (read back / lint / test), then respond with a summary of what you did.`);
  return lines.join('\n');
}
