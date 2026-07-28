import assert from 'node:assert/strict';
import { createWorkspaceToolRegistry } from '../src/tools/workspaceTools.js';

const files = new Map();
const provider = {
  inspect: async path => { if (!files.has(path)) throw new Error('Workspace path not found.'); return { path }; },
  createFile: async path => { files.set(path, ''); },
  writeText: async (path, content) => { files.set(path, content); return { backupId: 'empty-backup' }; },
  readText: async path => files.get(path),
  delete: async path => { files.delete(path); },
};
const registry = createWorkspaceToolRegistry(provider);
const result = await registry.execute('create_file', { path: 'body.css', content: 'body { margin: 0; }' }, { approved: true });
assert.equal(result.created, true);
assert.equal(files.get('body.css'), 'body { margin: 0; }');
await assert.rejects(() => registry.execute('create_file', { path: 'body.css', content: 'x' }, { approved: true }), /already exists/);
console.log('create file agent tests passed');
