export const PROMPT_PROFILES = Object.freeze({
  smollm: Object.freeze({ promptTemplate: 'chatml', contextTokens: 2048, maxOutputTokens: 128, preferredThreads: 2 }),
  smollm2: Object.freeze({ promptTemplate: 'chatml', systemPrompt: 'You are a helpful AI assistant named SmolLM, trained by Hugging Face', contextTokens: 4096, maxOutputTokens: 384, preferredThreads: 2 }),
  qwen: Object.freeze({ promptTemplate: 'chatml', systemPrompt: 'You are Qwen, created by Alibaba Cloud. You are a helpful assistant.', contextTokens: 4096, maxOutputTokens: 512, preferredThreads: 2 }),
  'qwen-coder': Object.freeze({ promptTemplate: 'chatml', systemPrompt: 'You are Qwen, created by Alibaba Cloud. You are a helpful assistant.', contextTokens: 4096, maxOutputTokens: 512, preferredThreads: 2 }),
  generic: Object.freeze({ promptTemplate: 'chatml', contextTokens: 2048, maxOutputTokens: 256, preferredThreads: 2 }),
});

export function profileForModel(model = {}) {
  if (model.profile) return { ...PROMPT_PROFILES.generic, ...model.profile };
  const id = `${model.id || ''} ${model.name || ''} ${model.file || ''}`.toLowerCase();
  if (id.includes('coder')) return PROMPT_PROFILES['qwen-coder'];
  if (id.includes('qwen')) return PROMPT_PROFILES.qwen;
  if (id.includes('smollm2')) return PROMPT_PROFILES.smollm2;
  if (id.includes('smollm')) return PROMPT_PROFILES.smollm;
  return PROMPT_PROFILES.generic;
}

export function formatPrompt(messages = [], profile = PROMPT_PROFILES.generic) {
  const list = messages.filter(message => message && typeof message.content === 'string');
  if (profile.systemPrompt && list[0]?.role !== 'system') list.unshift({ role: 'system', content: profile.systemPrompt });
  if (profile.promptTemplate === 'chatml') {
    return `${list.map(message => `<|im_start|>${message.role || 'user'}\n${message.content}<|im_end|>`).join('\n')}\n<|im_start|>assistant\n`;
  }
  return `${list.map(message => `${message.role || 'user'}: ${message.content}`).join('\n')}\nassistant:`;
}
