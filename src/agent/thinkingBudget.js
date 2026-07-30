/**
 * Adaptive Thinking Budget
 *
 * The gate that makes a richer cognitive pipeline affordable on mobile: it sizes
 * each request and returns which cognitive stages should run. Trivial turns skip
 * planning/skepticism entirely (net token SAVINGS); only genuinely hard tasks
 * wake the full pipeline. This keeps the blended token overhead small while the
 * hard turns get real depth.
 *
 * Levels: trivial < small < medium < large < massive.
 */

const LEVELS = ['trivial', 'small', 'medium', 'large', 'massive'];

// Stage flags per level. `true` = run this cognitive stage for this task size.
const STAGE_MATRIX = {
  trivial:  { plan: false, skeptic: false, hypotheses: false, verify: false, curiosity: false, maxIterations: 4 },
  small:    { plan: false, skeptic: false, hypotheses: false, verify: true,  curiosity: false, maxIterations: 6 },
  medium:   { plan: true,  skeptic: true,  hypotheses: false, verify: true,  curiosity: true,  maxIterations: 8 },
  large:    { plan: true,  skeptic: true,  hypotheses: true,  verify: true,  curiosity: true,  maxIterations: 12 },
  massive:  { plan: true,  skeptic: true,  hypotheses: true,  verify: true,  curiosity: true,  maxIterations: 16 },
};

/**
 * Assess the task size from the message + optional signals.
 * @param {object} args
 * @param {string}  [args.message]
 * @param {string}  [args.category]        intent category (from understand())
 * @param {number}  [args.estimatedSteps]  from detectWorkflow()
 * @param {boolean} [args.workflow]        multi-step?
 * @param {boolean} [args.isCodeChange]
 * @param {boolean} [args.toolCapable]     provider supports tools?
 * @returns {{ level, stages, reasons }}
 */
export function assessThinkingBudget({ message = '', category = 'chat', estimatedSteps = 1, workflow = false, isCodeChange = false, toolCapable = true } = {}) {
  const text = String(message).trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const reasons = [];
  let score = 0;

  // Chit-chat / tiny lookups are trivial.
  if (category === 'chitchat') return finalize('trivial', ['chit-chat'], toolCapable);
  if (category === 'text_format') return finalize('trivial', ['deterministic-ish formatting'], toolCapable);

  // Base score by category.
  if (category === 'explain' || category === 'research') { score += 1; reasons.push(`${category} question`); }
  if (category === 'read_inspect') { score += 1; reasons.push('inspection'); }
  if (category === 'code_generate') { score += 2; reasons.push('code generation'); }
  if (isCodeChange || category === 'code_edit' || category === 'file_create') { score += 2; reasons.push('code change'); }
  if (category === 'git' || category === 'terminal') { score += 1; reasons.push('tool op'); }

  // Multi-step workflows are heavier.
  if (workflow) { score += 2; reasons.push(`workflow (~${estimatedSteps} steps)`); }
  if (estimatedSteps >= 4) { score += 1; reasons.push('many steps'); }

  // Longer, richer requests imply more work.
  if (words >= 25) { score += 1; reasons.push('detailed request'); }
  if (words >= 60) { score += 1; reasons.push('very detailed request'); }

  // Complexity keywords.
  if (/\b(refactor|migrate|architecture|redesign|rewrite|across|entire|whole|multiple files|end to end|full stack|integrate|authentication|payment|security)\b/i.test(text)) {
    score += 2; reasons.push('high-complexity keywords');
  }
  if (/\b(build (me )?(a|an) (app|website|dashboard|platform|system))\b/i.test(text)) { score += 2; reasons.push('build a whole app'); }

  const level = score <= 0 ? 'small'
    : score === 1 ? 'small'
    : score <= 3 ? 'medium'
    : score <= 5 ? 'large'
    : 'massive';

  return finalize(level, reasons, toolCapable);
}

function finalize(level, reasons, toolCapable) {
  const stages = { ...STAGE_MATRIX[level] };
  // Tool-incapable (small on-device) models can't reliably run planner/skeptic
  // passes — keep them lean regardless of task size.
  if (!toolCapable) {
    stages.plan = false; stages.skeptic = false; stages.hypotheses = false; stages.curiosity = false;
  }
  return { level, stages, reasons };
}

export function budgetLevelRank(level) {
  return Math.max(0, LEVELS.indexOf(level));
}

export { LEVELS as THINKING_LEVELS };
