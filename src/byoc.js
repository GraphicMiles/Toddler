/**
 * BYOC Worker — runs in the background on the user's device.
 * Polls the backend for queued training jobs, claims them,
 * processes the dataset (RAG chunking), and marks them complete.
 */

import { auth } from './firebase'

const API = import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'
const POLL_INTERVAL = 30000 // 30 seconds

let timer = null
let running = false

async function getToken() {
  try { return await auth.currentUser?.getIdToken() } catch { return null }
}

async function apiPost(path, body) {
  const token = await getToken()
  if (!token) return null
  const fd = new FormData()
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null) fd.append(k, String(v))
  }
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: fd,
  })
  if (!res.ok) return null
  return res.json()
}

function chunkText(text, sourceName, chunkSize = 600, overlap = 100) {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/ +/g, ' ').trim()
  const chunks = []
  let start = 0
  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length)
    if (end < cleaned.length) {
      const bp = Math.max(cleaned.lastIndexOf('.', end), cleaned.lastIndexOf('\n', end))
      if (bp > start + chunkSize * 0.5) end = bp + 1
    }
    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 20) {
      chunks.push({ text: chunk, source: sourceName, index: chunks.length })
    }
    start = end - overlap
    if (start >= cleaned.length) break
  }
  return chunks
}

async function processJob(job) {
  const jobId = job.job_id || job.id
  const datasetUrl = job.dataset_url
  const projectId = job.project_id

  if (!datasetUrl || !projectId) return

  try {
    // 1. Download dataset
    const res = await fetch(datasetUrl)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const text = await res.text()

    // 2. Chunk
    const chunks = chunkText(text, 'dataset')
    const capped = chunks.slice(0, 200)

    // 3. Mark complete on backend
    await apiPost(`/jobs/${jobId}/complete`, {
      chunk_count: capped.length,
      chunks_json: JSON.stringify(capped),
    })

    // 4. Update the project in Firestore directly
    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('./firebase')
      await updateDoc(doc(db, 'projects', projectId), {
        status: 'trained',
        progress: 100,
        chunkCount: capped.length,
        ragChunks: capped,
        trainedAt: new Date(),
      })
    } catch (e) {
      console.warn('[BYOC] Firestore update failed:', e.message)
    }

    return true
  } catch (err) {
    console.warn('[BYOC] Job failed:', err.message)
    await apiPost(`/jobs/${jobId}/fail`, { error: err.message })
    return false
  }
}

async function tick() {
  if (!auth.currentUser) return
  try {
    const data = await apiPost('/jobs/claim', { platform: 'web' })
    if (data?.job) {
      console.log('[BYOC] Claimed job:', data.job.job_id || data.job.id)
      await processJob(data.job)
    }
  } catch (e) {
    console.warn('[BYOC] Tick error:', e.message)
  }
}

export function startBYOC() {
  if (running) return
  running = true
  console.log('[BYOC] Worker started, polling every', POLL_INTERVAL / 1000, 's')
  tick()
  timer = setInterval(tick, POLL_INTERVAL)
}

export function stopBYOC() {
  running = false
  if (timer) { clearInterval(timer); timer = null }
  console.log('[BYOC] Worker stopped')
}

export function isBYOCRunning() {
  return running
}
