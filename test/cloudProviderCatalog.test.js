import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};

const {
  CLOUD_PROVIDER_PRESETS, getCloudProviderPreset, KNOWN_KEY_PREFIXES,
  saveCloudProvider, listCloudProviders, isFailoverEnabled, setFailoverEnabled,
} = await import('../src/providers/cloudProviderStore.js');

// Every preset (except custom) has the metadata the UI needs.
for (const p of CLOUD_PROVIDER_PRESETS) {
  assert.ok(p.id && p.label, `preset needs id+label: ${p.id}`);
  if (p.id === 'custom') continue;
  assert.ok(/^https?:\/\//.test(p.baseUrl), `${p.id} needs a valid baseUrl`);
  assert.ok(p.defaultModel, `${p.id} needs a defaultModel`);
  // Every non-custom preset ships a curated model lineup, and the default must be in it.
  assert.ok(Array.isArray(p.models) && p.models.length >= 1, `${p.id} needs a models list`);
  assert.ok(p.models.includes(p.defaultModel), `${p.id} default model must be in its models list`);
  assert.ok(p.freeTier, `${p.id} needs a freeTier note`);
  assert.ok(p.keyUrl, `${p.id} needs a keyUrl`);
  assert.ok(p.howTo, `${p.id} needs a howTo`);
  assert.equal(typeof p.card, 'boolean', `${p.id} needs card flag`);
}

// Key providers are present.
for (const id of ['groq', 'cerebras', 'google', 'openrouter', 'mistral', 'github', 'deepseek', 'nvidia', 'openai', 'xai']) {
  assert.ok(CLOUD_PROVIDER_PRESETS.some(p => p.id === id), `expected preset ${id}`);
}
assert.ok(CLOUD_PROVIDER_PRESETS.length >= 15, 'should have a rich catalog');

// getCloudProviderPreset falls back to custom.
assert.equal(getCloudProviderPreset('nope').id, 'custom');
assert.equal(getCloudProviderPreset('groq').id, 'groq');

// Known key prefixes derived from catalog.
assert.ok(KNOWN_KEY_PREFIXES.some(k => k.prefix === 'gsk_' && k.provider === 'groq'));
assert.ok(KNOWN_KEY_PREFIXES.some(k => k.prefix === 'sk-or-' && k.provider === 'openrouter'));

// saveCloudProvider assigns an incrementing priority.
const a = saveCloudProvider({ provider: 'groq', apiKey: 'gsk_x', modelId: 'llama-3.3-70b-versatile' });
const b = saveCloudProvider({ provider: 'cerebras', apiKey: 'csk-y', modelId: 'llama-3.3-70b' });
assert.ok(Number.isFinite(a.priority) && Number.isFinite(b.priority));
assert.ok(b.priority > a.priority, 'second provider gets a later priority');
assert.equal(listCloudProviders().length, 2);

// Cloudflare ACCOUNT_ID guard.
assert.throws(() => saveCloudProvider({ provider: 'cloudflare', apiKey: 'k', modelId: 'm' }), /ACCOUNT_ID/);

// Failover preference default true, toggleable.
assert.equal(isFailoverEnabled(), true);
setFailoverEnabled(false);
assert.equal(isFailoverEnabled(), false);
setFailoverEnabled(true);
assert.equal(isFailoverEnabled(), true);

delete globalThis.localStorage;
console.log('cloud provider catalog tests passed');
