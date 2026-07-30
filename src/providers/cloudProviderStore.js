const STORAGE_KEY = 'forgeai_cloud_providers_v1';
const FAILOVER_KEY = 'forgeai_provider_failover_v1';

/**
 * Cloud provider catalog.
 *
 * Every entry is OpenAI-compatible (works with OpenAICompatibleProvider) unless
 * noted. Rich metadata powers the UI: how to get a key, docs link, expected key
 * prefix (for the mismatch hint), whether a card is needed, and a free-tier
 * summary so users know what they're getting.
 */
export const CLOUD_PROVIDER_PRESETS = Object.freeze([
  Object.freeze({
    id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile', keyPrefix: 'gsk_', card: false,
    freeTier: '30 RPM · ~14,400 req/day · very fast (LPU)',
    keyUrl: 'https://console.groq.com/keys', docs: 'https://console.groq.com/docs',
    howTo: 'Sign up (no card) → API Keys → Create API Key. Paste the gsk_ key.',
  }),
  Object.freeze({
    id: 'cerebras', label: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama-3.3-70b', keyPrefix: 'csk-', card: false,
    freeTier: '~30 RPM · 1,000,000 tokens/day (highest free quota)',
    keyUrl: 'https://cloud.cerebras.ai/', docs: 'https://inference-docs.cerebras.ai/',
    howTo: 'Sign up at cloud.cerebras.ai (no card) → API Keys → generate a key.',
  }),
  Object.freeze({
    id: 'google', label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash', keyPrefix: 'AIza', card: false,
    freeTier: '~1,500 req/day · up to 1M-token context',
    keyUrl: 'https://aistudio.google.com/apikey', docs: 'https://ai.google.dev/gemini-api/docs/openai',
    howTo: 'Open Google AI Studio → Get API key → Create API key. Uses the OpenAI-compatible endpoint.',
  }),
  Object.freeze({
    id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat', keyPrefix: 'sk-or-', card: false,
    freeTier: '~50 req/day free (1K/day after $10) · one key → ~28 free models',
    keyUrl: 'https://openrouter.ai/keys', docs: 'https://openrouter.ai/docs',
    howTo: 'Sign up → Keys → Create Key. Try models with a ":free" suffix, e.g. deepseek/deepseek-chat:free.',
  }),
  Object.freeze({
    id: 'mistral', label: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest', keyPrefix: '', card: false,
    freeTier: 'Free experiment tier · ~1B tokens/month · Codestral for code',
    keyUrl: 'https://console.mistral.ai/api-keys', docs: 'https://docs.mistral.ai/',
    howTo: 'Sign up at console.mistral.ai → API Keys → Create new key.',
  }),
  Object.freeze({
    id: 'github', label: 'GitHub Models', baseUrl: 'https://models.github.ai/inference',
    defaultModel: 'openai/gpt-4o-mini', keyPrefix: 'ghp_', card: false,
    freeTier: 'Free with GitHub account · 100+ models · ~50–150 req/day',
    keyUrl: 'https://github.com/settings/tokens', docs: 'https://docs.github.com/github-models',
    howTo: 'Create a GitHub fine-grained/classic token (Settings → Developer settings → Tokens). Use it as the API key.',
  }),
  Object.freeze({
    id: 'cloudflare', label: 'Cloudflare Workers AI', baseUrl: 'https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/v1',
    defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', keyPrefix: '', card: false,
    freeTier: '10,000 neurons/day · ~35 models',
    keyUrl: 'https://dash.cloudflare.com/profile/api-tokens', docs: 'https://developers.cloudflare.com/workers-ai/',
    howTo: 'Create an API token with Workers AI permission, then replace ACCOUNT_ID in the base URL with your Cloudflare account ID.',
  }),
  Object.freeze({
    id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat', keyPrefix: 'sk-', card: false,
    freeTier: '~5M free tokens on signup · very cheap after',
    keyUrl: 'https://platform.deepseek.com/api_keys', docs: 'https://api-docs.deepseek.com/',
    howTo: 'Sign up at platform.deepseek.com → API keys → Create.',
  }),
  Object.freeze({
    id: 'nvidia', label: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct', keyPrefix: 'nvapi-', card: false,
    freeTier: '~40 RPM · 100+ models (phone verification)',
    keyUrl: 'https://build.nvidia.com/', docs: 'https://docs.nvidia.com/nim/',
    howTo: 'Sign up at build.nvidia.com → pick a model → "Get API Key" (nvapi- key).',
  }),
  Object.freeze({
    id: 'sambanova', label: 'SambaNova', baseUrl: 'https://api.sambanova.ai/v1',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct', keyPrefix: '', card: false,
    freeTier: 'Free developer tier · Llama up to 405B · 10–30 RPM',
    keyUrl: 'https://cloud.sambanova.ai/apis', docs: 'https://docs.sambanova.ai/',
    howTo: 'Sign up at cloud.sambanova.ai → APIs → generate a key.',
  }),
  Object.freeze({
    id: 'cohere', label: 'Cohere', baseUrl: 'https://api.cohere.ai/compatibility/v1',
    defaultModel: 'command-r-plus', keyPrefix: '', card: false,
    freeTier: '~1,000 calls/month (trial keys; terms restrict personal use)',
    keyUrl: 'https://dashboard.cohere.com/api-keys', docs: 'https://docs.cohere.com/docs/compatibility-api',
    howTo: 'Sign up at dashboard.cohere.com → API Keys → use a Trial key.',
  }),
  Object.freeze({
    id: 'together', label: 'Together AI', baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', keyPrefix: '', card: true,
    freeTier: '$1 free credits · 200+ open models',
    keyUrl: 'https://api.together.ai/settings/api-keys', docs: 'https://docs.together.ai/',
    howTo: 'Sign up at together.ai → Settings → API Keys.',
  }),
  Object.freeze({
    id: 'fireworks', label: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct', keyPrefix: 'fw_', card: true,
    freeTier: '$1 free credits · top open models',
    keyUrl: 'https://fireworks.ai/account/api-keys', docs: 'https://docs.fireworks.ai/',
    howTo: 'Sign up at fireworks.ai → Account → API Keys.',
  }),
  Object.freeze({
    id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini', keyPrefix: 'sk-', card: true,
    freeTier: 'No free tier (pay-as-you-go); industry standard',
    keyUrl: 'https://platform.openai.com/api-keys', docs: 'https://platform.openai.com/docs',
    howTo: 'platform.openai.com → API keys → Create new secret key (billing required).',
  }),
  Object.freeze({
    id: 'xai', label: 'xAI / Grok', baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-4', keyPrefix: 'xai-', card: true,
    freeTier: 'Signup credits (varies); pay-as-you-go',
    keyUrl: 'https://console.x.ai/', docs: 'https://docs.x.ai/',
    howTo: 'console.x.ai → API Keys → Create.',
  }),
  Object.freeze({
    id: 'nebius', label: 'Nebius AI', baseUrl: 'https://api.studio.nebius.com/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct', keyPrefix: '', card: false,
    freeTier: 'Free trial credits · open models',
    keyUrl: 'https://studio.nebius.com/', docs: 'https://docs.nebius.com/studio/inference',
    howTo: 'Sign up at studio.nebius.com → API keys.',
  }),
  Object.freeze({
    id: 'ollama', label: 'Ollama Cloud', baseUrl: 'https://ollama.com/v1',
    defaultModel: 'gpt-oss:120b', keyPrefix: '', card: false,
    freeTier: 'Free cloud tier (session/weekly caps) · open models',
    keyUrl: 'https://ollama.com/settings/keys', docs: 'https://docs.ollama.com/',
    howTo: 'Sign up at ollama.com → Settings → Keys.',
  }),
  Object.freeze({
    id: 'custom', label: 'Custom OpenAI-compatible', baseUrl: '', defaultModel: '', keyPrefix: '', card: false,
    freeTier: 'Any OpenAI-compatible endpoint',
    keyUrl: '', docs: '',
    howTo: 'Enter the base URL (must end in /v1 or similar), a model id, and your API key.',
  }),
]);

