import { parseStructuredActions, structuredActionPrompt, validateStructuredAction } from './actionProtocol.js';
import { AGENT_ROLES } from './agentRoles.js';
import { AgentRunBudget, emitSubagentStage } from './subagentOrchestrator.js';
import { parseUnifiedDiff } from '../patch/unifiedDiff.js';
import { skillRegistry } from '../skills/skillRegistry.js';
import { formatReviewForModel, reviewCreatedFileDeterministically, reviewPatchDeterministically } from '../skills/reviewSkills.js';

export function isFileCreationRequest(message = '') {
  const hasCreateIntent = /\b(create|add|make|write|generate|build|implement|scaffold)\b/i.test(message);
  const hasFileKeyword = /\b[\w.-]+\.(?:js|jsx|ts|tsx|json|py|java|kt|cpp|css|html|md|txt|yml|yaml|xml|sh|bat)\b/i.test(message);
  const hasProjectKeyword = /\b(landing page|website|webpage|app|component|script|stylesheet|style sheet|config|configuration|readme|documentation|api|server|client|database|schema|test|tests)\b/i.test(message);
  
  // If user mentions a project type, infer file creation even without extension
  return hasCreateIntent && (hasFileKeyword || hasProjectKeyword);
}

export function requestedFilePath(message = '') {
  const explicitPath = String(message).match(/\b([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:js|jsx|ts|tsx|json|py|java|kt|cpp|css|html|md|txt|yml|yaml|xml|sh|bat))\b/i)?.[1];
  if (explicitPath) return explicitPath;
  
  // Infer file names from common project keywords
  const patterns = [
    { regex: /\blanding\s*page\b/i, default: 'index.html' },
    { regex: /\bwebsite\b/i, default: 'index.html' },
    { regex: /\bwebpage\b/i, default: 'page.html' },
    { regex: /\breact\s*component\b/i, default: 'Component.jsx' },
    { regex: /\bcomponent\b/i, default: 'Component.jsx' },
    { regex: /\bstylesheet\b/i, default: 'styles.css' },
    { regex: /\bstyle\s*sheet\b/i, default: 'styles.css' },
    { regex: /\bconfig(?:uration)?\b/i, default: 'config.json' },
    { regex: /\breadme\b/i, default: 'README.md' },
    { regex: /\bdocumentation\b/i, default: 'docs.md' },
    { regex: /\bapi\b/i, default: 'api.js' },
    { regex: /\bserver\b/i, default: 'server.js' },
    { regex: /\bclient\b/i, default: 'client.js' },
    { regex: /\bdatabase\b/i, default: 'schema.sql' },
    { regex: /\bschema\b/i, default: 'schema.sql' },
    { regex: /\btest\b/i, default: 'test.js' },
    { regex: /\btests\b/i, default: 'test.js' },
    { regex: /\bapp\b/i, default: 'App.jsx' },
    { regex: /\bscript\b/i, default: 'script.js' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(message)) return pattern.default;
  }
  return '';
}

export function needsCreationFilename(message = '') {
  return /\b(create|add|make|write|generate)\b/i.test(message)
    && /\b(file|landing page|stylesheet|component|script|document)\b/i.test(message)
    && !requestedFilePath(message);
}

// Recover the most recently mentioned filename from conversation history so a
// follow-up like "create the file" (no name) reuses the file just discussed
// instead of re-asking. Scans newest-first across user and assistant turns.
const FILENAME_TOKEN = /\b([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:js|jsx|ts|tsx|json|py|java|kt|cpp|css|html|md|txt|yml|yaml|xml|sh|bat))\b/i;

export function recentFilenameFromMessages(messages = [], { lookback = 6 } = {}) {
  if (!Array.isArray(messages)) return '';
  const recent = messages.slice(-lookback).reverse();
  for (const message of recent) {
    const content = typeof message?.content === 'string' ? message.content : '';
    const match = content.match(FILENAME_TOKEN);
    if (match) return match[1];
  }
  return '';
}

