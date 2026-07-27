export const PROMPT_PROFILES = Object.freeze({
  smollm: { promptTemplate: 'smollm', contextTokens: 4096, maxOutputTokens: 256, preferredThreads: 2 },
  qwen: { promptTemplate: 'chatml', contextTokens: 4096, maxOutputTokens: 512, preferredThreads: 2 },
  'qwen-coder': { promptTemplate: 'chatml', contextTokens: 4096, maxOutputTokens: 512, preferredThreads: 2 },
  generic: { promptTemplate: 'generic', contextTokens: 4096, maxOutputTokens: 256, preferredThreads: 2 },
});

export function profileForModel(model = {}) {
  const id = `${model.id || ''} ${model.name || ''}`.toLowerCase();
  if (id.includes('coder')) return PROMPT_PROFILES['qwen-coder'];
  if (id.includes('qwen')) return PROMPT_PROFILES.qwen;
  if (id.includes('smollm')) return PROMPT_PROFILES.smollm;
  return PROMPT_PROFILES.generic;
}

export function formatPrompt(messages = [], profile = PROMPT_PROFILES.generic) {
  const list = messages.filter(m => m && typeof m.content === 'string');
  if (profile.promptTemplate === 'chatml') {
    return `${list.map(m => `<|im_start|>${m.role || 'user'}\n${m.content}<|im_end|>`).join('\n')}\n<|im_start|>assistant\n`;
  }
  if (profile.promptTemplate === 'smollm') {
    return `${list.map(m => `${m.role || 'user'}: ${m.content}`).join('\n')}\nassistant:`;
  }
  return `${list.map(m => `${m.role || 'user'}: ${m.content}`).join('\n')}\nassistant:`;
}
