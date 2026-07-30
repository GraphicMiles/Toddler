/**
 * Preference (Personality) Memory
 *
 * Remembers HOW the user likes to work — not just "likes React", but style
 * facts like "wants production-ready code", "prefers explanations after code",
 * "hates repeated questions", "prefers autonomy". Injected as a tiny prompt so
 * responses feel personalized. Near-free.
 *
 * Facts are learned from lightweight signals AND can be set explicitly. Stored
 * as a small key→value map so it never bloats context.
 */

const KEY = 'forgeai_preferences_v1';

const DEFAULTS = Object.freeze({
  stack: '',            // e.g. "React + TypeScript + Tailwind"
  completeness: '',     // "production-ready" | "quick prototype"
  explanationStyle: '', // "explain after code" | "code only" | "explain first"
  autonomy: '',         // "prefers autonomy" | "wants confirmation"
  verbosity: '',        // "concise" | "detailed"
});

function load() {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) }; }
  catch { return { ...DEFAULTS }; }
}
function persist(p) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { console.warn('preferenceMemory save failed', e); }
}

export class PreferenceMemory {
  constructor() { this.prefs = load(); }

  set(key, value) {
    if (!(key in DEFAULTS)) return;
    this.prefs[key] = String(value || '').slice(0, 120);
    persist(this.prefs);
  }

  get() { return { ...this.prefs }; }

  /**
   * Learn preferences from a user message using conservative signals only
   * (explicit statements), so we never infer wrongly.
   */
  learnFromMessage(message = '') {
    const t = String(message).toLowerCase();
    let changed = false;
    const setIf = (cond, key, val) => { if (cond && this.prefs[key] !== val) { this.prefs[key] = val; changed = true; } };

    setIf(/\b(production|production-ready|complete|full|no placeholders?|no stubs?|not partial)\b/.test(t), 'completeness', 'production-ready');
    setIf(/\b(just a )?(quick|simple|minimal|prototype|mvp|rough)\b/.test(t), 'completeness', 'quick prototype');
    setIf(/\b(don'?t explain|no explanation|code only|just the code)\b/.test(t), 'explanationStyle', 'code only');
    setIf(/\b(explain (after|it)|with explanation|tell me how it works)\b/.test(t), 'explanationStyle', 'explain after code');
    setIf(/\b(just do it|don'?t ask|stop asking|full autonomy|be autonomous)\b/.test(t), 'autonomy', 'prefers autonomy');
    // "ask me first" only counts as wanting confirmation when NOT negated
    // ("don't ask me first" means the opposite).
    setIf(/\b(ask (me )?first|confirm before|check with me)\b/.test(t) && !/\b(don'?t|do not|no)\b[^.]*\bask\b/.test(t), 'autonomy', 'wants confirmation');
    setIf(/\b(be concise|keep it short|brief)\b/.test(t), 'verbosity', 'concise');
    setIf(/\b(be detailed|be thorough|in depth|explain fully)\b/.test(t), 'verbosity', 'detailed');

    const stack = detectStack(t);
    if (stack && this.prefs.stack !== stack) { this.prefs.stack = stack; changed = true; }

    if (changed) persist(this.prefs);
    return changed;
  }

  /** A compact system-prompt block, or '' when nothing is known. */
  getPrompt() {
    const p = this.prefs;
    const parts = [];
    if (p.stack) parts.push(`preferred stack: ${p.stack}`);
    if (p.completeness) parts.push(p.completeness === 'production-ready' ? 'wants complete, production-ready code (no placeholders/TODOs)' : 'wants quick prototypes');
    if (p.explanationStyle) parts.push(p.explanationStyle);
    if (p.autonomy) parts.push(p.autonomy);
    if (p.verbosity) parts.push(`${p.verbosity} responses`);
    if (!parts.length) return '';
    return `USER PREFERENCES (honor these): ${parts.join('; ')}.`;
  }

  clear() { this.prefs = { ...DEFAULTS }; if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY); }
}

function detectStack(t) {
  const found = [];
  if (/\breact\b/.test(t)) found.push('React');
  if (/\bvue\b/.test(t)) found.push('Vue');
  if (/\bsvelte\b/.test(t)) found.push('Svelte');
  if (/\btypescript|tsx?\b/.test(t)) found.push('TypeScript');
  if (/\btailwind\b/.test(t)) found.push('Tailwind');
  if (/\bnext\.?js\b/.test(t)) found.push('Next.js');
  if (/\bfirebase\b/.test(t)) found.push('Firebase');
  if (/\bsupabase\b/.test(t)) found.push('Supabase');
  if (/\bnode(\.js)?|express\b/.test(t)) found.push('Node');
  return found.length >= 1 ? found.join(' + ') : '';
}

export const preferenceMemory = new PreferenceMemory();
