const BYTES_PER_MEGABYTE = 1000 ** 2;
const BYTES_PER_GIGABYTE = 1000 ** 3;
const BYTES_PER_GIBIBYTE = 1024 ** 3;
const RUNTIME_BASE_OVERHEAD = 384 * 1024 ** 2;
const STORAGE_INSTALL_HEADROOM = 256 * 1000 ** 2;

export function getModelSizeBytes(model) {
  if (Number(model?.downloadedBytes) > 0) return Number(model.downloadedBytes);
  if (Number(model?.sizeBytes) > 0) return Number(model.sizeBytes);
  const size = Number(model?.size) || 0;
  return model?.sizeUnit === 'GB' ? size * BYTES_PER_GIGABYTE : size * BYTES_PER_MEGABYTE;
}

export function estimateModelRamBytes(model) {
  const modelBytes = getModelSizeBytes(model);
  const contextTokens = Number(model?.profile?.contextTokens) || 2048;
  // Conservative generic estimate until model-specific layer/embedding metadata is inspected.
  const kvAndContext = contextTokens * 64 * 1024;
  return Math.max(
    Number(model?.minRamBytes) || 0,
    Math.ceil(modelBytes * 1.25 + kvAndContext + RUNTIME_BASE_OVERHEAD),
  );
}

export function assessModelCompatibility(model, capacity = {}) {
  const requiredRamBytes = estimateModelRamBytes(model);
  const requiredStorageBytes = getModelSizeBytes(model) + STORAGE_INSTALL_HEADROOM;
  const totalRamBytes = Number(capacity.ramBytes);
  const availableRamBytes = Number(capacity.availableRamBytes);
  const availableStorageBytes = Number(capacity.availableStorageBytes);

  if (!Number.isFinite(totalRamBytes) || !Number.isFinite(availableStorageBytes)) {
    return { compatible: false, reason: 'Device RAM or free storage could not be measured.', requiredRamBytes, requiredStorageBytes };
  }
  if (totalRamBytes < requiredRamBytes) {
    return { compatible: false, reason: `Requires about ${formatMemoryCapacity(requiredRamBytes)} total RAM.`, requiredRamBytes, requiredStorageBytes };
  }
  const workingSetFloor = Math.min(requiredRamBytes * 0.45, getModelSizeBytes(model) + 512 * 1024 ** 2);
  if (Number.isFinite(availableRamBytes) && availableRamBytes < workingSetFloor) {
    return { compatible: false, reason: 'Not enough RAM is currently available. Close other apps and refresh.', requiredRamBytes, requiredStorageBytes };
  }
  if (availableStorageBytes < requiredStorageBytes) {
    return { compatible: false, reason: `Requires about ${formatModelSize(requiredStorageBytes)} free storage.`, requiredRamBytes, requiredStorageBytes };
  }
  return { compatible: true, reason: 'Measured RAM and storage meet the conservative estimate.', requiredRamBytes, requiredStorageBytes };
}

export function formatModelSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes >= BYTES_PER_GIGABYTE) return `${(bytes / BYTES_PER_GIGABYTE).toFixed(1).replace(/\.0$/, '')} GB`;
  return `${Math.round(bytes / BYTES_PER_MEGABYTE)} MB`;
}

export function formatMemoryCapacity(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unavailable';
  return `${Math.ceil(bytes / BYTES_PER_GIBIBYTE)} GB`;
}

export function formatStorageCapacity(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unavailable';
  return `${Math.round(bytes / BYTES_PER_GIGABYTE)} GB`;
}

export function ramGigabytesForCompatibility(bytes, fallback = 4) {
  if (!Number.isFinite(bytes) || bytes <= 0) return fallback;
  return Math.max(1, Math.floor(bytes / BYTES_PER_GIBIBYTE));
}
