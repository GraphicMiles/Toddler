import assert from 'node:assert/strict';
import { getModelSizeBytes, formatModelSize, ramGigabytesForCompatibility } from '../src/utils/deviceCapacity.js';
assert.equal(getModelSizeBytes({ size: 1, sizeUnit: 'GB' }), 1_000_000_000);
assert.equal(getModelSizeBytes({ size: 500, sizeUnit: 'MB' }), 500_000_000);
assert.equal(formatModelSize(1_000_000_000), '1 GB');
assert.equal(ramGigabytesForCompatibility(4 * 1024 ** 3), 4);
assert.equal(ramGigabytesForCompatibility(null, 6), 6);
console.log('device capacity tests passed');
