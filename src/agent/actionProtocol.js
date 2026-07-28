import { normalizeRelativeWorkspacePath } from '../workspace/workspaceProvider.js';

export const STRUCTURED_ACTION_TYPES = Object.freeze([
  'read_file',
  'search_files',
  'propose_patch',
  'plan',
]);

const MAX_ACTIONS = 8;
const MAX_PATHS = 12;
const MAX_RATIONALE = 2000;
const MAX_PATCH = 200_000;

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
  if (input.type === 'search_files') action.query = requireString(input.query || input.rationale, 'Search query', 500);
  if (input.type === 'propose_patch') {
    action.patch = requireString(input.patch, 'Unified diff', MAX_PATCH);
    if (!action.patch.includes('--- ') || !action.patch.includes('+++ ') || !action.patch.includes('@@')) {
      throw new Error('propose_patch requires a unified diff.');
    }
  } else if (input.patch != null) {
    throw new Error(`${input.type} must not include a patch.`);
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
  return `Return JSON only with an actions array. Each action must use one of: ${STRUCTURED_ACTION_TYPES.join(', ')}. Paths must be relative to the selected workspace. Never request a shell command. Available app tools: ${toolNames.join(', ') || 'none'}. For code changes, return a standard unified diff in a propose_patch action. Writes are proposals only and require user approval.`;
}
