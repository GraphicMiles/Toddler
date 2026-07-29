const KEY = 'forgeai_workspaces';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = (value) => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (error) { console.warn('Failed to save workspaces:', error); } };

export function listWorkspaces() { return read(); }
export function saveWorkspace(workspace) {
  if (!workspace?.id || !workspace.name) throw new Error('Workspace id and name are required.');
  const next = read().filter(item => item.id !== workspace.id).concat({ ...workspace, updatedAt: Date.now() });
  write(next);
  return workspace;
}
export function removeWorkspace(id) {
  write(read().filter(item => item.id !== id));
}
export function normalizeWorkspacePath(path) {
  if (typeof path !== 'string' || !path.trim()) throw new Error('Workspace path is required.');
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (normalized.includes('..')) throw new Error('Workspace path must not contain parent traversal.');
  return normalized.replace(/\/$/, '') || '/';
}
