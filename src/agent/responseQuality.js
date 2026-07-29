export const RESPONSE_QUALITY = Object.freeze({ FAST: 'fast', BALANCED: 'balanced', REVIEWED: 'reviewed' });
const STORAGE_KEY = 'forgeai_response_quality';

export function readResponseQuality() {
  if (typeof localStorage === 'undefined') return RESPONSE_QUALITY.BALANCED;
  const value = localStorage.getItem(STORAGE_KEY);
  return Object.values(RESPONSE_QUALITY).includes(value) ? value : RESPONSE_QUALITY.BALANCED;
}

export function writeResponseQuality(value) {
  if (!Object.values(RESPONSE_QUALITY).includes(value)) throw new Error('Invalid response quality mode.');
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(STORAGE_KEY, value); }
    catch (error) { console.warn('Failed to save response quality:', error); }
  }
  return value;
}

async function capture(provider, model, messages, signal) {
  let text = '';
  const result = await provider.stream({ model, messages, signal, onToken: token => { text += token; } });
  return { text, result };
}

export async function generateQualityResponse({ provider, model, messages, signal, onToken, quality }) {
  if (quality !== RESPONSE_QUALITY.REVIEWED || model.task === 'smoke-test' || /135m/i.test(`${model.name} ${model.file}`)) {
    return provider.stream({ model, messages, signal, onToken });
  }
  const initial = await capture(provider, model, messages, signal);
  const critic = await capture(provider, model, [
    { role: 'system', content: 'Review the draft for factual contradictions, missed user intent, unsupported claims, repetition, and unclear wording. Return a short bullet list only.' },
    { role: 'user', content: `USER REQUEST:\n${messages.at(-1)?.content || ''}\n\nDRAFT:\n${initial.text}` },
  ], signal);
  return provider.stream({
    model,
    signal,
    onToken,
    messages: [
      { role: 'system', content: 'Return the final answer only. Preserve correct parts, remove repetition, and address each reviewer note. Do not mention the review process.' },
      { role: 'user', content: `REQUEST:\n${messages.at(-1)?.content || ''}\n\nDRAFT:\n${initial.text}\n\nREVIEW:\n${critic.text}` },
    ],
  });
}
