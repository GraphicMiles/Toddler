import { profileForModel } from './promptProfiles.js';

const MB = 1_000_000;
const GB = 1024 ** 3;

export const MODEL_CATALOG = Object.freeze([
  Object.freeze({
    id: 'smollm-135m-q3',
    name: 'SmolLM 135M Test',
    family: 'smollm',
    params: '135M',
    file: 'SmolLM-135M-Instruct.Q3_K_M.gguf',
    size: 94,
    sizeUnit: 'MB',
    sizeBytes: 93_510_048,
    minRam: 2,
    minRamBytes: 2 * GB,
    task: 'smoke-test',
    description: 'Fast Android runtime smoke test. This tiny model is not coding-capable.',
    badge: 'Smoke test',
    runsOn: ['mobile'],
    quantization: 'Q3_K_M',
    quantizations: ['Q3_K_M'],
    license: 'Apache-2.0',
    source: 'QuantFactory/SmolLM-135M-Instruct-GGUF',
    revision: 'd36054e030c66b4be24b0c65513ece348db06ba5',
    downloadUrl: 'https://huggingface.co/QuantFactory/SmolLM-135M-Instruct-GGUF/resolve/d36054e030c66b4be24b0c65513ece348db06ba5/SmolLM-135M-Instruct.Q3_K_M.gguf?download=true',
    sha256: '8446b8924fe1c723254d60b5ef008fda7df9d8cea8bf143d07ea74c8efd4f1b5',
    runtime: 'llama.cpp',
    android: true,
    ollamaName: 'smollm2:135m',
    profile: Object.freeze({ promptTemplate: 'chatml', contextTokens: 2048, maxOutputTokens: 128, preferredThreads: 2 }),
  }),
  Object.freeze({
    id: 'smollm2-360m-q3',
    name: 'SmolLM2 360M',
    family: 'smollm2',
    params: '360M',
    file: 'SmolLM2-360M-Instruct-Q3_K_M.gguf',
    size: 235,
    sizeUnit: 'MB',
    sizeBytes: 234_686_880,
    minRam: 2,
    minRamBytes: 2 * GB,
    task: 'chat',
    description: 'Small offline Android chat and runtime-validation model.',
    badge: 'Small',
    runsOn: ['web', 'mobile'],
    quantization: 'Q3_K_M',
    quantizations: ['Q3_K_M'],
    license: 'Apache-2.0',
    source: 'bartowski/SmolLM2-360M-Instruct-GGUF',
    revision: '7be6f65f1db715fe5dc5a4634c0d459b4eed42ec',
    downloadUrl: 'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF/resolve/7be6f65f1db715fe5dc5a4634c0d459b4eed42ec/SmolLM2-360M-Instruct-Q3_K_M.gguf?download=true',
    sha256: '39683fe57014873905cf7fa25a5beecf36d355b900a0270eb049fd560c85cf63',
    runtime: 'llama.cpp',
    android: true,
    ollamaName: 'smollm2:360m',
    profile: Object.freeze({ promptTemplate: 'chatml', systemPrompt: 'You are a helpful AI assistant named SmolLM, trained by Hugging Face', contextTokens: 4096, maxOutputTokens: 384, preferredThreads: 2 }),
  }),
  Object.freeze({
    id: 'qwen2.5-0.5b-q4',
    name: 'Qwen2.5 0.5B',
    family: 'qwen',
    params: '0.5B',
    file: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    size: 491,
    sizeUnit: 'MB',
    sizeBytes: 491_400_032,
    minRam: 3,
    minRamBytes: 3 * GB,
    task: 'chat',
    description: 'General-purpose local assistant for compatible Android devices.',
    badge: 'Balanced',
    runsOn: ['web', 'mobile'],
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M'],
    license: 'Apache-2.0',
    source: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    revision: '9217f5db79a29953eb74d5343926648285ec7e67',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf?download=true',
    sha256: '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db',
    runtime: 'llama.cpp',
    android: true,
    ollamaName: 'qwen2.5:0.5b',
    profile: Object.freeze({ promptTemplate: 'chatml', systemPrompt: 'You are Qwen, created by Alibaba Cloud. You are a helpful assistant.', contextTokens: 4096, maxOutputTokens: 512, preferredThreads: 2 }),
  }),
  Object.freeze({
    id: 'qwen2.5-coder-1.5b-q4',
    name: 'Qwen2.5-Coder 1.5B',
    family: 'qwen-coder',
    params: '1.5B',
    file: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    size: 1117,
    sizeUnit: 'MB',
    sizeBytes: 1_117_320_768,
    minRam: 4,
    minRamBytes: 4 * GB,
    task: 'coding',
    description: 'Initial code-focused local model for higher-memory Android devices.',
    badge: 'Coding',
    runsOn: ['web', 'mobile'],
    quantization: 'Q4_K_M',
    quantizations: ['Q4_K_M'],
    license: 'Apache-2.0',
    source: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
    revision: 'f86cb2c1fa58255f8052cc32aeede1b7482d4361',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/f86cb2c1fa58255f8052cc32aeede1b7482d4361/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf?download=true',
    sha256: 'cc324af070c2ecbfd324a30884d2f951a7ff756aba85cb811a6ec436933bb046',
    runtime: 'llama.cpp',
    android: true,
    ollamaName: 'qwen2.5-coder:1.5b',
    profile: Object.freeze({ promptTemplate: 'chatml', systemPrompt: 'You are Qwen, created by Alibaba Cloud. You are a helpful assistant.', contextTokens: 4096, maxOutputTokens: 512, preferredThreads: 2 }),
  }),
]);

export function validateCatalog(catalog = MODEL_CATALOG, { requireChecksums = false } = {}) {
  const ids = new Set();
  for (const model of catalog) {
    if (!model.id || ids.has(model.id)) throw new Error(`Duplicate or missing model id: ${model.id}`);
    ids.add(model.id);
    if (model.runtime !== 'llama.cpp' || !model.file.toLowerCase().endsWith('.gguf')) throw new Error(`Invalid GGUF runtime for ${model.id}`);
    if (!/^https:\/\//.test(model.downloadUrl)) throw new Error(`HTTPS URL required for ${model.id}`);
    if (!model.revision || !model.downloadUrl.includes(`/resolve/${model.revision}/`)) throw new Error(`Immutable revision URL required for ${model.id}`);
    if (!Number.isFinite(model.sizeBytes) || model.sizeBytes < MB) throw new Error(`Exact model size required for ${model.id}`);
    if (!model.license || !model.source || !model.quantization) throw new Error(`Model provenance required for ${model.id}`);
    if (!model.profile?.promptTemplate || !Number.isInteger(model.profile.contextTokens) || !Number.isInteger(model.profile.maxOutputTokens)) {
      throw new Error(`Runtime profile required for ${model.id}`);
    }
    if (requireChecksums && !/^[a-f0-9]{64}$/i.test(model.sha256 || '')) throw new Error(`SHA-256 required for ${model.id}`);
  }
  return true;
}

export function getModelById(id) {
  return MODEL_CATALOG.find(model => model.id === id) || null;
}

export function getModelBySha256(sha256) {
  const value = String(sha256 || '').toLowerCase();
  return MODEL_CATALOG.find(model => model.sha256 === value) || null;
}

export function getModelProfile(model) {
  return { ...profileForModel(model), ...(model?.profile || {}) };
}

validateCatalog(MODEL_CATALOG, { requireChecksums: true });
