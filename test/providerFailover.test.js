import assert from 'node:assert/strict';
import {
  isFailoverError, orderCandidates, isOnCooldown, markCooldown, clearAllCooldowns, streamWithFailover, modelQualityScore,
} from '../src/providers/providerFailover.js';

// model quality ranking: stronger models score higher
assert.ok(modelQualityScore('llama-3.3-70b-versatile') > modelQualityScore('llama-3.1-8b-instant'));
assert.ok(modelQualityScore('deepseek-r1') > modelQualityScore('gemma-2-9b'));
assert.ok(modelQualityScore('qwen3-235b') > modelQualityScore('qwen3-32b'));
assert.ok(modelQualityScore('gpt-4o') > modelQualityScore('gpt-4o-mini'));
// Very large open models must outrank 70B (regression: 235B/480B/405B were unranked).
assert.ok(modelQualityScore('qwen-3-235b-a22b-instruct-2507') > modelQualityScore('llama-3.3-70b'));
assert.ok(modelQualityScore('qwen3-coder:480b') > modelQualityScore('llama-3.3-70b'));
assert.ok(modelQualityScore('Meta-Llama-3.1-405B-Instruct') > modelQualityScore('llama-3.3-70b'));

// fallback chain orders strongest-model-first when priorities aren't pinned
clearAllCooldowns();
{
  const provs = [
    { id: 'weak', apiKey: 'k', baseUrl: 'u', modelId: 'llama-3.1-8b-instant', priority: 1e6 + 1, createdAt: 1 },
    { id: 'strong', apiKey: 'k', baseUrl: 'u', modelId: 'llama-3.3-70b-versatile', priority: 1e6 + 2, createdAt: 2 },
    { id: 'mid', apiKey: 'k', baseUrl: 'u', modelId: 'qwen3-32b', priority: 1e6 + 3, createdAt: 3 },
  ];
  // active is 'weak'; the rest should be strong then mid (by quality, not add order)
  const ordered = orderCandidates(provs, 'weak');
  assert.deepEqual(ordered.map(p => p.id), ['weak', 'strong', 'mid'], 'fallbacks strongest-first');
}

// which codes fail over
assert.equal(isFailoverError('quota_exceeded'), true);
assert.equal(isFailoverError('rate_limited'), true);
assert.equal(isFailoverError('server_error'), true);
assert.equal(isFailoverError('network_error'), true);
assert.equal(isFailoverError('invalid_api_key'), false);
assert.equal(isFailoverError('model_not_found'), false);
assert.equal(isFailoverError('aborted'), false);

// cooldown
clearAllCooldowns();
const now = 1_000_000;
markCooldown('p1', 'rate_limited', now);
assert.equal(isOnCooldown('p1', now + 1000), true);
assert.equal(isOnCooldown('p1', now + 61_000), false); // 60s window passed
assert.equal(isOnCooldown('p2', now), false);
clearAllCooldowns();

// ordering: active first, rest by priority, cooldowns skipped
const provs = [
  { id: 'a', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 3 },
  { id: 'b', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 1 },
  { id: 'c', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 2 },
  { id: 'd', apiKey: '', baseUrl: 'u', modelId: 'm', priority: 0 }, // no key → excluded
];
let ordered = orderCandidates(provs, 'a');
assert.deepEqual(ordered.map(p => p.id), ['a', 'b', 'c'], 'active first, then by priority, no-key excluded');
markCooldown('b', 'quota_exceeded');
ordered = orderCandidates(provs, 'a');
assert.deepEqual(ordered.map(p => p.id), ['a', 'c'], 'cooldown provider skipped (but active always kept)');
clearAllCooldowns();

// --- streamWithFailover ---
function fakeProvider(behavior) {
  return {
    async stream({ onToken }) {
      if (behavior.throwCode) { const e = new Error(behavior.throwCode); e.code = behavior.throwCode; throw e; }
      onToken?.(behavior.text || 'ok');
      return { content: behavior.text || 'ok' };
    },
  };
}

// Case 1: first provider quota_exceeded → fails over to second, succeeds.
clearAllCooldowns();
{
  const providers = [
    { id: 'p1', label: 'Groq', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 1 },
    { id: 'p2', label: 'Cerebras', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 2 },
  ];
  const behaviors = { p1: { throwCode: 'quota_exceeded' }, p2: { text: 'from cerebras' } };
  let switched = null;
  let out = '';
  const res = await streamWithFailover({
    providers, activeId: 'p1',
    makeProvider: conn => fakeProvider(behaviors[conn.id]),
    buildModel: conn => ({ modelId: conn.modelId }),
    streamArgs: { onToken: t => { out += t; } },
    onFailover: info => { switched = info; },
  });
  assert.equal(res.content, 'from cerebras');
  assert.equal(res.usedProvider.id, 'p2');
  assert.equal(out, 'from cerebras');
  assert.equal(switched.from.id, 'p1');
  assert.equal(switched.to.id, 'p2');
  assert.equal(switched.code, 'quota_exceeded');
  // p1 is now on cooldown
  assert.equal(isOnCooldown('p1'), true);
}

// Case 2: invalid_api_key does NOT fail over — surfaces immediately.
clearAllCooldowns();
{
  const providers = [
    { id: 'p1', label: 'A', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 1 },
    { id: 'p2', label: 'B', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 2 },
  ];
  const behaviors = { p1: { throwCode: 'invalid_api_key' }, p2: { text: 'should not reach' } };
  await assert.rejects(
    () => streamWithFailover({
      providers, activeId: 'p1',
      makeProvider: conn => fakeProvider(behaviors[conn.id]),
      buildModel: conn => ({ modelId: conn.modelId }),
      streamArgs: {},
    }),
    err => err.code === 'invalid_api_key',
  );
}

// Case 3: failover disabled → only the active provider is tried.
clearAllCooldowns();
{
  const providers = [
    { id: 'p1', label: 'A', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 1 },
    { id: 'p2', label: 'B', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 2 },
  ];
  const behaviors = { p1: { throwCode: 'rate_limited' }, p2: { text: 'unused' } };
  await assert.rejects(
    () => streamWithFailover({
      providers, activeId: 'p1', enabled: false,
      makeProvider: conn => fakeProvider(behaviors[conn.id]),
      buildModel: conn => ({ modelId: conn.modelId }),
      streamArgs: {},
    }),
    err => err.code === 'rate_limited',
  );
}

// Case 4: all providers exhausted → throws the last error.
clearAllCooldowns();
{
  const providers = [
    { id: 'p1', label: 'A', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 1 },
    { id: 'p2', label: 'B', apiKey: 'k', baseUrl: 'u', modelId: 'm', priority: 2 },
  ];
  const behaviors = { p1: { throwCode: 'quota_exceeded' }, p2: { throwCode: 'quota_exceeded' } };
  await assert.rejects(
    () => streamWithFailover({
      providers, activeId: 'p1',
      makeProvider: conn => fakeProvider(behaviors[conn.id]),
      buildModel: conn => ({ modelId: conn.modelId }),
      streamArgs: {},
    }),
    err => err.code === 'quota_exceeded',
  );
}

console.log('provider failover tests passed');
