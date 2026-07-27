const SECRET_NAMES = new Set(['.env', '.env.local', '.env.production', 'id_rsa', 'id_ed25519']);

export function normalizeWorkspacePath(root, requested) {
  if (typeof root !== 'string' || !root.trim()) throw new Error('Workspace root is required.');
  if (typeof requested !== 'string' || !requested.trim()) throw new Error('Workspace path is required.');
  const rootUrl = root.startsWith('virtual://') ? root : `file://${root}`;
  const requestedUrl = requested.startsWith('virtual://') || requested.startsWith('file://') ? requested : `file://${requested}`;
  const rootPath = new URL(rootUrl).pathname.replace(/\/+$/, '');
  const requestedPath = new URL(requestedUrl).pathname;
  const relative = requestedPath.startsWith(rootPath + '/') ? requestedPath.slice(rootPath.length + 1) : (requestedPath === rootPath ? '' : null);
  if (relative === null || relative.split('/').some(part => part === '..' || part === '.')) throw new Error('Path is outside the selected workspace.');
  return requested;
}

export function isSensitiveWorkspaceFile(path) {
  const name = String(path || '').split('/').pop()?.toLowerCase();
  return SECRET_NAMES.has(name) || name?.endsWith('.pem') || name?.endsWith('.key');
}
