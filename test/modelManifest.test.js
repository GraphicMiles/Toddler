import assert from 'node:assert/strict';
import { createModelManifest, isUsableManifest } from '../src/models/modelManifest.js';
const m = createModelManifest({ id: 'test', name: 'Test', file: 'test.gguf' }, { runtimePath: '/private/test.gguf', sha256: 'a'.repeat(64), verified: true });
assert.equal(m.runtime, 'llama.cpp');
assert.equal(isUsableManifest(m), true);
assert.equal(isUsableManifest({ ...m, verified: false }), false);
assert.throws(() => createModelManifest({ id: 'bad', file: 'bad.bin' }));
console.log('model manifest tests passed');
