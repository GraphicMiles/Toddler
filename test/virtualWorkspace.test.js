import assert from 'node:assert/strict';
import { VirtualWorkspace } from '../src/utils/virtualWorkspace.js';

const workspace = new VirtualWorkspace();
await workspace.writeFile('src/App.jsx', 'first');
const update = await workspace.writeFile('src/App.jsx', 'second');
assert.ok(update.backupId);
assert.equal(await workspace.readFile('src/App.jsx'), 'second');
await workspace.restoreBackup(update.backupId);
assert.equal(await workspace.readFile('src/App.jsx'), 'first');

const rename = await workspace.rename('src/App.jsx', 'src/Main.jsx');
assert.ok(rename.backupId);
assert.equal(await workspace.readFile('src/Main.jsx'), 'first');
await workspace.restoreBackup(rename.backupId);
assert.equal(await workspace.readFile('src/App.jsx'), 'first');

await workspace.createDirectory('src/nested/deep');
await workspace.writeFile('src/nested/deep/file.txt', 'nested');
const deletion = await workspace.deleteFile('src/nested');
assert.ok(deletion.backupId);
await assert.rejects(() => workspace.readFile('src/nested/deep/file.txt'), /not found/);
await workspace.restoreBackup(deletion.backupId);
assert.equal(await workspace.readFile('src/nested/deep/file.txt'), 'nested');

assert.equal((await workspace.inspect('src/App.jsx')).binary, false);
await workspace.writeFile('binary.dat', 'a\0b');
assert.equal((await workspace.inspect('binary.dat')).binary, true);
workspace.clear();

console.log('virtual workspace tests passed');
