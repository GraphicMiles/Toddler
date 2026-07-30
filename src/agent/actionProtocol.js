import { normalizeRelativeWorkspacePath } from '../workspace/workspaceProvider.js';
import { getCurrentSafetyPolicy } from '../safety/SafetyPolicy.js';

export const STRUCTURED_ACTION_TYPES = Object.freeze([
  'read_file',
  'search_files',
  'propose_patch',
  'create_file',
  'terminal',
  'web_search',
  'github_api',
  'git_clone',
  'git',
  'final',
  'plan',
]);

const MAX_ACTIONS = 8;
const MAX_PATHS = 12;
const MAX_RATIONALE = 2000;
const MAX_PATCH = 200_000;
const MAX_FILE_CONTENT = 200_000;

function requireString(value, label, maximum) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  if (value.length > maximum) throw new Error(`${label} exceeds the ${maximum}-character limit.`);
  return value.trim();
}

export function validateStructuredAction(input) {
  const policy = getCurrentSafetyPolicy();

  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Agent action must be an object.');
  
  // Normalize: models sometimes return "action" instead of "type"
  const normalizedInput = { ...input };
  if (!normalizedInput.type && normalizedInput.action) {
    normalizedInput.type = normalizedInput.action;
    delete normalizedInput.action;
  }
  
  if (!STRUCTURED_ACTION_TYPES.includes(normalizedInput.type)) throw new Error(`Unsupported agent action: ${normalizedInput.type}`);
  
  const paths = normalizedInput.paths == null ? [] : normalizedInput.paths;
  if (!Array.isArray(paths) || paths.length > MAX_PATHS) throw new Error(`Agent action paths must contain at most ${MAX_PATHS} items.`);
  
  const normalizedPaths = paths.map(path => normalizeRelativeWorkspacePath(path));
  const rationale = requireString(normalizedInput.rationale || normalizedInput.description || 'Agent action', 'Agent action rationale', MAX_RATIONALE);
  const action = { type: normalizedInput.type, paths: normalizedPaths, rationale };

  if (normalizedInput.type === 'read_file' && normalizedPaths.length !== 1) throw new Error('read_file requires exactly one path.');
  
  if (normalizedInput.type === 'create_file') {
    if (normalizedPaths.length !== 1) throw new Error('create_file requires exactly one path.');
    action.content = requireString(normalizedInput.content, 'New file content', MAX_FILE_CONTENT);
  }
  
  if (normalizedInput.type === 'search_files' || normalizedInput.type === 'web_search') {
    action.query = requireString(normalizedInput.query || normalizedInput.rationale, 'Search query', 500);
  }
  
  if (normalizedInput.type === 'terminal') {
    action.command = requireString(normalizedInput.command, 'Terminal command', 4000);
    action.cwd = typeof normalizedInput.cwd === 'string' ? normalizedInput.cwd.slice(0, 1000) : '';
    
    const requestedTimeout = Number(normalizedInput.timeoutSeconds) || 120;
    const maxTimeout = policy.getTerminalMaxTimeout();
    action.timeoutSeconds = Math.min(Math.max(requestedTimeout, 1), maxTimeout);

    // Terminal command safety check
    if (policy.shouldRestrictTerminal() && !policy.allowArbitraryTerminalCommands()) {
      if (!policy.isTerminalCommandAllowed(action.command)) {
        throw new Error('Terminal command blocked by current safety policy.');
      }
    }
  }
  
  if (normalizedInput.type === 'github_api') {
    action.method = String(normalizedInput.method || 'GET').toUpperCase();
    action.apiPath = requireString(normalizedInput.apiPath, 'GitHub API path', 1000);
    action.body = typeof normalizedInput.body === 'string' ? normalizedInput.body.slice(0, 200000) : JSON.stringify(normalizedInput.body || '');
  }
  
  if (normalizedInput.type === 'git_clone') {
    action.repository = requireString(normalizedInput.repository, 'GitHub repository', 500);
    action.branch = typeof normalizedInput.branch === 'string' ? normalizedInput.branch.slice(0, 300) : '';
  }
  
  if (normalizedInput.type === 'git') {
    action.operation = requireString(normalizedInput.operation, 'Git operation', 30);
    if (!['status', 'log', 'fetch', 'pull', 'checkout', 'commit', 'push', 'rebase'].includes(action.operation)) {
      throw new Error(`Unsupported Git operation: ${action.operation}`);
    }
    action.repositoryPath = typeof normalizedInput.repositoryPath === 'string' ? normalizedInput.repositoryPath.slice(0, 1000) : '';
    action.branch = typeof normalizedInput.branch === 'string' ? normalizedInput.branch.slice(0, 300) : '';
    action.message = typeof normalizedInput.message === 'string' ? normalizedInput.message.slice(0, 2000) : '';
    action.upstream = typeof normalizedInput.upstream === 'string' ? normalizedInput.upstream.slice(0, 300) : '';
    action.force = normalizedInput.force === true;
  }
  
  if (input.type === 'final') {
    action.answer = requireString(input.answer || input.rationale, 'Final answer', 20000);
  }
  
  if (input.type === 'propose_patch') {
    const maxPatch = policy.getMaxPatchSize() || MAX_PATCH;
    action.patch = requireString(input.patch, 'Unified diff', maxPatch);
    
    if (policy.requireUnifiedDiff() && 
        (!action.patch.includes('--- ') || !action.patch.includes('+++ ') || !action.patch.includes('@@'))) {
      throw new Error('propose_patch requires a unified diff.');
    }
  } else if (input.patch != null) {
    throw new Error(`${input.type} must not include a patch.`);
  }
  
  if (normalizedInput.type !== 'create_file' && normalizedInput.content != null) {
    throw new Error(`${normalizedInput.type} must not include file content.`);
  }
  
  return Object.freeze(action);
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try { return JSON.parse(candidate); } catch {}
  const start = Math.min(...[candidate.indexOf('{'), candidate.indexOf('[')].filter(index => index >= 0));
  if (!Number.isFinite(start)) throw new Error('The model response does not contain JSON actions.');
  const opener = candidate[start];
  const closer = opener === '[' ? ']' : '}';
  const end = candidate.lastIndexOf(closer);
  if (end <= start) throw new Error('The model response contains incomplete JSON actions.');
  return JSON.parse(candidate.slice(start, end + 1));
}

export function parseStructuredActions(text) {
  const envelope = extractJson(text);
  const list = Array.isArray(envelope) ? envelope : (Array.isArray(envelope.actions) ? envelope.actions : [envelope]);
  if (list.length === 0 || list.length > MAX_ACTIONS) throw new Error(`An agent response must contain 1-${MAX_ACTIONS} actions.`);
  return list.map(validateStructuredAction);
}

export function structuredActionPrompt(toolNames = []) {
  return `Return JSON only with an actions array. Each action must use one of: ${STRUCTURED_ACTION_TYPES.join(', ')}. Paths must be relative to the selected workspace root. Never repeat the root folder name and never request a shell command. Available app tools: ${toolNames.join(', ') || 'none'}. For existing-file code changes, return a standard unified diff in a propose_patch action. For a new file, return create_file with exactly one path and complete content. Writes are proposals only and require user approval.`;
}
