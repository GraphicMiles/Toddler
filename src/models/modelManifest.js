export function createModelManifest(model, data = {}) {
  if (!model?.id) throw new Error('Model id is required.');
  const fileName = data.fileName || model.file;
  if (!String(fileName || '').toLowerCase().endsWith('.gguf')) throw new Error('Only GGUF models are supported.');
  return {
    ...model,
    id: model.id,
    name: model.name || model.id,
    file: fileName,
    fileName,
    runtime: 'llama.cpp',
    format: 'GGUF',
    localPath: data.runtimePath || model.localPath || null,
    runtimePath: data.runtimePath || model.runtimePath || null,
    sourceUri: data.sourceUri || model.sourceUri || null,
    sourcePath: data.sourcePath || model.sourcePath || null,
    source: data.source || model.source || 'User import',
    sizeBytes: Number(data.sizeBytes || model.sizeBytes || 0),
    downloadedBytes: Number(data.sizeBytes || model.downloadedBytes || model.sizeBytes || 0),
    sha256: data.sha256 || model.sha256 || null,
    verified: data.verified === true,
    integrity: data.verified === true ? 'publisher-verified' : (data.sha256 || model.sha256 ? 'hash-recorded' : 'unverified'),
    status: data.status || model.status || 'ready',
    importedAt: data.importedAt || model.importedAt || new Date().toISOString(),
    downloadedAt: data.downloadedAt || model.downloadedAt || new Date().toISOString(),
  };
}

export function isUsableManifest(manifest) {
  return Boolean(
    manifest?.id
    && manifest.runtime === 'llama.cpp'
    && manifest.format === 'GGUF'
    && (manifest.localPath || manifest.runtimePath)
    && manifest.integrity !== 'verification-failed'
  );
}
