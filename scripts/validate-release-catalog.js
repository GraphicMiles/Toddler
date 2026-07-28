import { MODEL_CATALOG, validateCatalog } from '../src/models/catalog.js';
validateCatalog(MODEL_CATALOG, { requireChecksums: true });
console.log(`Release catalog validated: ${MODEL_CATALOG.length} immutable checksummed GGUF models.`);
