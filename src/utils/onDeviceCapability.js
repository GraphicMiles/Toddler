/** Conservative gate for on-device GGUF models.
 * A model is allowed only when we know RAM and storage, and both include a safety margin.
 * Unknown capacity is never treated as compatible.
 */
export const ON_DEVICE_MODELS = [
  { id: 'smollm2-360m-q4', name: 'SmolLM2 360M Q4', params: '360M', sizeBytes: 260 * 1000 ** 2, minRamBytes: 2 * 1024 ** 3, context: 1024, file: 'smollm2-360m-q4.gguf' },
  { id: 'qwen2.5-0.5b-q4', name: 'Qwen2.5 0.5B Q4', params: '0.5B', sizeBytes: 380 * 1000 ** 2, minRamBytes: 3 * 1024 ** 3, context: 1024, file: 'qwen2.5-0.5b-q4.gguf' },
];

const RAM_HEADROOM = 512 * 1024 ** 2;
const STORAGE_HEADROOM = 256 * 1000 ** 2;

export function assessOnDeviceModel(model, capacity = {}) {
  const ram = Number(capacity.availableRamBytes);
  const storage = Number(capacity.availableStorageBytes);
  if (!Number.isFinite(ram) || !Number.isFinite(storage)) return { compatible: false, reason: 'Device RAM and free storage could not be measured.' };
  if (ram < model.minRamBytes + RAM_HEADROOM) return { compatible: false, reason: `Requires ${(model.minRamBytes / 1024 ** 3).toFixed(1)} GB RAM plus safety headroom.` };
  if (storage < model.sizeBytes + STORAGE_HEADROOM) return { compatible: false, reason: `Requires ${Math.ceil((model.sizeBytes + STORAGE_HEADROOM) / 1000 ** 2)} MB free storage.` };
  return { compatible: true, reason: 'Sufficient measured RAM and storage.' };
}

export function getCompatibleOnDeviceModels(capacity) {
  return ON_DEVICE_MODELS.filter(model => assessOnDeviceModel(model, capacity).compatible);
}
