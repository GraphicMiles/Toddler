export const AUTONOMY_LEVELS = Object.freeze({
  OFF: 'off',
  SUGGEST: 'suggest',
  READ_ONLY: 'read-only',
  PREPARE: 'prepare',
  FULL: 'full',
});

const STORAGE_KEY = 'forgeai_autonomy_level';

export function readAutonomyLevel() {
  if (typeof localStorage === 'undefined') return AUTONOMY_LEVELS.SUGGEST;
  const value = localStorage.getItem(STORAGE_KEY);
  return Object.values(AUTONOMY_LEVELS).includes(value) ? value : AUTONOMY_LEVELS.SUGGEST;
}

export function writeAutonomyLevel(level) {
  if (!Object.values(AUTONOMY_LEVELS).includes(level)) throw new Error(`Invalid autonomy level: ${level}`);
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, level);
  return level;
}

export function autonomyAllows(level, capability) {
  if (level === AUTONOMY_LEVELS.FULL) return true;
  if (capability === 'write' || capability === 'execute' || capability === 'dangerous') return false;
  if (level === AUTONOMY_LEVELS.OFF || level === AUTONOMY_LEVELS.SUGGEST) return false;
  if (level === AUTONOMY_LEVELS.READ_ONLY) return capability === 'read';
  return level === AUTONOMY_LEVELS.PREPARE && (capability === 'read' || capability === 'prepare-patch');
}

export function suggestNextActions({ tasks = [], workspaceTree = [] } = {}) {
  const suggestions = [];
  const latest = tasks[0];
  if (latest?.status === 'failed') suggestions.push({ type: 'review-failure', reason: 'The most recent agent task failed and has a stored failure event.', prompt: 'Review the last failed agent task and explain the smallest safe next step.' });
  if (latest?.status === 'verified') suggestions.push({ type: 'consider-tests', reason: 'A patch was applied and verified; consider adding focused regression tests.', prompt: `Suggest focused regression tests for ${latest.files?.join(', ') || 'the last verified patch'}.` });
  const hasReadme = JSON.stringify(workspaceTree).toLowerCase().includes('readme.md');
  if (workspaceTree.length && !hasReadme) suggestions.push({ type: 'documentation', reason: 'The selected workspace has no visible README.md.', prompt: 'Review this project and propose a concise README.md plan without creating files yet.' });
  return suggestions.slice(0, 5);
}
