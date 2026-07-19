/**
 * On-device LLM engine using @mlc-ai/web-llm (WebGPU required).
 *
 * Tier mapping by device RAM (GB):
 *   4 GB  → SmolLM2-360M-Instruct-q0f16-MLC   (~150 MB, ~300 MB RAM total)
 *   6 GB  → SmolLM2-1.7B-Instruct-q4f16_1-MLC (~900 MB, ~1.3 GB RAM)
 *   8 GB+ → Llama-3.2-3B-Instruct-q4f16_1-MLC (~1.7 GB, ~2.5 GB RAM, better at code)
 *
 * The engine is a singleton so model weights stay loaded across tab switches.
 * Chat history is per-model; switching models resets the conversation.
 *
 * v1 "training" = RAG: user uploads .txt/.csv/.md/.json/.js files, we
 * chunk them, add to a local knowledge base, and inject the most relevant
 * chunks into the system prompt. No weight updates.
 */

// Lazy-loaded below so the main app bundle stays ~1MB. web-llm is ~6MB of
// TVM/WASM runtime and is only needed when the user downloads an LLM.

// Models users can download for on-device chat. `hfId` is the web-llm model_id.
export const LLM_CATALOG = [
  {
    id: 'smollm2-360m',
    hfId: 'SmolLM2-360M-Instruct-q0f16-MLC',
    name: 'SmolLM2 Chat 360M',
    type: 'On-device LLM',
    sizeMb: 150,
    parameterCount: 360_000_000,
    trainingRamMb: 0,
    inferenceRamMb: 450,
    minRamGb: 4,
    color: '#c6ff33',
    description: 'Tiny general-purpose chat model. Runs on any 4GB phone.',
    format: 'mlc',
    license: 'Apache-2.0',
    status: 'published',
    task: 'chat',
    supportsCode: false,
  },
  {
    id: 'smollm2-1.7b',
    hfId: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 Chat 1.7B',
    type: 'On-device LLM',
    sizeMb: 900,
    parameterCount: 1_700_000_000,
    trainingRamMb: 0,
    inferenceRamMb: 1300,
    minRamGb: 6,
    color: '#60d6fa',
    description: 'Smarter conversational model. Answers questions, follows instructions.',
    format: 'mlc',
    license: 'Apache-2.0',
    status: 'published',
    task: 'chat',
    supportsCode: false,
  },
  {
    id: 'llama3.2-3b',
    hfId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B',
    type: 'On-device LLM',
    sizeMb: 1700,
    parameterCount: 3_200_000_000,
    trainingRamMb: 0,
    inferenceRamMb: 2400,
    minRamGb: 8,
    color: '#c084fc',
    description: 'Meta Llama 3.2 3B — can write code, summarize, reason. Needs ≥8GB RAM.',
    format: 'mlc',
    license: 'Llama 3.2',
    status: 'published',
    task: 'chat',
    supportsCode: true,
  },
];

let singleton = null;   // { engine, modelId, chatOpts, ready, initPromise }
const listeners = new Set(); // (state) => void

function emit(state) { listeners.forEach(fn => { try { fn(state); } catch {} }); }

