const STORAGE_KEY = 'forgeai_cloud_providers_v1';

export const CLOUD_PROVIDER_PRESETS = Object.freeze([
  Object.freeze({ id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4.1-mini' }),
  Object.freeze({ id: 'xai', label: 'xAI / Grok', baseUrl: 'https://api.x.ai/v1', defaultModel: 'grok-4' }),
  Object.freeze({ id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' }),
  Object.freeze({ id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-3.5-sonnet' }),
  Object.freeze({ id: 'mistral', label: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest' }),
  Object.freeze({ id: 'together', label: 'Together AI', baseUrl: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' }),
  Object.freeze({ id: 'fireworks', label: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1', defaultModel: 'accounts/fireworks/models/llama-v3p1-8b-instruct' }),
  Object.freeze({ id: 'custom', label: 'Custom OpenAI-compatible', baseUrl: '', defaultModel: '' }),
]);

export function getCloudProviderPreset(provider) {
  return CLOUD_PROVIDER_PRESETS.find(item => item.id === provider) || CLOUD_PROVIDER_PRESETS.at(-1);
}

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
