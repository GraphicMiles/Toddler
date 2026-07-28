import assert from 'node:assert/strict';
import {
  createSafWorkspaceProvider,
  normalizeRelativeWorkspacePath,
  normalizeWorkspaceItemName,
} from '../src/workspace/workspaceProvider.js';

const calls = [];
const adapter = {
  async list(root, path) {
    calls.push(['list', root, path]);
    return { children: [
      { name: 'src', path: 'src', type: 'folder', children: [] },
      { name: '.env', path: '.env', type: 'file' },
    ] };
  },
  async inspect(root, path) { calls.push(['inspect', root, path]); return { type: 'file', binary: false, size: 20 }; },
  async readText(root, path, maxBytes) { calls.push(['read', root, path, maxBytes]); return `contents:${path}`; },
  async writeText(root, path, content, maxBytes) { calls.push(['write', root, path, content, maxBytes]); return { success: true, backupId: 'backup-1234' }; },
  async createFile(root, path) { calls.push(['createFile', root, path]); },
  async createFolder(root, path) { calls.push(['createFolder', root, path]); },
  async rename(root, path, name) { calls.push(['rename', root, path, name]); },
  async delete(root, path) { calls.push(['delete', root, path]); },
  async listBackups() { return { backups: [{ id: 'backup-1234', path: 'src/App.jsx' }] }; },
  async restoreBackup(root, id) { return { root, id, restored: true }; },
};

const root = 'content://provider/tree/project';
const provider = createSafWorkspaceProvider(root, adapter);
assert.equal(provider.available, true);
assert.deepEqual(await provider.list(), [{ name: 'src', path: 'src', type: 'folder', children: [] }]);
assert.equal(await provider.readText('src/App.jsx'), 'contents:src/App.jsx');
assert.equal((await provider.writeText('src/App.jsx', 'updated')).backupId, 'backup-1234');
await provider.createFile('notes.txt');
await provider.createFolder('docs');
await provider.rename('notes.txt', 'todo.txt');
await provider.delete('todo.txt');
assert.deepEqual(calls.at(-1), ['delete', root, 'todo.txt']);
assert.deepEqual(await provider.listBackups(), [{ id: 'backup-1234', path: 'src/App.jsx' }]);
assert.equal((await provider.restoreBackup('backup-1234')).restored, true);

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
await assert.rejects(() => provider.readText('.env'), /Sensitive/);
await assert.rejects(() => provider.writeText('keys/private.pem', 'secret'), /Sensitive/);
await assert.rejects(() => provider.writeText('src/App.jsx', 'x'.repeat(2 * 1024 * 1024 + 1)), /exceeds/);

const binaryProvider = createSafWorkspaceProvider(root, {
  ...adapter,
  inspect: async () => ({ type: 'file', binary: true, size: 4 }),
});
await assert.rejects(() => binaryProvider.readText('image.png'), /Binary/);

const largeProvider = createSafWorkspaceProvider(root, {
  ...adapter,
  inspect: async () => ({ type: 'file', binary: false, size: 3 * 1024 * 1024 }),
});
await assert.rejects(() => largeProvider.readText('large.txt'), /read limit/);

const unavailable = createSafWorkspaceProvider('');
assert.equal(unavailable.available, false);
await assert.rejects(() => unavailable.readText('src/App.jsx'), /Choose a workspace/);

console.log('workspace provider tests passed');
