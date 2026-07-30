/**
 * Bounded Scratchpad
 *
 * A hidden, structured reasoning/progress buffer for the agentic loop. Unlike a
 * free-form notes blob (which would silently eat the context window on a mobile
 * model), this is a fixed-shape, size-capped record: goal, observations,
 * open questions, completed steps, and the next action. It is summarised into a
 * short prompt block so the model keeps track of long-horizon work without
 * re-deriving state each turn.
 *
 * Not shown to the user; used internally.
 */

const LIMITS = { observations: 8, openQuestions: 6, completed: 12, maxItemChars: 200 };

function clip(text) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > LIMITS.maxItemChars ? s.slice(0, LIMITS.maxItemChars) + '…' : s;
}

// Keep the most recent N items (ring-buffer semantics).
function cap(list, n) {
  return list.length > n ? list.slice(list.length - n) : list;
}

export class Scratchpad {
  constructor(goal = '') {
    this.goal = clip(goal);
    this.observations = [];
    this.openQuestions = [];
    this.completed = [];
    this.nextAction = '';
  }

  setGoal(goal) { this.goal = clip(goal); return this; }

  addObservation(text) {
    const t = clip(text);
    if (t && !this.observations.includes(t)) this.observations = cap([...this.observations, t], LIMITS.observations);
    return this;
  }

  addOpenQuestion(text) {
    const t = clip(text);
    if (t && !this.openQuestions.includes(t)) this.openQuestions = cap([...this.openQuestions, t], LIMITS.openQuestions);
    return this;
  }

  resolveQuestion(text) {
    const t = clip(text);
    this.openQuestions = this.openQuestions.filter(q => q !== t);
    return this;
  }

  addCompleted(text) {
    const t = clip(text);
    if (t) this.completed = cap([...this.completed, t], LIMITS.completed);
    return this;
  }

  setNextAction(text) { this.nextAction = clip(text); return this; }

  // Record a tool call + result outcome as a completed step / observation.
  recordToolResult(tool, args, result) {
    const target = args?.path || args?.command || args?.query || args?.url || '';
    const ok = result?.success !== false && !result?.error;
    this.addCompleted(`${tool}${target ? ' ' + target : ''} → ${ok ? 'ok' : 'failed'}`);
    if (!ok) this.addObservation(`${tool} failed: ${clip(result?.error || result?.output || 'unknown error')}`);
    return this;
  }

  isEmpty() {
    return !this.goal && !this.observations.length && !this.openQuestions.length && !this.completed.length && !this.nextAction;
  }

  /** Compact prompt block for injection into the model's context. */
  toPrompt() {
    if (this.isEmpty()) return '';
    const lines = ['SCRATCHPAD (internal working memory — track progress, do not repeat completed steps):'];
    if (this.goal) lines.push(`Goal: ${this.goal}`);
    if (this.completed.length) lines.push(`Done: ${this.completed.join(' | ')}`);
    if (this.openQuestions.length) lines.push(`Open questions: ${this.openQuestions.join(' | ')}`);
    if (this.observations.length) lines.push(`Notes: ${this.observations.join(' | ')}`);
    if (this.nextAction) lines.push(`Next: ${this.nextAction}`);
    return lines.join('\n');
  }

  toJSON() {
    return { goal: this.goal, observations: this.observations, openQuestions: this.openQuestions, completed: this.completed, nextAction: this.nextAction };
  }
}
