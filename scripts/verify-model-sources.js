import { MODEL_CATALOG, validateCatalog } from '../src/models/catalog.js';

validateCatalog(MODEL_CATALOG, { requireChecksums: true });
for (const model of MODEL_CATALOG) {
  const response = await fetch(model.downloadUrl, { headers: { Range: 'bytes=0-3' }, redirect: 'follow' });
  if (response.status !== 206) throw new Error(`${model.id}: source did not honor a four-byte range request (HTTP ${response.status}).`);
  const contentRange = response.headers.get('content-range') || '';
  const total = Number(contentRange.match(/\/(\d+)$/)?.[1]);
  if (total !== model.sizeBytes) throw new Error(`${model.id}: source size ${total} does not match catalog size ${model.sizeBytes}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== 4 || bytes[0] !== 0x47 || bytes[1] !== 0x47 || bytes[2] !== 0x55 || bytes[3] !== 0x46) {
    throw new Error(`${model.id}: source does not start with the GGUF magic header.`);
  }
  console.log(`${model.id}: HTTP range, size, and GGUF header verified.`);
}
