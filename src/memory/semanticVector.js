/**
 * Lightweight semantic vectorizer (dependency-free).
 *
 * True neural embeddings need a model round-trip; on a local-first mobile app we
 * want recall that works offline and instantly. This builds a sparse bag-of-
 * features vector from word tokens + character trigrams, so similarity survives
 * typos, pluralisation, and word-order changes far better than substring match.
 *
 * Vectors are plain objects: { feature: weight }. Similarity is cosine.
 * Small, deterministic, and JSON-serialisable so vectors can be cached in
 * localStorage alongside each memory.
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'to', 'of', 'in', 'on',
  'at', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'this', 'that', 'these',
  'those', 'my', 'me', 'i', 'you', 'your', 'we', 'so', 'can', 'will', 'want',
  'need', 'please', 'just', 'now', 'all', 'any', 'some', 'how', 'what', 'who',
  'when', 'where', 'why', 'do', 'does', 'did', 'get', 'got', 'make', 'made',
]);

function tokens(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Character trigrams of a word, padded so short words still yield features.
function trigrams(word) {
  const padded = `#${word}#`;
  const grams = [];
  for (let i = 0; i < padded.length - 2; i++) grams.push(padded.slice(i, i + 3));
  return grams;
}

/**
 * Build a sparse feature vector from text.
 * Word features are weighted higher than trigram features (exact word matches
 * matter most; trigrams add fuzz tolerance).
 */
export function embed(text) {
  const vector = Object.create(null);
  const words = tokens(text);
  for (const word of words) {
    if (word.length < 2) continue;
    if (!STOPWORDS.has(word) && word.length >= 3) {
      vector[`w:${word}`] = (vector[`w:${word}`] || 0) + 2;
    }
    for (const gram of trigrams(word)) {
      vector[`g:${gram}`] = (vector[`g:${gram}`] || 0) + 1;
    }
  }
  return vector;
}

/** Cosine similarity between two sparse vectors (0..1). */
export function cosineSimilarity(a, b) {
  if (!a || !b) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const key in a) {
    normA += a[key] * a[key];
    if (key in b) dot += a[key] * b[key];
  }
  for (const key in b) normB += b[key] * b[key];
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Convenience: similarity between two raw texts. */
export function textSimilarity(a, b) {
  return cosineSimilarity(embed(a), embed(b));
}
