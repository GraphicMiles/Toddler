/**
 * Toddler RAG Engine
 * 
 * Chunks documents, stores them in IndexedDB, and retrieves relevant
 * chunks via TF-IDF cosine similarity for context injection.
 */

// ─── Document Parsing ─────────────────────────────────────────────

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsText(file)
  })
}

// ─── Chunking ─────────────────────────────────────────────────────

const CHUNK_SIZE = 600    // characters per chunk
const CHUNK_OVERLAP = 100 // overlap between chunks

export function splitIntoChunks(text, sourceName) {
  // Clean text
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .trim()

  if (cleaned.length === 0) return []

  const chunks = []
  let start = 0

  while (start < cleaned.length) {
    let end = Math.min(start + CHUNK_SIZE, cleaned.length)

    // Try to break at sentence boundary
    if (end < cleaned.length) {
      const lastPeriod = cleaned.lastIndexOf('.', end)
      const lastNewline = cleaned.lastIndexOf('\n', end)
      const breakPoint = Math.max(lastPeriod, lastNewline)
      if (breakPoint > start + CHUNK_SIZE * 0.5) {
        end = breakPoint + 1
      }
    }

    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 20) { // Skip tiny fragments
      chunks.push({
        text: chunk,
        source: sourceName,
        index: chunks.length,
        charStart: start,
        charEnd: end,
      })
    }

    start = end - CHUNK_OVERLAP
    if (start >= cleaned.length) break
  }

  return chunks
}

export async function chunkDocuments(files) {
  const allChunks = []

  for (const file of files) {
    try {
      const text = await readFileAsText(file)
      const chunks = splitIntoChunks(text, file.name)
      allChunks.push(...chunks)
    } catch (err) {
      console.warn(`Skipping ${file.name}: ${err.message}`)
    }
  }

  // Cap at 200 chunks for mobile
  return allChunks.slice(0, 200)
}

// ─── IndexedDB Storage ────────────────────────────────────────────

const DB_NAME = 'toddler_rag'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks', { keyPath: 'id' })
      }
    }
  })
}

export async function storeChunks(projectId, chunks) {
  const db = await openDB()
  const tx = db.transaction('chunks', 'readwrite')
  const store = tx.objectStore('chunks')

  // Clear existing chunks for this project
  const existing = await new Promise((resolve) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result.filter(c => c.projectId === projectId))
  })
  for (const c of existing) store.delete(c.id)

  // Store new chunks with TF-IDF vectors
  const vocab = buildVocab(chunks)
  const idf = computeIDF(chunks, vocab)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const tfidf = computeTFIDF(chunk.text, vocab, idf)
    store.put({
      id: `${projectId}_${i}`,
      projectId,
      ...chunk,
      tfidf,
    })
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function loadChunks(projectId) {
  const db = await openDB()
  const tx = db.transaction('chunks', 'readonly')
  const store = tx.objectStore('chunks')

  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => {
      db.close()
      resolve(req.result.filter(c => c.projectId === projectId))
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

// ─── TF-IDF Retrieval ─────────────────────────────────────────────

const STOPWORDS = new Set('the a an and or but if then of at by for with about against between into through during before after above below to from up down in out on off over under again further is am are was were be been being have has had having do does did doing i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she her hers herself it its itself they them their theirs themselves what which who whom this that these those as so than too very can will just don should now'.split(' '))

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w))
}

function buildVocab(chunks) {
  const words = new Set()
  for (const chunk of chunks) {
    for (const w of tokenize(chunk.text)) {
      words.add(w)
    }
  }
  return Array.from(words)
}

function computeIDF(chunks, vocab) {
  const n = chunks.length
  const df = new Array(vocab.length).fill(0)
  const wordIndex = Object.fromEntries(vocab.map((w, i) => [w, i]))

  for (const chunk of chunks) {
    const seen = new Set()
    for (const w of tokenize(chunk.text)) {
      if (wordIndex[w] !== undefined && !seen.has(w)) {
        df[wordIndex[w]]++
        seen.add(w)
      }
    }
  }

  return df.map(d => Math.log((n + 1) / (d + 1)) + 1) // smoothed IDF
}

function computeTFIDF(text, vocab, idf) {
  const tokens = tokenize(text)
  const tf = {}
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1

  const wordIndex = Object.fromEntries(vocab.map((w, i) => [w, i]))
  const vec = {}
  let norm = 0

  for (const [word, count] of Object.entries(tf)) {
    const idx = wordIndex[word]
    if (idx === undefined) continue
    const val = count * idf[idx]
    vec[idx] = val
    norm += val * val
  }

  norm = Math.sqrt(norm) || 1
  for (const idx in vec) vec[idx] /= norm

  return vec
}

function cosineSimilarity(a, b) {
  let dot = 0
  for (const idx in a) {
    if (b[idx] !== undefined) dot += a[idx] * b[idx]
  }
  return dot
}

/**
 * Retrieve the top-K most relevant chunks for a query.
 */
export async function retrieveChunks(projectId, query, topK = 5) {
  const chunks = await loadChunks(projectId)
  if (chunks.length === 0) return []

  // Build IDF from all chunks
  const vocab = buildVocab(chunks)
  const idf = computeIDF(chunks, vocab)

  // Compute query TF-IDF
  const queryVec = computeTFIDF(query, vocab, idf)

  // Score each chunk
  const scored = chunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryVec, chunk.tfidf || {}),
  }))

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK)
}

/**
 * Build a RAG-augmented prompt for the LLM.
 */
export async function buildRAGPrompt(projectId, userMessage, topK = 5) {
  const chunks = await retrieveChunks(projectId, userMessage, topK)

  if (chunks.length === 0) {
    return { prompt: userMessage, sources: [] }
  }

  const context = chunks
    .map((c, i) => `[Source: ${c.source} · chunk_${String(c.index).padStart(3, '0')}]\n${c.text}`)
    .join('\n\n---\n\n')

  const systemPrompt = `You are a helpful assistant. Use the following context to answer the user's question. If the answer is not in the context, say so honestly. Cite the source when possible.

CONTEXT:
${context}`

  const sources = chunks.map(c => ({
    source: c.source,
    chunkIndex: c.index,
    score: c.score,
    preview: c.text.slice(0, 100) + '...',
  }))

  return { systemPrompt, userMessage, sources }
}
