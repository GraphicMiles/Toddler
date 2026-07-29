import assert from 'node:assert/strict';
import { ToolRegistry, createReadOnlyRegistry } from '../src/tools/toolRegistry.js';
import { createAdvancedToolRegistry } from '../src/tools/advancedToolRegistry.js';

const registry = createReadOnlyRegistry({ readText: async path => `contents:${path}` });
assert.equal(registry.get('read_file').permission, 'read');
assert.deepEqual(await registry.execute('read_file', { path: 'README.md' }), { path: 'README.md', content: 'contents:README.md' });
await assert.rejects(() => registry.execute('missing'), /Unknown tool/);
const unsafe = new ToolRegistry().register({ name: 'write_file', permission: 'write', execute: async () => null });
await assert.rejects(() => unsafe.execute('write_file'), /explicit approval/);

const workspaceProvider = {
  readText: async path => `advanced:${path}`,
  writeText: async () => ({ backupId: 'b1' }),
  inspect: async () => { throw new Error('not found'); },
  createFile: async () => {},
  createFolder: async () => {},
  rename: async () => {},
  delete: async () => {},
};
const advanced = createAdvancedToolRegistry(workspaceProvider);
assert.ok(advanced.get('read_file'), 'advanced registry must include workspace read_file');
assert.ok(advanced.get('apply_patch'), 'advanced registry must include workspace apply_patch');
assert.ok(advanced.get('research:query'), 'advanced registry must include advanced research tools');
assert.deepEqual(await advanced.execute('read_file', { path: 'README.md' }), { path: 'README.md', content: 'advanced:README.md', type: 'read' });

console.log('tool registry tests passed');
