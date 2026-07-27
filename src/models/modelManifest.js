export function createModelManifest(model, data = {}) {
  if (!model?.id) throw new Error('Model id is required.');
  if (!String(data.fileName || model.file || '').toLowerCase().endsWith('.gguf')) throw new Error('Only GGUF models are supported.');
  return {
    id: model.id,
    name: model.name || model.id,
    fileName: data.fileName || model.file,
    runtime: 'llama.cpp',
    format: 'GGUF',
    runtimePath: data.runtimePath || null,
    sourceUri: data.sourceUri || null,
    source: data.source || 'Model Zoo',
    sizeBytes: Number(data.sizeBytes || 0),
    sha256: data.sha256 || null,
    verified: data.verified === true,
    importedAt: data.importedAt || new Date().toISOString(),
  };
}

export function isUsableManifest(manifest) {
  return Boolean(manifest?.id && manifest.runtime === 'llama.cpp' && manifest.format === 'GGUF' && manifest.runtimePath && manifest.verified === true);
}
