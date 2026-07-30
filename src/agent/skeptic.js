/**
 * Skeptic (Reverse-Thinking / Devil's Advocate / Future-Simulation, merged)
 *
 * Before applying a code change, one extra pass asks: "If this fails, why?" It
 * finds hidden assumptions, edge cases, security issues, and likely breakage,
 * then the coder can strengthen the change. This is the single highest-ROI
 * cognition upgrade — it catches real bugs for one cheap model call, and only
 * runs on write/edit turns when the thinking budget enables it.
 */

const SKEPTIC_SYSTEM = `You are the Skeptic — a senior engineer whose ONLY job is to find why a proposed change might fail BEFORE it ships. Be concrete and specific to THIS change, not generic.

Respond with ONLY a JSON object:
{
  "risks": ["specific ways this could break — edge cases, nulls, races, wrong path, missing import, breaking callers, security"],
  "assumptions": ["assumptions the change makes that might be wrong"],
  "mustFix": ["issues serious enough to fix before shipping (subset of risks)"],
  "verdict": "ship" | "revise",
  "confidence": 0.0-1.0
}

Rules:
- Focus on real, likely failures for this specific artifact. No filler.
- If it genuinely looks solid, return verdict "ship" with empty mustFix.
- Keep each item one short sentence. Max 5 items per array.`;

function safeJson(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; } } }
  }
  return null;
}

function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const arr = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()).slice(0, 5) : []);
  let confidence = Number(r.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.6;
  const mustFix = arr(r.mustFix);
  const verdict = r.verdict === 'revise' || mustFix.length > 0 ? 'revise' : 'ship';
  return { risks: arr(r.risks), assumptions: arr(r.assumptions), mustFix, verdict, confidence: Math.max(0, Math.min(1, confidence)) };
}

/**
 * Critique a proposed change. Never throws — returns a permissive "ship" on
 * failure so it can't block the pipeline.
 *
 * @param {object} args
 * @param {object} args.provider
 * @param {object} args.model
 * @param {string} args.request         the user's original request
 * @param {string} args.artifact        the proposed file content or unified diff
 * @param {string} [args.kind]          'file' | 'patch'
 * @param {string} [args.path]
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<{risks,assumptions,mustFix,verdict,confidence}>}
 */
export async function critiqueChange({ provider, model, request, artifact, kind = 'file', path = '', signal }) {
  try {
    const label = kind === 'patch' ? 'PROPOSED PATCH' : `PROPOSED FILE${path ? ` (${path})` : ''}`;
    let out = '';
    await provider.stream({
      model,
      signal,
      maxTokens: 500,
      messages: [
        { role: 'system', content: SKEPTIC_SYSTEM },
        { role: 'user', content: `USER REQUEST:\n${request}\n\n${label}:\n${String(artifact).slice(0, 6000)}` },
      ],
      onToken: t => { out += t; },
    });
    return normalize(safeJson(out));
  } catch {
    return { risks: [], assumptions: [], mustFix: [], verdict: 'ship', confidence: 0.5 };
  }
}

/** Render a skeptic critique as a revision instruction for the coder. */
export function formatCritiqueForRevision(critique) {
  if (!critique || critique.verdict !== 'revise' || critique.mustFix.length === 0) return '';
  const lines = ['A skeptic review found issues you MUST fix before finalizing:'];
  for (const m of critique.mustFix) lines.push(`- ${m}`);
  if (critique.assumptions.length) lines.push(`Watch these assumptions: ${critique.assumptions.join('; ')}`);
  lines.push('Return the corrected, complete artifact addressing every point above.');
  return lines.join('\n');
}
