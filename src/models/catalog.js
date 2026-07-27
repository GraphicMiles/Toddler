import { profileForModel } from './promptProfiles.js';

export const MODEL_CATALOG = Object.freeze([
  { id: 'smollm-135m-q3', name: 'SmolLM 135M Test', file: 'smollm-135m-q3.gguf', size: 94, sizeUnit: 'MB', task: 'smoke-test', description: 'Under-100 MB offline runtime smoke test; not coding-capable.', downloadUrl: 'https://huggingface.co/second-state/SmolLM-135M-Instruct-GGUF/resolve/main/smollm-135m-instruct-q3_k_m.gguf?download=true', sha256: null, runtime: 'llama.cpp', android: true, minRam: 2 },
  { id: 'smollm2-360m-q3', name: 'SmolLM2 360M', file: 'smollm2-360m-q3.gguf', size: 235, sizeUnit: 'MB', task: 'chat', description: 'Small offline Android test model.', downloadUrl: 'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q3_K_M.gguf?download=true', sha256: null, runtime: 'llama.cpp', android: true, minRam: 3 },
  { id: 'qwen2.5-0.5b-q4', name: 'Qwen2.5 0.5B', file: 'qwen2.5-0.5b-q4.gguf', size: 400, sizeUnit: 'MB', task: 'chat', description: 'General local test model.', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf?download=true', sha256: null, runtime: 'llama.cpp', android: true, minRam: 4 },
  { id: 'qwen2.5-coder-1.5b-q4', name: 'Qwen2.5-Coder 1.5B', file: 'qwen2.5-coder-1.5b-q4.gguf', size: 1100, sizeUnit: 'MB', task: 'coding', description: 'Initial coding-assistant model.', downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf?download=true', sha256: null, runtime: 'llama.cpp', android: true, minRam: 4 },
]);

export function validateCatalog(catalog = MODEL_CATALOG, { requireChecksums = false } = {}) {
  const ids = new Set();
  for (const model of catalog) {
    if (!model.id || ids.has(model.id)) throw new Error(`Duplicate or missing model id: ${model.id}`);
    ids.add(model.id);
    if (model.runtime !== 'llama.cpp' || !model.file.toLowerCase().endsWith('.gguf')) throw new Error(`Invalid GGUF runtime for ${model.id}`);
    if (!/^https:\/\//.test(model.downloadUrl)) throw new Error(`HTTPS URL required for ${model.id}`);
    if (requireChecksums && !/^[a-f0-9]{64}$/i.test(model.sha256 || '')) throw new Error(`SHA-256 required for ${model.id}`);
  }
  return true;
}
export function getModelProfile(model) {
  return { ...profileForModel(model), ...(model?.profile || {}) };
}

validateCatalog();
