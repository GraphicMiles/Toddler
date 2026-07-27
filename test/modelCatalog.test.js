import assert from 'node:assert/strict';
import { MODEL_CATALOG, validateCatalog } from '../src/models/catalog.js';
assert.equal(validateCatalog(), true);
assert.equal(new Set(MODEL_CATALOG.map(m => m.id)).size, MODEL_CATALOG.length);
assert.ok(MODEL_CATALOG.every(m => m.runtime === 'llama.cpp' && m.file.endsWith('.gguf')));
assert.throws(() => validateCatalog(MODEL_CATALOG, { requireChecksums: true }));
console.log('model catalog tests passed');
