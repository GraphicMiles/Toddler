import {
  createWorkspaceFile,
  createWorkspaceFolder,
  deleteWorkspaceItem,
  inspectWorkspaceItem,
  listWorkspace,
  listWorkspaceBackups,
  readWorkspaceFile,
  renameWorkspaceItem,
  restoreWorkspaceBackup,
  writeWorkspaceFile,
} from '../nativeBridge.js';
import { virtualWorkspace } from '../utils/virtualWorkspace.js';
import {
  WORKSPACE_LIMITS,
  assertWorkspacePathAllowed,
  filterWorkspaceTree,
  utf8ByteLength,
} from './workspacePolicy.js';

const URI_OR_DRIVE_PREFIX = /^[a-z][a-z0-9+.-]*:|^[a-zA-Z]:[\\/]/;
const hasControlCharacters = value => [...value].some(character => {
  const code = character.charCodeAt(0);
  return code <= 31 || code === 127;
});

export function normalizeRelativeWorkspacePath(requested, { allowRoot = false } = {}) {
  if (typeof requested !== 'string') throw new Error('Workspace path must be a string.');
  const value = requested.trim();
  if (!value) {
    if (allowRoot) return '';
    throw new Error('Workspace path is required.');
  }
  if (value.startsWith('/') || value.startsWith('\\') || URI_OR_DRIVE_PREFIX.test(value)) {
    throw new Error('Workspace paths must be relative to the selected root.');
  }
  if (value.includes('\\') || hasControlCharacters(value)) {
    throw new Error('Workspace path contains unsupported characters.');
  }

  const parts = value.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new Error('Workspace path contains an unsafe segment.');
  }
  for (const part of parts) {
    let decoded;
    try { decoded = decodeURIComponent(part); } catch { throw new Error('Workspace path contains invalid encoding.'); }
    if (!decoded || decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\') || hasControlCharacters(decoded)) {
      throw new Error('Workspace path contains an unsafe encoded segment.');
    }
  }
  return parts.join('/');
}

export function normalizeWorkspaceItemName(name) {
  const value = normalizeRelativeWorkspacePath(name);
  if (value.includes('/')) throw new Error('Workspace item name must not contain a path separator.');
  return value;
}

function findTreeNode(nodes, path) {
  for (const node of nodes || []) {
    if (node.path === path) return node;
    const child = findTreeNode(node.children, path);
    if (child) return child;
  }
  return null;
}

const safAdapter = {
  list: (root, path) => listWorkspace(root, path),
  inspect: (root, path) => inspectWorkspaceItem(root, path),
  readText: (root, path, maxBytes) => readWorkspaceFile(root, path, maxBytes),
  writeText: (root, path, content, maxBytes) => writeWorkspaceFile(root, path, content, maxBytes),
  createFile: (root, path) => createWorkspaceFile(root, path),
  createFolder: (root, path) => createWorkspaceFolder(root, path),
  rename: (root, path, newName) => renameWorkspaceItem(root, path, newName),
  delete: (root, path) => deleteWorkspaceItem(root, path),
  listBackups: root => listWorkspaceBackups(root),
  restoreBackup: (root, backupId) => restoreWorkspaceBackup(root, backupId),
};

const virtualAdapter = {
  async list(_root, path) {
    const tree = virtualWorkspace.getTree();
    if (!path) return { children: tree };
    const node = findTreeNode(tree, path);
    if (!node || node.type !== 'folder') throw new Error(`Workspace folder not found: ${path}`);
    return { children: node.children || [] };
  },
  inspect: (_root, path) => virtualWorkspace.inspect(path),
  readText: (_root, path) => virtualWorkspace.readFile(path),
  writeText: (_root, path, content) => virtualWorkspace.writeFile(path, content),
  createFile: (_root, path) => virtualWorkspace.writeFile(path, ''),
  createFolder: (_root, path) => virtualWorkspace.createDirectory(path),
  rename: (_root, path, newName) => {
    const slash = path.lastIndexOf('/');
    const parent = slash < 0 ? '' : path.slice(0, slash);
    return virtualWorkspace.rename(path, parent ? `${parent}/${newName}` : newName);
  },
  delete: (_root, path) => virtualWorkspace.deleteFile(path),
  listBackups: () => virtualWorkspace.listBackups(),
  restoreBackup: (_root, backupId) => virtualWorkspace.restoreBackup(backupId),
};

export class WorkspaceProvider {
  constructor({ id, kind, root = '', adapter, available = true }) {
    this.id = id;
    this.kind = kind;
    this.root = root;
    this.adapter = adapter;
    this.available = available;
    Object.freeze(this);
  }

