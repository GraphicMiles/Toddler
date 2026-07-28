import {
  createWorkspaceFile,
  createWorkspaceFolder,
  deleteWorkspaceItem,
  listWorkspace,
  readWorkspaceFile,
  renameWorkspaceItem,
  writeWorkspaceFile,
} from '../nativeBridge.js';
import { virtualWorkspace } from '../utils/virtualWorkspace.js';

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const URI_OR_DRIVE_PREFIX = /^[a-z][a-z0-9+.-]*:|^[a-zA-Z]:[\\/]/;

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
  if (value.includes('\\') || CONTROL_CHARACTERS.test(value)) {
    throw new Error('Workspace path contains unsupported characters.');
  }

  const parts = value.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new Error('Workspace path contains an unsafe segment.');
  }
  for (const part of parts) {
    let decoded;
    try { decoded = decodeURIComponent(part); } catch { throw new Error('Workspace path contains invalid encoding.'); }
    if (!decoded || decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\') || CONTROL_CHARACTERS.test(decoded)) {
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
  readText: (root, path) => readWorkspaceFile(root, path),
  writeText: (root, path, content) => writeWorkspaceFile(root, path, content),
  createFile: (root, path) => createWorkspaceFile(root, path),
  createFolder: (root, path) => createWorkspaceFolder(root, path),
  rename: (root, path, newName) => renameWorkspaceItem(root, path, newName),
  delete: (root, path) => deleteWorkspaceItem(root, path),
};

const virtualAdapter = {
  async list(_root, path) {
    const tree = virtualWorkspace.getTree();
    if (!path) return { children: tree };
    const node = findTreeNode(tree, path);
    if (!node || node.type !== 'folder') throw new Error(`Workspace folder not found: ${path}`);
    return { children: node.children || [] };
  },
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

  async list(path = '') {
    this.assertAvailable();
    const relativePath = normalizeRelativeWorkspacePath(path, { allowRoot: true });
    const result = await this.adapter.list(this.root, relativePath);
    return result?.children || result?.value || result || [];
  }

  async readText(path) {
    this.assertAvailable();
    return this.adapter.readText(this.root, normalizeRelativeWorkspacePath(path));
  }

  async writeText(path, content) {
    this.assertAvailable();
    return this.adapter.writeText(this.root, normalizeRelativeWorkspacePath(path), String(content ?? ''));
  }

  async createFile(path) {
    this.assertAvailable();
    return this.adapter.createFile(this.root, normalizeRelativeWorkspacePath(path));
  }

  async createFolder(path) {
    this.assertAvailable();
    return this.adapter.createFolder(this.root, normalizeRelativeWorkspacePath(path));
  }

  async rename(path, newName) {
    this.assertAvailable();
    return this.adapter.rename(
      this.root,
      normalizeRelativeWorkspacePath(path),
      normalizeWorkspaceItemName(newName),
    );
  }

  async delete(path) {
    this.assertAvailable();
    return this.adapter.delete(this.root, normalizeRelativeWorkspacePath(path));
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
