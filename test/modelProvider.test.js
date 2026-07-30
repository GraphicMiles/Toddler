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

// Native function-calling: tools are forwarded in the request body and streamed
// tool_calls are assembled and returned.
let sentBody = null;
globalThis.fetch = async (_url, options) => {
  sentBody = JSON.parse(options.body);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // tool_call streamed as deltas by index (name first, then args in pieces).
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_9","function":{"name":"read_file","arguments":"{\\"pa"}}]}}]}\n\n'));
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"th\\":\\"a.js\\"}"}}]}}]}\n\n'));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
};
const toolResult = await cloudProvider.stream({
  model: cloudModel,
  messages: [{ role: 'user', content: 'read a.js' }],
  tools: [{ type: 'function', function: { name: 'read_file', description: 'x', parameters: { type: 'object', properties: {}, required: [] } } }],
});
assert.ok(Array.isArray(sentBody.tools) && sentBody.tools.length === 1, 'tools forwarded to API');
assert.equal(sentBody.tool_choice, 'auto');
assert.ok(Array.isArray(toolResult.toolCalls) && toolResult.toolCalls.length === 1, 'toolCalls returned');
assert.equal(toolResult.toolCalls[0].function.name, 'read_file');
assert.equal(toolResult.toolCalls[0].function.arguments, '{"path":"a.js"}');
assert.equal(toolResult.toolCalls[0].id, 'call_9');

// A tool-result message (role:'tool') is serialised with its tool_call_id.
globalThis.fetch = async (_url, options) => {
  sentBody = JSON.parse(options.body);
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { c.enqueue(encoder.encode('data: [DONE]\n\n')); c.close(); } }), { status: 200 });
};
await cloudProvider.stream({ model: cloudModel, messages: [{ role: 'tool', tool_call_id: 'call_9', content: '{"ok":true}' }] });
assert.equal(sentBody.messages[0].role, 'tool');
assert.equal(sentBody.messages[0].tool_call_id, 'call_9');

globalThis.fetch = previousFetch;
delete globalThis.localStorage;

console.log('model provider tests passed');

assert.throws(() => assertModelProvider({}), /missing getStatus/);
console.log('provider contract tests passed');
