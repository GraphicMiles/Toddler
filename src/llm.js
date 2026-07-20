/**
 * Toddler LLM Engine
 * 
 * Wraps @mlc-ai/web-llm for on-device LLM inference via WebGPU.
 * Lazy-loads the library so the main bundle stays small.
 */

let engine = null
let currentModelId = null
let loading = false
const listeners = new Set()

// ─── Model catalog (mirrors backend) ──────────────────────────────

export const LLM_MODELS = {
  'smollm2-360m': {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M',
    sizeMb: 150,
    minRamGb: 4,
    runsOn: ['mobile', 'desktop', 'cloud'],
  },
  'smollm2-1.7b': {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 1.7B',
    sizeMb: 900,
    minRamGb: 6,
    runsOn: ['desktop', 'cloud'],
  },
}

// ─── State ────────────────────────────────────────────────────────

export function onLlmState(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function emitState(state) {
  for (const cb of listeners) {
    try { cb(state) } catch {}
  }
}

export function getLlmState() {
  if (loading) return { status: 'loading', modelId: currentModelId }
  if (engine) return { status: 'ready', modelId: currentModelId }
  return { status: 'idle' }
}

// ─── WebGPU check ─────────────────────────────────────────────────

export async function hasWebGPU() {
  try {
    return 'gpu' in navigator
  } catch {
    return false
  }
}

// ─── Load model ───────────────────────────────────────────────────

export async function loadModel(modelKey) {
  if (engine && currentModelId === modelKey) return engine
  if (loading) throw new Error('Another model is loading')

  const modelInfo = LLM_MODELS[modelKey]
  if (!modelInfo) throw new Error(`Unknown model: ${modelKey}`)

  loading = true
  currentModelId = modelKey
  emitState({ status: 'loading', modelId: modelKey, progress: 0 })

  try {
    // Lazy-load web-llm (6MB chunk)
    const webllm = await import('@mlc-ai/web-llm')
    const { CreateMLCEngine } = webllm

    engine = await CreateMLCEngine(modelInfo.id, {
      initProgressCallback: (report) => {
        const pct = Math.round((report.progress || 0) * 100)
        emitState({ status: 'loading', modelId: modelKey, progress: pct })
      },
    })

    emitState({ status: 'ready', modelId: modelKey })
    return engine
  } catch (err) {
    engine = null
    currentModelId = null
    emitState({ status: 'error', error: err.message })
    throw err
  } finally {
    loading = false
  }
}

// ─── Stream completion ────────────────────────────────────────────

export async function streamCompletion(messages, onChunk, options = {}) {
  if (!engine) throw new Error('No model loaded. Call loadModel() first.')

  const chunks = []
  let fullText = ''

  const completion = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  })

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content || ''
    if (delta) {
      fullText += delta
      chunks.push(delta)
      onChunk?.(delta, fullText)
    }
  }

  return fullText
}

// ─── Simple completion (non-streaming) ────────────────────────────

export async function complete(messages, options = {}) {
  if (!engine) throw new Error('No model loaded')
  const response = await engine.chat.completions.create({
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  })
  return response.choices[0]?.message?.content || ''
}

// ─── Unload ───────────────────────────────────────────────────────

export async function unloadModel() {
  if (engine) {
    try { await engine.unload() } catch {}
    engine = null
    currentModelId = null
    emitState({ status: 'idle' })
  }
}
