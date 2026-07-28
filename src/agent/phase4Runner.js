import { parseStructuredActions, structuredActionPrompt, validateStructuredAction } from './actionProtocol.js';
import { AGENT_ROLES } from './agentRoles.js';
import { AgentRunBudget, emitSubagentStage } from './subagentOrchestrator.js';
import { parseUnifiedDiff } from '../patch/unifiedDiff.js';
import { skillRegistry } from '../skills/skillRegistry.js';
import { formatReviewForModel, reviewPatchDeterministically } from '../skills/reviewSkills.js';

export function isCodeChangeRequest(message = '') {
  return /\b(fix|implement|change|update|modify|refactor|replace|patch|correct|optimize|remove|rename)\b/i.test(message)
    && /\b(code|file|function|class|component|bug|error|project|workspace|[\w-]+\.(?:js|jsx|ts|tsx|json|py|java|kt|cpp|css|html|md))\b/i.test(message);
}

async function generateText(provider, model, messages, signal, budget) {
  budget.beforeModelCall();
  let output = '';
  const generationResult = await provider.stream({ model, messages, signal, onToken: token => { output += token; } });
  return { output, generationResult };
}

function patchActionFromOutput(output) {
  try {
    const patches = parseStructuredActions(output).filter(action => action.type === 'propose_patch');
    if (patches.length === 1) return patches[0];
  } catch {}
  const fenced = output.match(/```diff\s*([\s\S]*?)```/i);
  const directStart = output.indexOf('--- ');
  const patch = fenced?.[1]?.trim() || (directStart >= 0 ? output.slice(directStart).trim() : '');
  if (!patch) throw new Error('The local model did not return a JSON patch action or unified diff.');
  const paths = parseUnifiedDiff(patch).map(file => file.newPath);
  return validateStructuredAction({ type: 'propose_patch', paths, rationale: 'Local model returned a directly parseable unified diff.', patch });
}

function reviewerVerdict(output) {
  try {
    const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const value = JSON.parse((fenced?.[1] || output).trim());
    return {
      verdict: value.verdict === 'revise' ? 'revise' : 'pass',
      issues: Array.isArray(value.issues) ? value.issues.map(String).slice(0, 10) : [],
    };
  } catch {
    return { verdict: 'unknown', issues: [] };
  }
}

export async function generatePatchProposal({
  provider,
  model,
  request,
  workspaceContext,
  projectMemory = '',
  signal,
  toolNames = [],
  onStage,
  budgetOptions,
}) {
  if (!provider?.stream || !model?.id) throw new Error('A loaded model provider is required for Phase 4.');
  if (!workspaceContext?.trim()) throw new Error('Workspace context is required before proposing a patch.');
  const budget = new AgentRunBudget(budgetOptions);
  emitSubagentStage(onStage, 'planning', { role: AGENT_ROLES.planner.id, budget: budget.snapshot() });
  emitSubagentStage(onStage, 'context', { role: AGENT_ROLES.contextScout.id, budget: budget.snapshot() });

  const routed = skillRegistry.route(request);
  const reviewerSkillIds = ['scope-creep-detector', 'patch-reviewer', 'security-reviewer', 'test-planner']
    .filter(id => skillRegistry.isEnabled(id));
  const activeSkills = [...new Map([...routed, ...reviewerSkillIds.map(id => skillRegistry.get(id))].filter(Boolean).map(skill => [skill.id, skill])).values()];
  const allowedBySkills = new Set(activeSkills.flatMap(skill => skill.allowedTools));
  const visibleToolNames = toolNames.filter(name => allowedBySkills.has(name));
  const skillInstructions = activeSkills.map(skill => `SKILL ${skill.name}: ${skill.instructions}`).join('\n');
  const instruction = `${AGENT_ROLES.coder.instructions}\n${structuredActionPrompt(visibleToolNames)}\nReturn exactly one propose_patch action for this request. Modify existing text files only. Preserve unrelated code. The patch must use --- a/path and +++ b/path headers and exact context lines.\n${skillInstructions}`;
  const userContent = `REQUEST:\n${request}\n\n${projectMemory ? `${projectMemory}\n\n` : ''}WORKSPACE CONTEXT:\n${workspaceContext}`;
  emitSubagentStage(onStage, 'coding', { role: AGENT_ROLES.coder.id, skills: activeSkills.map(skill => skill.id), budget: budget.snapshot() });
  const initial = await generateText(provider, model, [
    { role: 'system', content: instruction },
    { role: 'user', content: userContent },
  ], signal, budget);
  let action = patchActionFromOutput(initial.output);
  budget.addFiles(action.paths);

  emitSubagentStage(onStage, 'reviewing', { role: AGENT_ROLES.reviewer.id, files: action.paths, budget: budget.snapshot() });
  const deterministic = reviewPatchDeterministically({
    request,
    patch: action.patch,
    enabledSkillIds: reviewerSkillIds,
  });
  const reviewPrompt = `${AGENT_ROLES.reviewer.instructions}\nReturn JSON only: {"verdict":"pass"|"revise","issues":["specific issue"]}.\nOriginal request:\n${request}\n\nProposed patch:\n${action.patch}\n\n${formatReviewForModel(deterministic)}`;
  const critic = await generateText(provider, model, [{ role: 'system', content: reviewPrompt }, { role: 'user', content: 'Review this patch now.' }], signal, budget);
  const modelReview = reviewerVerdict(critic.output);
  const needsRevision = deterministic.verdict === 'revise' || modelReview.verdict === 'revise';
  let revisionResult = null;

  if (needsRevision) {
    emitSubagentStage(onStage, 'revising', { role: AGENT_ROLES.coder.id, budget: budget.snapshot() });
    const critique = [formatReviewForModel(deterministic), ...modelReview.issues.map(issue => `- Model reviewer: ${issue}`)].join('\n');
    const revision = await generateText(provider, model, [
      { role: 'system', content: `${AGENT_ROLES.coder.instructions}\n${structuredActionPrompt(visibleToolNames)}\nRevise the patch once. Return exactly one propose_patch action and no commentary.` },
      { role: 'user', content: `${userContent}\n\nORIGINAL PATCH:\n${action.patch}\n\nREVIEW TO ADDRESS:\n${critique}` },
    ], signal, budget);
    action = patchActionFromOutput(revision.output);
    budget.addFiles(action.paths);
    revisionResult = revision.generationResult;
  }

  emitSubagentStage(onStage, 'verifying', { role: AGENT_ROLES.verifier.id, files: action.paths, budget: budget.snapshot() });
  const finalReview = reviewPatchDeterministically({ request, patch: action.patch, enabledSkillIds: reviewerSkillIds });
  if (finalReview.verdict === 'revise') {
    throw new Error(`Patch remained blocked after one revision: ${finalReview.issues.filter(issue => issue.severity === 'high' || issue.severity === 'critical').map(issue => `${issue.path}: ${issue.message}`).join('; ')}`);
  }
  action = validateStructuredAction({
    ...action,
    rationale: `${action.rationale} Review: ${finalReview.verdict}. ${finalReview.issues.length} deterministic issue(s); ${finalReview.suggestions.length} test suggestion(s).`,
  });
  emitSubagentStage(onStage, 'waiting-approval', { files: action.paths, budget: budget.snapshot() });
  return {
    action,
    raw: initial.output,
    generationResult: revisionResult || critic.generationResult || initial.generationResult,
    review: { deterministic: finalReview, model: modelReview, revised: needsRevision },
    activeSkills: activeSkills.map(skill => skill.id),
    budget: budget.snapshot(),
  };
}