export function getCloudProviderPreset(provider) {
  return CLOUD_PROVIDER_PRESETS.find(item => item.id === provider) || CLOUD_PROVIDER_PRESETS.at(-1);
}

// Known API key prefixes → provider, for a soft mismatch hint in the UI.
export const KNOWN_KEY_PREFIXES = Object.freeze(
  CLOUD_PROVIDER_PRESETS
    .filter(p => p.keyPrefix)
    .map(p => ({ prefix: p.keyPrefix, provider: p.id, label: p.label })),
);

function readAll() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string') : [];
  } catch {
    return [];
  }
}

function writeAll(value) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
  catch (error) { console.warn('Failed to save cloud provider settings:', error); }
}

export function listCloudProviders() {
  return readAll();
}

export function getCloudProvider(id) {
  return readAll().find(item => item.id === id) || null;
}

export function saveCloudProvider(input = {}) {
  const preset = getCloudProviderPreset(input.provider || 'custom');
  const provider = input.provider || preset.id;
  const baseUrl = String(input.baseUrl || preset.baseUrl || '').trim().replace(/\/$/, '');
  const modelId = String(input.modelId || input.defaultModel || preset.defaultModel || '').trim();
  const apiKey = String(input.apiKey || '').trim();
  const label = String(input.label || preset.label || provider).trim();

  if (!provider) throw new Error('Cloud provider is required.');
  if (!label) throw new Error('Cloud provider label is required.');
  if (!baseUrl) throw new Error('Cloud provider base URL is required.');
  if (!/^https?:\/\//i.test(baseUrl)) throw new Error('Cloud provider base URL must start with http:// or https://.');
  if (/ACCOUNT_ID/.test(baseUrl)) throw new Error('Replace ACCOUNT_ID in the base URL with your Cloudflare account ID first.');
  if (!modelId) throw new Error('Cloud model id is required.');
  if (!apiKey) throw new Error('Cloud API key is required.');

  const now = Date.now();
  const id = input.id || `cloud-${provider}-${now}-${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    id,
    provider,
    label,
    baseUrl,
    modelId,
    apiKey,
    // Lower number = tried earlier during failover. Defaults to append order.
    priority: Number.isFinite(input.priority) ? input.priority : (readAll().length + 1),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  const next = [...readAll().filter(item => item.id !== id), entry];
  writeAll(next);
  return entry;
}

export function removeCloudProvider(id) {
  const next = readAll().filter(item => item.id !== id);
  writeAll(next);
  return next;
}

// --- Failover preference (on/off) -----------------------------------------
export function isFailoverEnabled() {
  if (typeof localStorage === 'undefined') return true;
  const v = localStorage.getItem(FAILOVER_KEY);
  return v === null ? true : v === 'true';
}
export function setFailoverEnabled(enabled) {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(FAILOVER_KEY, String(!!enabled)); } catch { /* ignore */ }
  }
  return !!enabled;
}

export function cloudProviderToModel(provider) {
  const preset = getCloudProviderPreset(provider.provider);
  return {
    id: `cloud-model-${provider.id}`,
    name: provider.label || preset.label,
    source: 'cloud',
    provider: provider.provider,
    providerLabel: preset.label,
    connectionId: provider.id,
    modelId: provider.modelId,
    params: 'Cloud',
    file: provider.modelId,
    size: 0,
    sizeUnit: 'API',
    sizeBytes: 0,
    minRam: 0,
    task: /coder|code/i.test(provider.modelId) ? 'coding' : 'chat',
    capabilities: ['chat', 'code', 'reasoning'],
    contextTokens: 8192,
    quotaType: 'provider-api',
    privacy: 'cloud',
    cloud: true,
    status: 'ready',
  };
}

export function cloudProvidersToModels(providers = readAll()) {
  return providers.map(cloudProviderToModel);
}