export function onLlmState(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function getLlmState() {
  return singleton ? { ...singleton } : { ready: false, loading: false, modelId: null, progress: 0, text: '' };
}

export function isWebGpuAvailable() {
  try {
    if (!navigator.gpu) return false;
    // Some devices advertise WebGPU but fail to create an adapter for real models.
    return true;
  } catch { return false; }
}

export function pickBestLlmModel(ramGb) {
  const ram = ramGb || (navigator.deviceMemory || 4);
  const sorted = [...LLM_CATALOG].sort((a,b) => b.minRamGb - a.minRamGb);
  return sorted.find(m => ram >= m.minRamGb) || null;
}

/**
 * Initialize (or reuse) an LLM engine for a given model. Returns the engine.
 * Calls `onProgress(progress 0-1, text)` as weights load.
 */
export async function loadLlm(modelId, onProgress) {
  const model = LLM_CATALOG.find(m => m.id === modelId);
  if (!model) throw new Error(`Unknown LLM: ${modelId}`);
  if (!isWebGpuAvailable()) throw new Error('WebGPU not available on this device. Use Cloud Chat (Pro).');

  if (singleton && singleton.modelId === modelId && singleton.ready) return singleton.engine;

  if (singleton && singleton.initPromise) {
    // already loading — just subscribe to progress
    if (onProgress) singleton.progressListeners.push(onProgress);
    return singleton.initPromise;
  }

  singleton = {
    engine: null, modelId, ready: false,
    progress: 0, text: 'Preparing…',
    progressListeners: onProgress ? [onProgress] : [],
    initPromise: null,
    ragChunks: [], // array of {id, text, filename}
  };
  emit({ ...singleton, loading: true });

  const initPromise = (async () => {
    try {
      const { CreateMLCEngine: CME } = await import('@mlc-ai/web-llm');
      const engine = await CME(model.hfId, {
        initProgressCallback: (p) => {
          singleton.progress = p.progress || 0;
          singleton.text = p.text || '';
          singleton.progressListeners.forEach(fn => {
            try { fn(p.progress || 0, p.text || ''); } catch {}
          });
          emit({ ...singleton, loading: true });
        },
      });
      singleton.engine = engine;
      singleton.ready = true;
      singleton.progress = 1;
      emit({ ...singleton, loading: false });
      return engine;
    } catch (err) {
      singleton = null;
      emit({ ready: false, loading: false, modelId: null, progress: 0, text: '', error: err.message });
      throw err;
    } finally {
      if (singleton) singleton.progressListeners = [];
    }
  })();
  singleton.initPromise = initPromise;
  return initPromise;
}

export async function unloadLlm() {
  try {
    if (singleton?.engine) {
      await singleton.engine.unload?.();
    }
  } catch {}
  singleton = null;
  emit({ ready: false, loading: false, modelId: null, progress: 0, text: '' });
}

/** Build a system prompt that includes injected RAG chunks. */
function buildSystemPrompt(model) {
  const parts = [
    `You are Toddler, a helpful AI assistant running locally on the user's device.`,
    `Be concise, accurate, and friendly. If you don't know something, say so.`,
  ];
  if (model?.supportsCode) {
    parts.push(`You can read and write code in most languages. When showing code, use fenced code blocks with the language.`);
  }
  if (singleton?.ragChunks?.length) {
    parts.push(`\nThe user has uploaded the following documents to use as context. Prioritize this information in your answers:\n`);
    for (const c of singleton.ragChunks.slice(-12)) {
      parts.push(`--- from ${c.filename} ---\n${c.text.slice(0, 800)}`);
    }
  }
  return parts.join('\n');
}

/** Send a user message, stream the reply, return the full response text. */
export async function chatLlm({ modelId, message, onChunk, onStart }, signal) {
  const engine = await loadLlm(modelId);
  const model = LLM_CATALOG.find(m => m.id === modelId);
  const messages = [
    { role: 'system', content: buildSystemPrompt(model) },
    { role: 'user', content: message },
  ];
  let full = '';
  if (onStart) onStart();
  const chunks = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: model?.id === 'llama3.2-3b' ? 1024 : 512,
  });
  for await (const chunk of chunks) {
    if (signal?.aborted) break;
    const delta = chunk.choices?.[0]?.delta?.content || '';
    if (delta) {
      full += delta;
      if (onChunk) onChunk(delta, full);
    }
  }
  // Reset conversation each turn for v1 (stateless) to keep KV cache small on
  // low-RAM devices. We'll add persistent history next iteration.
  try { await engine.resetChat?.(); } catch {}
  return full;
}

// -------- RAG / dataset ingestion for v1 "training" --------

const CHUNK_SIZE = 600; // chars per chunk

function chunkText(text, filename) {
  const out = [];
  const clean = text.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < clean.length; i += CHUNK_SIZE) {
    out.push({ id: `${filename}-${i}`, filename, text: clean.slice(i, i + CHUNK_SIZE) });
  }
  return out;
}

function parseCsvToText(csvText) {
  // Simple CSV → text: join rows as readable lines. Users will mostly paste prose.
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  return lines.slice(0, 200).join('\n');
}

export async function addKnowledgeFile(file) {
  if (!singleton) throw new Error('Load a model first before adding documents.');
  const text = await file.text();
  const lower = file.name.toLowerCase();
  let processed = text;
  if (lower.endsWith('.csv')) processed = parseCsvToText(text);
  // .txt, .md, .json, .js are left as-is
  const chunks = chunkText(processed, file.name);
  singleton.ragChunks = [...singleton.ragChunks, ...chunks].slice(-200); // cap
  return { filename: file.name, chunks: chunks.length, total: singleton.ragChunks.length };
}

export function clearKnowledge() {
  if (singleton) singleton.ragChunks = [];
}

export function getKnowledgeFiles() {
  if (!singleton) return [];
  const byFile = new Map();
  for (const c of singleton.ragChunks) {
    const cur = byFile.get(c.filename) || { filename: c.filename, chunks: 0 };
    cur.chunks++; byFile.set(c.filename, cur);
  }
  return [...byFile.values()];
}
