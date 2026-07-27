import assert from 'node:assert/strict';
import { normalizeWorkspacePath, isSensitiveWorkspaceFile } from '../src/workspace/safePath.js';
assert.equal(normalizeWorkspacePath('/storage/emulated/0/Download/ForgeAI', '/storage/emulated/0/Download/ForgeAI/index.html'), '/storage/emulated/0/Download/ForgeAI/index.html');
assert.throws(() => normalizeWorkspacePath('/workspace', '/workspace/../secret'));
assert.equal(isSensitiveWorkspaceFile('/workspace/.env'), true);
assert.equal(isSensitiveWorkspaceFile('/workspace/index.html'), false);
console.log('safe path tests passed');
