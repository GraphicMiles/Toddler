import { normalizeRelativeWorkspacePath } from '../workspace/workspaceProvider.js';

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
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Agent action must be an object.');
  if (!STRUCTURED_ACTION_TYPES.includes(input.type)) throw new Error(`Unsupported agent action: ${input.type}`);
  const paths = input.paths == null ? [] : input.paths;
  if (!Array.isArray(paths) || paths.length > MAX_PATHS) throw new Error(`Agent action paths must contain at most ${MAX_PATHS} items.`);
  const normalizedPaths = paths.map(path => normalizeRelativeWorkspacePath(path));
  const rationale = requireString(input.rationale, 'Agent action rationale', MAX_RATIONALE);
  const action = { type: input.type, paths: normalizedPaths, rationale };

  if (input.type === 'read_file' && normalizedPaths.length !== 1) throw new Error('read_file requires exactly one path.');
  if (input.type === 'create_file') {
    if (normalizedPaths.length !== 1) throw new Error('create_file requires exactly one path.');
    action.content = requireString(input.content, 'New file content', MAX_FILE_CONTENT);
  }
  if (input.type === 'search_files' || input.type === 'web_search') action.query = requireString(input.query || input.rationale, 'Search query', 500);
  if (input.type === 'terminal') {
    action.command = requireString(input.command, 'Terminal command', 4000);
    action.cwd = typeof input.cwd === 'string' ? input.cwd.slice(0, 1000) : '';
    action.timeoutSeconds = Math.min(Math.max(Number(input.timeoutSeconds) || 120, 1), 600);
  }
  if (input.type === 'github_api') {
    action.method = String(input.method || 'GET').toUpperCase();
    action.apiPath = requireString(input.apiPath, 'GitHub API path', 1000);
    action.body = typeof input.body === 'string' ? input.body.slice(0, 200000) : JSON.stringify(input.body || '');
  }
  if (input.type === 'git_clone') {
    action.repository = requireString(input.repository, 'GitHub repository', 500);
    action.branch = typeof input.branch === 'string' ? input.branch.slice(0, 300) : '';
  }
  if (input.type === 'git') {
    action.operation = requireString(input.operation, 'Git operation', 30);
    if (!['status', 'log', 'fetch', 'pull', 'checkout', 'commit', 'push', 'rebase'].includes(action.operation)) throw new Error(`Unsupported Git operation: ${action.operation}`);
    action.repositoryPath = typeof input.repositoryPath === 'string' ? input.repositoryPath.slice(0, 1000) : '';
    action.branch = typeof input.branch === 'string' ? input.branch.slice(0, 300) : '';
    action.message = typeof input.message === 'string' ? input.message.slice(0, 2000) : '';
    action.upstream = typeof input.upstream === 'string' ? input.upstream.slice(0, 300) : '';
    action.force = input.force === true;
  }
  if (input.type === 'final') action.answer = requireString(input.answer || input.rationale, 'Final answer', 20000);
  if (input.type === 'propose_patch') {
    action.patch = requireString(input.patch, 'Unified diff', MAX_PATCH);
    if (!action.patch.includes('--- ') || !action.patch.includes('+++ ') || !action.patch.includes('@@')) {
      throw new Error('propose_patch requires a unified diff.');
    }
  } else if (input.patch != null) {
    throw new Error(`${input.type} must not include a patch.`);
  }
  if (input.type !== 'create_file' && input.content != null) throw new Error(`${input.type} must not include file content.`);
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
