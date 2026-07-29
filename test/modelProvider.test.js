import assert from 'node:assert/strict';
import {
  createModelProvider,
  createModelProviderForModel,
  OllamaProvider,
  OnDeviceProvider,
  OpenAICompatibleProvider,
  assertModelProvider,
} from '../src/providers/modelProvider.js';
import { cloudProvidersToModels, saveCloudProvider } from '../src/providers/cloudProviderStore.js';

const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  clear: () => store.clear(),
};

assert.ok(createModelProvider({ mode: 'ollama' }) instanceof OllamaProvider);
assert.ok(createModelProvider({ mode: 'on-device' }) instanceof OnDeviceProvider);
assert.equal(new OllamaProvider().kind, 'ollama');
assert.equal(new OnDeviceProvider().kind, 'on-device');

const savedProvider = saveCloudProvider({
  provider: 'xai',
  label: 'Grok',
  apiKey: 'test-key',
  baseUrl: 'https://api.x.ai/v1',
  modelId: 'grok-4',
});
const [cloudModel] = cloudProvidersToModels([savedProvider]);
const cloudProvider = createModelProviderForModel(cloudModel, { endpoint: 'http://localhost:11434', isNative: false });
assert.ok(cloudProvider instanceof OpenAICompatibleProvider);
assert.equal((await cloudProvider.getStatus()).connected, true);

const previousFetch = globalThis.fetch;
globalThis.fetch = async (_url, options) => {
  assert.equal(options.headers.Authorization, 'Bearer test-key');
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hel"}}]}\n\n'));
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"lo"}}]}\n\n'));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
};
let streamed = '';
const result = await cloudProvider.stream({ model: cloudModel, messages: [{ role: 'user', content: 'Hi' }], onToken: token => { streamed += token; } });
assert.equal(streamed, 'hello');
assert.equal(result.content, 'hello');

globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'insufficient_quota', code: 'insufficient_quota' } }), { status: 402, headers: { 'Content-Type': 'application/json' } });
await assert.rejects(
  () => cloudProvider.stream({ model: cloudModel, messages: [{ role: 'user', content: 'Hi' }] }),
  error => error.code === 'quota_exceeded' && /quota|credits|token balance/i.test(error.message),
);

globalThis.fetch = previousFetch;
delete globalThis.localStorage;

console.log('model provider tests passed');

assert.throws(() => assertModelProvider({}), /missing getStatus/);
console.log('provider contract tests passed');
