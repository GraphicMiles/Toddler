/**
 * Confidence Engine (evidence-based)
 *
 * Leading agents ask for confirmation when uncertain and proceed when sure. The
 * naive way is to ask the model "how confident are you?" — but LLMs are badly
 * miscalibrated at self-reported confidence. Instead this derives confidence
 * from OBSERVABLE evidence:
 *
 *   - action reversibility (delete = risky, read = safe)
 *   - the mission planner's own confidence + whether it flagged missing info
 *   - quality of retrieved context (did RAG actually find relevant files?)
 *   - request ambiguity (very short / vague messages)
 *
 * The output drives a simple policy: high-confidence irreversible actions can
 * proceed; low-confidence ones should ask the user first.
 */

// How reversible/destructive each tool is. Lower = more dangerous.
const ACTION_SAFETY = {
  read_file: 1.0, list_files: 1.0, search_code: 1.0, git_status: 1.0, git_log: 1.0,
  git_diff: 1.0, search_web: 1.0, fetch_page: 1.0, ask_user: 1.0, respond: 1.0,
  create_file: 0.75, write_file: 0.6, apply_patch: 0.6, rename: 0.55,
  git_commit: 0.5, git_clone: 0.6,
  git_push: 0.3, git_rebase: 0.25,
  delete_file: 0.2, delete: 0.2, run_terminal: 0.35, terminal: 0.35,
};

export function actionSafety(toolName) {
  return ACTION_SAFETY[toolName] ?? 0.5;
}

/**
 * Compute a confidence score in [0,1] for acting on a request / taking an action.
 *
 * @param {Object} evidence
 * @param {number} [evidence.planConfidence]  0..1 from the mission planner
 * @param {string[]} [evidence.missingInfo]   things the planner said it lacked
 * @param {number} [evidence.contextMatches]  number of relevant files RAG found
 * @param {string} [evidence.message]         the user's request text
 * @param {string} [evidence.tool]            tool about to run (optional)
 * @returns {{score:number, reasons:string[], evidence:object}}
 */
export function assessConfidence({ planConfidence, missingInfo = [], contextMatches = 0, message = '', tool } = {}) {
  const reasons = [];
  // Start from the planner's confidence when available, else a neutral prior.
  let score = typeof planConfidence === 'number' ? Math.max(0, Math.min(1, planConfidence)) : 0.6;
  if (typeof planConfidence === 'number') reasons.push(`planner confidence ${Math.round(planConfidence * 100)}%`);

  // Missing information lowers confidence, per item, capped.
  if (missingInfo.length > 0) {
    const penalty = Math.min(0.4, missingInfo.length * 0.15);
    score -= penalty;
    reasons.push(`missing info: ${missingInfo.slice(0, 3).join(', ')}`);
  }

  // Good retrieved context raises confidence; none lowers it slightly.
  if (contextMatches >= 2) { score += 0.1; reasons.push(`found ${contextMatches} relevant files`); }
  else if (contextMatches === 0) { score -= 0.05; }

  // Very short/vague requests are inherently ambiguous.
  const words = String(message).trim().split(/\s+/).filter(Boolean).length;
  if (words > 0 && words <= 3) { score -= 0.2; reasons.push('request is very short/ambiguous'); }

  // A dangerous action demands more certainty: blend in its safety factor so an
  // irreversible action can never look highly confident on weak evidence.
  if (tool) {
    const safety = actionSafety(tool);
    if (safety < 0.5) { score = Math.min(score, 0.5 + safety); reasons.push(`${tool} is hard to undo`); }
  }

  score = Math.max(0, Math.min(1, score));
  return { score, reasons, evidence: { planConfidence, missingInfo, contextMatches, tool } };
}

/**
 * Decide whether to proceed, clarify, or (for dangerous actions) require
 * explicit approval — from an evidence-based confidence assessment.
 *
 * @param {object} assessment  result of assessConfidence
 * @param {object} [opts]
 * @param {number} [opts.clarifyBelow=0.5]  ask a question below this score
 * @param {string} [opts.tool]              action being considered
 * @returns {{action:'proceed'|'clarify'|'confirm', reason:string, score:number}}
 */
export function decideOnConfidence(assessment, { clarifyBelow = 0.5, tool } = {}) {
  const score = assessment?.score ?? 0.5;
  const safety = tool ? actionSafety(tool) : 1;
  // Irreversible actions on less-than-high confidence require explicit confirm.
  if (safety <= 0.3 && score < 0.85) {
    return { action: 'confirm', reason: `${tool || 'This action'} is hard to undo and confidence is ${Math.round(score * 100)}%.`, score };
  }
  if (score < clarifyBelow) {
    return { action: 'clarify', reason: `Low confidence (${Math.round(score * 100)}%): ${(assessment?.reasons || []).join('; ') || 'request is ambiguous'}.`, score };
  }
  return { action: 'proceed', reason: `Confidence ${Math.round(score * 100)}%.`, score };
}
