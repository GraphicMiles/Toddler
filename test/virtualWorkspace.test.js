import assert from 'node:assert/strict';
import { VirtualWorkspace } from '../src/utils/virtualWorkspace.js';

const workspace = new VirtualWorkspace();
await workspace.writeFile('src/App.jsx', 'first');
const update = await workspace.writeFile('src/App.jsx', 'second');
assert.ok(update.backupId);
assert.equal(await workspace.readFile('src/App.jsx'), 'second');
assert.equal((await workspace.inspect('src/App.jsx')).binary, false);
assert.equal((await workspace.listBackups()).length, 1);
await workspace.restoreBackup(update.backupId);
assert.equal(await workspace.readFile('src/App.jsx'), 'first');
assert.equal((await workspace.listBackups()).length, 0);
await workspace.writeFile('binary.dat', 'a\0b');
assert.equal((await workspace.inspect('binary.dat')).binary, true);
workspace.clear();

console.log('virtual workspace tests passed');
