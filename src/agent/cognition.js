/**
 * Cognition helpers — the "Cognitive OS" glue.
 *
 *  - cognitiveState: derive a human-readable mission state (Interpreting,
 *    Planning, Exploring, Executing, Verifying, Blocked, ...) from the current
 *    pipeline stage, for a cheap "feels smart" UI signal. Pure mapping, no cost.
 *
 *  - seniorEngineerDirective / hypothesisDirective / intentExpansionDirective:
 *    prompt fragments that add senior-engineer thinking, in-prompt N=2 hypothesis
 *    comparison, and gated intent expansion — all as text (near-free), gated by
 *    the thinking budget.
 */

const STATE_LABELS = {
  interpreting: 'Interpreting your request',
  planning: 'Planning the approach',
  recalling: 'Recalling relevant experience',
  exploring: 'Exploring the codebase',
  executing: 'Making changes',
  skeptic: 'Stress-testing the change',
  verifying: 'Verifying the result',
  researching: 'Researching sources',
  blocked: 'Blocked — needs your input',
  responding: 'Composing the answer',
  done: 'Done',
};

export function cognitiveState(stage) {
  return STATE_LABELS[stage] || 'Thinking';
}

export const COGNITIVE_STATES = STATE_LABELS;

// A cheap, always-on prompt nudge toward senior-engineer reasoning.
export function seniorEngineerDirective() {
  return 'Approach this the way a thoughtful senior engineer would: understand the real goal, consider edge cases and how it could break, and prefer correct, complete, maintainable solutions over quick partial ones.';
}

// In-prompt hypothesis comparison (N=2 in ONE call — no extra round-trips).
// Only used for large/massive tasks where weighing approaches matters.
export function hypothesisDirective() {
  return 'Before implementing, briefly weigh the two most plausible approaches (one sentence each), pick the better one and say why in a single line, then implement only that. Do not enumerate more than two.';
}

// Gated intent expansion: propose the fuller set of sub-tasks a request implies,
// as a plan for the user — never silently expand scope.
export function intentExpansionDirective() {
  return 'If this request implies obvious adjacent work (e.g. "build authentication" implies UI, validation, error handling, and tests), briefly list those as suggested next steps at the end — but only implement exactly what was asked unless told otherwise.';
}

/**
 * Assemble the extra cognitive prompt fragments enabled for this turn.
 * @param {object} stages  from assessThinkingBudget().stages
 * @returns {string[]} system-message-ready fragments
 */
export function buildCognitiveDirectives(stages = {}) {
  const out = [seniorEngineerDirective()];
  if (stages.hypotheses) out.push(hypothesisDirective());
  if (stages.plan) out.push(intentExpansionDirective());
  return out;
}
