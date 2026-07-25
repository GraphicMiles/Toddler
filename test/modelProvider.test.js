import assert from 'node:assert/strict';
import { createModelProvider, OllamaProvider, OnDeviceProvider, assertModelProvider } from '../src/providers/modelProvider.js';
assert.ok(createModelProvider({ mode: 'ollama' }) instanceof OllamaProvider);
assert.ok(createModelProvider({ mode: 'on-device' }) instanceof OnDeviceProvider);
assert.equal(new OllamaProvider().kind, 'ollama');
assert.equal(new OnDeviceProvider().kind, 'on-device');
console.log('model provider tests passed');

assert.throws(() => assertModelProvider({}), /missing getStatus/);
console.log('provider contract tests passed');
