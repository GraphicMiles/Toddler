import assert from 'node:assert/strict';
import { ToolRegistry, createReadOnlyRegistry } from '../src/tools/toolRegistry.js';
const registry = createReadOnlyRegistry({ readText: async path => `contents:${path}` });
assert.equal(registry.get('read_file').permission, 'read');
assert.deepEqual(await registry.execute('read_file', { path: 'README.md' }), { path: 'README.md', content: 'contents:README.md' });
await assert.rejects(() => registry.execute('missing'), /Unknown tool/);
const unsafe = new ToolRegistry().register({ name: 'write_file', permission: 'write', execute: async () => null });
await assert.rejects(() => unsafe.execute('write_file'), /explicit approval/);
console.log('tool registry tests passed');
