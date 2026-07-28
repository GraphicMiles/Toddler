import assert from 'node:assert/strict';
import { MODEL_CATALOG, validateCatalog } from '../src/models/catalog.js';
assert.equal(validateCatalog(MODEL_CATALOG, { requireChecksums: true }), true);
assert.equal(new Set(MODEL_CATALOG.map(model => model.id)).size, MODEL_CATALOG.length);
assert.ok(MODEL_CATALOG.every(model => model.runtime === 'llama.cpp' && model.file.endsWith('.gguf')));
assert.ok(MODEL_CATALOG.every(model => /^[a-f0-9]{64}$/.test(model.sha256)));
assert.ok(MODEL_CATALOG.every(model => model.downloadUrl.includes(`/resolve/${model.revision}/`)));
assert.ok(MODEL_CATALOG.every(model => Number.isFinite(model.sizeBytes) && model.profile?.contextTokens));
console.log('model catalog tests passed');