  assertAvailable() {
    if (!this.available) throw new Error('Choose a workspace folder first.');
  }

  normalize(path, { allowRoot = false, operation = 'access' } = {}) {
    const relativePath = normalizeRelativeWorkspacePath(path, { allowRoot });
    if (relativePath) assertWorkspacePathAllowed(relativePath, operation);
    return relativePath;
  }

  async list(path = '') {
    this.assertAvailable();
    const relativePath = this.normalize(path, { allowRoot: true, operation: 'listing' });
    const result = await this.adapter.list(this.root, relativePath);
    return filterWorkspaceTree(result?.children || result?.value || result || []);
  }

  async inspect(path, operation = 'reading') {
    this.assertAvailable();
    const relativePath = this.normalize(path, { operation });
    const result = await this.adapter.inspect(this.root, relativePath);
    return { ...result, path: relativePath };
  }

  async readText(path, { maxBytes = WORKSPACE_LIMITS.uiReadBytes } = {}) {
    const info = await this.inspect(path, 'reading');
    if (info.type && info.type !== 'file') throw new Error('Only workspace files can be read.');
    if (info.binary) throw new Error('Binary workspace files cannot be read as text.');
    if (!Number.isFinite(maxBytes) || maxBytes <= 0 || maxBytes > WORKSPACE_LIMITS.uiReadBytes) {
      throw new Error('Invalid workspace read limit.');
    }
    if (Number(info.size) > maxBytes) throw new Error(`Workspace file exceeds the ${maxBytes}-byte read limit.`);
    const content = await this.adapter.readText(this.root, info.path, maxBytes);
    if (utf8ByteLength(content) > maxBytes) throw new Error(`Workspace file exceeds the ${maxBytes}-byte read limit.`);
    return content;
  }

  async writeText(path, content, { maxBytes = WORKSPACE_LIMITS.writeBytes } = {}) {
    this.assertAvailable();
    const relativePath = this.normalize(path, { operation: 'writing' });
    const text = String(content ?? '');
    if (!Number.isFinite(maxBytes) || maxBytes <= 0 || maxBytes > WORKSPACE_LIMITS.writeBytes) {
      throw new Error('Invalid workspace write limit.');
    }
    if (utf8ByteLength(text) > maxBytes) throw new Error(`Workspace write exceeds the ${maxBytes}-byte limit.`);
    return this.adapter.writeText(this.root, relativePath, text, maxBytes);
  }

  async createFile(path) {
    this.assertAvailable();
    return this.adapter.createFile(this.root, this.normalize(path, { operation: 'creation' }));
  }

  async createFolder(path) {
    this.assertAvailable();
    return this.adapter.createFolder(this.root, this.normalize(path, { operation: 'creation' }));
  }

  async rename(path, newName) {
    this.assertAvailable();
    const relativePath = this.normalize(path, { operation: 'renaming' });
    const safeName = normalizeWorkspaceItemName(newName);
    const slash = relativePath.lastIndexOf('/');
    const parent = slash < 0 ? '' : relativePath.slice(0, slash);
    assertWorkspacePathAllowed(parent ? `${parent}/${safeName}` : safeName, 'renaming');
    return this.adapter.rename(this.root, relativePath, safeName);
  }

  async delete(path) {
    this.assertAvailable();
    return this.adapter.delete(this.root, this.normalize(path, { operation: 'deletion' }));
  }

  async listBackups() {
    this.assertAvailable();
    if (typeof this.adapter.listBackups !== 'function') return [];
    const result = await this.adapter.listBackups(this.root);
    return result?.backups || result?.value || result || [];
  }

  async restoreBackup(backupId) {
    this.assertAvailable();
    if (typeof backupId !== 'string' || !/^[A-Za-z0-9-]{8,80}$/.test(backupId)) throw new Error('Invalid workspace backup id.');
    if (typeof this.adapter.restoreBackup !== 'function') throw new Error('Workspace restore is unavailable.');
    return this.adapter.restoreBackup(this.root, backupId);
  }
}

export function createSafWorkspaceProvider(rootUri, adapter = safAdapter) {
  const available = typeof rootUri === 'string' && rootUri.startsWith('content://');
  return new WorkspaceProvider({
    id: available ? `saf:${rootUri}` : 'saf:unavailable',
    kind: 'saf',
    root: available ? rootUri : '',
    adapter,
    available,
  });
}

export function createVirtualWorkspaceProvider(adapter = virtualAdapter) {
  return new WorkspaceProvider({
    id: 'virtual:workspace',
    kind: 'virtual',
    root: 'virtual://workspace',
    adapter,
  });
}