export function isCodeChangeRequest(message = '') {
  return isFileCreationRequest(message) || (/\b(fix|implement|change|update|modify|refactor|replace|patch|correct|optimize|remove|rename)\b/i.test(message)
    && /\b(code|file|function|class|component|bug|error|project|workspace|[\w-]+\.(?:js|jsx|ts|tsx|json|py|java|kt|cpp|css|html|md))\b/i.test(message));
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

// If a would-be file content is actually a JSON action envelope (the model
// echoed the protocol instead of the file), dig out the real inner content.
function unwrapEnvelopeContent(text) {
  const t = String(text || '').trim();
  if (!/^\{[\s\S]*"(?:actions|action|create_file|content)"/.test(t) && !/^\[/.test(t)) return null;
  try {
    let obj = JSON.parse(t);
    if (Array.isArray(obj)) obj = obj[0];
    if (obj && Array.isArray(obj.actions)) obj = obj.actions[0];
    if (obj && typeof obj.content === 'string' && obj.content.trim()) {
      return { content: obj.content, path: obj.path || (Array.isArray(obj.paths) ? obj.paths[0] : '') };
    }
  } catch { /* not valid JSON — treat as literal content */ }
  return null;
}

function looksLikeActionJson(text) {
  return /^\s*[[{][\s\S]*"(?:action|actions|create_file|propose_patch)"/.test(String(text || ''));
}

function createFileActionFromOutput(output, expectedPath) {
  try {
    const actions = parseStructuredActions(output).filter(action => action.type === 'create_file');
    if (actions.length === 1) return validateStructuredAction({ ...actions[0], paths: [expectedPath || actions[0].paths[0]] });
  } catch { /* fall through to fenced/plain extraction */ }

  const fenced = output.match(/```(?:[a-z0-9_-]+)?\s*([\s\S]*?)```/i);
  let content = fenced?.[1]?.trim() || String(output || '').trim();
  if (!content) throw new Error('The model did not return valid create_file content.');

  // Guard against the classic bug: the "content" is really the JSON envelope.
  const unwrapped = unwrapEnvelopeContent(content);
  if (unwrapped) content = unwrapped.content.trim();
  else if (looksLikeActionJson(content)) {
    // It's a protocol echo we couldn't unwrap — refuse rather than write junk.
    throw new Error('The model returned a protocol action instead of file content. Please try again.');
  }

  return validateStructuredAction({
    type: 'create_file',
    paths: [expectedPath],
    rationale: `Create ${expectedPath} inside the selected workspace root.`,
    content: content + '\n',
  });
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
  const creatingFile = isFileCreationRequest(request);
  const expectedPath = creatingFile ? requestedFilePath(request) : '';
  if (creatingFile && !expectedPath) throw new Error('Name the new file with an extension, for example body.css.');
  if (!workspaceContext?.trim() && !creatingFile) throw new Error('Workspace context is required before proposing a patch.');
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
  const operationInstruction = creatingFile
    ? `Return exactly one create_file action with a "content" field containing the COMPLETE, PRODUCTION-QUALITY file — never a placeholder, stub, or "TODO". The path must be exactly "${expectedPath}" relative to the selected workspace root. For web pages: include real semantic HTML structure, embedded CSS styling (modern, responsive, attractive), and meaningful example content — a full page, not a bare heading. Do NOT wrap the file content in another JSON object; put the raw file text directly in "content". No shell commands or tutorial prose.`
    : 'Return exactly one propose_patch action for this request. Modify existing text files only. Preserve unrelated code. The patch must use --- a/path and +++ b/path headers and exact context lines.';
  const instruction = `${AGENT_ROLES.coder.instructions}\n${structuredActionPrompt(visibleToolNames)}\n${operationInstruction}\n${skillInstructions}`;
  const userContent = `REQUEST:\n${request}\n\n${projectMemory ? `${projectMemory}\n\n` : ''}WORKSPACE CONTEXT:\n${workspaceContext || '(Selected workspace root is available; no existing file context is required for this new file.)'}`;
  emitSubagentStage(onStage, 'coding', { role: AGENT_ROLES.coder.id, skills: activeSkills.map(skill => skill.id), budget: budget.snapshot() });
  const initial = await generateText(provider, model, [
    { role: 'system', content: instruction },
    { role: 'user', content: userContent },
  ], signal, budget);
  let action = creatingFile ? createFileActionFromOutput(initial.output, expectedPath) : patchActionFromOutput(initial.output);
  budget.addFiles(action.paths);

  emitSubagentStage(onStage, 'reviewing', { role: AGENT_ROLES.reviewer.id, files: action.paths, budget: budget.snapshot() });
  const deterministic = creatingFile
    ? reviewCreatedFileDeterministically({ request, path: action.paths[0], content: action.content, enabledSkillIds: reviewerSkillIds })
    : reviewPatchDeterministically({ request, patch: action.patch, enabledSkillIds: reviewerSkillIds });
  const artifactLabel = creatingFile ? `Proposed new file ${action.paths[0]}:\n${action.content}` : `Proposed patch:\n${action.patch}`;
  const reviewPrompt = `${AGENT_ROLES.reviewer.instructions}\nReturn JSON only: {"verdict":"pass"|"revise","issues":["specific issue"]}.\nOriginal request:\n${request}\n\n${artifactLabel}\n\n${formatReviewForModel(deterministic)}`;
  const critic = await generateText(provider, model, [{ role: 'system', content: reviewPrompt }, { role: 'user', content: 'Review this patch now.' }], signal, budget);
  const modelReview = reviewerVerdict(critic.output);
  const needsRevision = deterministic.verdict === 'revise' || modelReview.verdict === 'revise';
  let revisionResult = null;

  if (needsRevision) {
    emitSubagentStage(onStage, 'revising', { role: AGENT_ROLES.coder.id, budget: budget.snapshot() });
    const critique = [formatReviewForModel(deterministic), ...modelReview.issues.map(issue => `- Model reviewer: ${issue}`)].join('\n');
    const revision = await generateText(provider, model, [
      { role: 'system', content: `${AGENT_ROLES.coder.instructions}\n${structuredActionPrompt(visibleToolNames)}\nRevise the ${creatingFile ? 'new file' : 'patch'} once. Return exactly one ${creatingFile ? 'create_file' : 'propose_patch'} action and no commentary.` },
      { role: 'user', content: `${userContent}\n\nORIGINAL ${creatingFile ? 'FILE' : 'PATCH'}:\n${creatingFile ? action.content : action.patch}\n\nREVIEW TO ADDRESS:\n${critique}` },
    ], signal, budget);
    action = creatingFile ? createFileActionFromOutput(revision.output, expectedPath) : patchActionFromOutput(revision.output);
    budget.addFiles(action.paths);
    revisionResult = revision.generationResult;
  }

  emitSubagentStage(onStage, 'verifying', { role: AGENT_ROLES.verifier.id, files: action.paths, budget: budget.snapshot() });
  const finalReview = creatingFile
    ? reviewCreatedFileDeterministically({ request, path: action.paths[0], content: action.content, enabledSkillIds: reviewerSkillIds })
    : reviewPatchDeterministically({ request, patch: action.patch, enabledSkillIds: reviewerSkillIds });
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
