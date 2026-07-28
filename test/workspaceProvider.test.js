import assert from 'node:assert/strict';
import {
  createSafWorkspaceProvider,
  normalizeRelativeWorkspacePath,
  normalizeWorkspaceItemName,
} from '../src/workspace/workspaceProvider.js';

const calls = [];
const adapter = {
  async list(root, path) { calls.push(['list', root, path]); return { children: [{ name: 'src', path: 'src', type: 'folder', children: [] }] }; },
  async readText(root, path) { calls.push(['read', root, path]); return `contents:${path}`; },
  async writeText(root, path, content) { calls.push(['write', root, path, content]); return { success: true }; },
  async createFile(root, path) { calls.push(['createFile', root, path]); },
  async createFolder(root, path) { calls.push(['createFolder', root, path]); },
  async rename(root, path, name) { calls.push(['rename', root, path, name]); },
  async delete(root, path) { calls.push(['delete', root, path]); },
};

const root = 'content://provider/tree/project';
const provider = createSafWorkspaceProvider(root, adapter);
assert.equal(provider.available, true);
assert.deepEqual(await provider.list(), [{ name: 'src', path: 'src', type: 'folder', children: [] }]);
assert.equal(await provider.readText('src/App.jsx'), 'contents:src/App.jsx');
await provider.writeText('src/App.jsx', 'updated');
await provider.createFile('notes.txt');
await provider.createFolder('docs');
await provider.rename('notes.txt', 'todo.txt');
await provider.delete('todo.txt');
assert.deepEqual(calls.at(-1), ['delete', root, 'todo.txt']);

assert.equal(normalizeRelativeWorkspacePath('src/App.jsx'), 'src/App.jsx');
assert.equal(normalizeRelativeWorkspacePath('', { allowRoot: true }), '');
assert.equal(normalizeWorkspaceItemName('App.jsx'), 'App.jsx');
assert.throws(() => normalizeRelativeWorkspacePath(''), /required/);
assert.throws(() => normalizeRelativeWorkspacePath('/etc/passwd'), /relative/);
assert.throws(() => normalizeRelativeWorkspacePath('content://provider/file'), /relative/);
assert.throws(() => normalizeRelativeWorkspacePath('../secret'), /unsafe/);
assert.throws(() => normalizeRelativeWorkspacePath('src/./App.jsx'), /unsafe/);
assert.throws(() => normalizeRelativeWorkspacePath('src/%2e%2e/secret'), /unsafe encoded/);
assert.throws(() => normalizeRelativeWorkspacePath('src\\App.jsx'), /unsupported/);
assert.throws(() => normalizeWorkspaceItemName('folder/name'), /must not contain/);
await assert.rejects(() => provider.delete(''), /required/);
await assert.rejects(() => provider.readText('/outside'), /relative/);

const unavailable = createSafWorkspaceProvider('');
assert.equal(unavailable.available, false);
await assert.rejects(() => unavailable.readText('src/App.jsx'), /Choose a workspace/);

console.log('workspace provider tests passed');
