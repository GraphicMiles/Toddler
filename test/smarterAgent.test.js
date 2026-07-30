import assert from 'node:assert/strict';

// Shared localStorage stub (memory + research read from it in some paths).
const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  clear: () => store.clear(),
};

// ---------------------------------------------------------------------------
// Fix 1: episodic memory must not leak unrelated memories via recency alone.
// ---------------------------------------------------------------------------
const { EpisodicMemory } = await import('../src/memory/episodicMemory.js');
const mem = new EpisodicMemory();
mem.clear();
mem.store({ task: 'How old is Lionel Messi the footballer', outcome: 'Answered 36', success: true, tags: ['general'] });
mem.store({ task: 'Build me a nav bar in HTML and CSS', outcome: 'Created nav', success: true, tags: ['code'] });

// A settings/meta message shares no meaningful tokens with either memory.
assert.equal(
  mem.recall('Enabled all the automated filters so i can work without restrictions').length,
  0,
  'unrelated meta message must not recall the Messi/nav memories',
);

// A genuinely related query still recalls the right memory.
const messiRecall = mem.recall('what is the age of Messi');
assert.ok(messiRecall.length >= 1, 'related query should recall the Messi memory');
assert.match(messiRecall[0].task, /Messi/);

// Navigation query recalls the nav memory, not the football one.
const navRecall = mem.recall('update the nav bar html styling');
assert.ok(navRecall.some(m => /nav bar/i.test(m.task)), 'nav query recalls nav memory');
assert.ok(!navRecall.some(m => /Messi/i.test(m.task)), 'nav query must not recall Messi');
mem.clear();
console.log('  ✓ episodic memory relevance floor');

// ---------------------------------------------------------------------------
// Fix 2: research gate must fire on biographical "who is <Name>" lookups,
//        but NOT on self-referential code questions.
// ---------------------------------------------------------------------------
const { isOnlineResearchRequest } = await import('../src/agent/onlineResearch.js');
assert.equal(isOnlineResearchRequest('Who is lamine yamal'), true, 'who is <Name> should trigger research');
assert.equal(isOnlineResearchRequest('Who is Lamine Yamal'), true);
assert.equal(isOnlineResearchRequest('tell me about SpaceX'), true);
assert.equal(isOnlineResearchRequest('who was Ada Lovelace'), true);
// Must not hijack code questions.
assert.equal(isOnlineResearchRequest('what is this function doing'), false, 'code question must stay in chat');
assert.equal(isOnlineResearchRequest('who is calling the render method in this file'), false);
assert.equal(isOnlineResearchRequest('build me a nav bar'), false);
// Existing behavior preserved.
assert.equal(isOnlineResearchRequest('Who won the latest Spain vs France match?'), true);
console.log('  ✓ biographical research trigger');

// ---------------------------------------------------------------------------
// Fix 3: cloud provider retries transient failures, but never after streaming
//        and never on permanent errors.
// ---------------------------------------------------------------------------
const { OpenAICompatibleProvider } = await import('../src/providers/modelProvider.js');
const cfg = { provider: 'groq', apiKey: 'k', baseUrl: 'https://api.groq.com/openai/v1', modelId: 'llama-3.3-70b-versatile' };
const provider = new OpenAICompatibleProvider(cfg);

function sseResponse(text) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: {"choices":[{"delta":{"content":${JSON.stringify(text)}}}]}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const prevFetch = globalThis.fetch;

// (a) First call is a network failure, second succeeds → retry recovers.
let calls = 0;
globalThis.fetch = async () => {
  calls++;
  if (calls === 1) throw new TypeError('Failed to fetch');
  return sseResponse('hello');
};
let out = '';
const res = await provider.stream({ model: cfg, messages: [{ role: 'user', content: 'hi' }], onToken: t => { out += t; }, backoffMs: 1 });
assert.equal(calls, 2, 'network error should trigger exactly one retry');
assert.equal(out, 'hello');
assert.equal(res.content, 'hello');

// (b) Permanent error (401) must NOT retry.
let authCalls = 0;
globalThis.fetch = async () => {
  authCalls++;
  return new Response(JSON.stringify({ error: { message: 'invalid api key' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
};
await assert.rejects(
  () => provider.stream({ model: cfg, messages: [{ role: 'user', content: 'hi' }], backoffMs: 1 }),
  err => err.code === 'invalid_api_key',
);
assert.equal(authCalls, 1, 'auth failure must not retry');

// (c) Rate limit retried up to the cap then surfaced.
let rlCalls = 0;
globalThis.fetch = async () => {
  rlCalls++;
  return new Response(JSON.stringify({ error: { message: 'rate limit exceeded' } }), { status: 429, headers: { 'Content-Type': 'application/json' } });
};
await assert.rejects(
  () => provider.stream({ model: cfg, messages: [{ role: 'user', content: 'hi' }], maxRetries: 2, backoffMs: 1 }),
  err => err.code === 'rate_limited',
);
assert.equal(rlCalls, 3, '429 retried maxRetries times then thrown (1 + 2 retries)');

globalThis.fetch = prevFetch;
console.log('  ✓ cloud provider transient retry');

// ---------------------------------------------------------------------------
// Fix 4: capability flag distinguishes tool-capable providers.
// ---------------------------------------------------------------------------
const { OnDeviceProvider, OllamaProvider } = await import('../src/providers/modelProvider.js');
assert.equal(new OpenAICompatibleProvider(cfg).supportsToolUse, true);
assert.equal(new OllamaProvider().supportsToolUse, true);
assert.equal(new OnDeviceProvider().supportsToolUse, false);
console.log('  ✓ provider tool-use capability flag');

delete globalThis.localStorage;
console.log('smarter agent tests passed');
