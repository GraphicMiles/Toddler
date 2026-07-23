const BYTES_PER_MEGABYTE = 1000 ** 2;
const BYTES_PER_GIGABYTE = 1000 ** 3;
const BYTES_PER_GIBIBYTE = 1024 ** 3;

export function getModelSizeBytes(model) {
  const size = Number(model?.size) || 0;
  return model?.sizeUnit === 'GB' ? size * BYTES_PER_GIGABYTE : size * BYTES_PER_MEGABYTE;
}

export function formatModelSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes >= BYTES_PER_GIGABYTE) {
    return `${(bytes / BYTES_PER_GIGABYTE).toFixed(1).replace(/\.0$/, '')} GB`;
  }
  return `${Math.round(bytes / BYTES_PER_MEGABYTE)} MB`;
}

// Memory is conventionally advertised in binary gigabytes (GiB), while device
// storage is sold in decimal GB. Keeping the formatting separate avoids a
// misleading 119 GB label on a 128 GB phone.
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
  return Math.max(1, Math.ceil(bytes / BYTES_PER_GIBIBYTE));
}
