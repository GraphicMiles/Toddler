/* eslint-disable */
// BYOC worker — runs claim/train/upload loop even when the UI tab is in the
// background on Android (workers don't get throttled the way the main thread
// does, and we hold a wake lock via the main thread while a job is running).
//
// Messages:
//   main -> worker: { type: 'start', apiUrl, token } | { type: 'stop' }
//   worker -> main: { type: 'status', status, progress?, jobName? }
//                | { type: 'message', text }
//                | { type: 'needToken' }

let timer = null
let running = false
let apiUrl = null
let token = null
let lock = false
let trainerModule = null // lazy-loaded textML / visionML
let importedTrainer = false

async function loadDeps() {
  if (importedTrainer) return
  // In worker we can't use static imports easily; importScripts works
  // but ESM modules in Vite dev need a workaround. We post a request to
  // the main thread to do the training if the worker can't import.
  importedTrainer = true
}

async function authHeaders() {
  if (!token) {
    // Ask main thread for a fresh token
    self.postMessage({ type: 'needToken' })
    // wait up to 5s
    await new Promise(r => setTimeout(r, 5000))
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

async function reportProgress(jobId, p) {
  const h = await authHeaders()
  try {
    await fetch(`${apiUrl}/jobs/${jobId}/progress`, {
      method: 'POST', headers: h, body: JSON.stringify({ progress: Math.round(p) })
    })
  } catch {}
  self.postMessage({ type: 'status', status: 'training', progress: Math.round(p), jobId })
}

async function completeJob(jobId, payload) {
  const h = await authHeaders()
  const res = await fetch(`${apiUrl}/jobs/${jobId}/complete`, {
    method: 'POST', headers: h, body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`complete failed ${res.status}`)
}

async function failJob(jobId, err) {
  const h = await authHeaders()
  try {
    await fetch(`${apiUrl}/jobs/${jobId}/fail`, {
      method: 'POST', headers: h, body: JSON.stringify({ error: String(err).slice(0, 500) })
    })
  } catch {}
  self.postMessage({ type: 'message', text: `Training error: ${err}` })
}

function decodeBase64(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

function parseCSV(text, textCol, labelCol) {
  // Tiny RFC4180-ish parser — supports commas, no quoted-newlines for speed.
  const lines = text.split(/\r?\n/).filter(l => l.length > 0)
  if (lines.length < 2) throw new Error('CSV has no rows')
  const headers = splitCSVLine(lines[0])
  const ti = headers.indexOf(textCol)
  const li = headers.indexOf(labelCol)
  if (ti < 0 || li < 0) throw new Error('Columns not found in CSV')
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i])
    const t = (cols[ti] || '').trim()
    const l = (cols[li] || '').trim()
    if (t && l) rows.push({ text: t, label: l })
  }
  return rows
}

function splitCSVLine(line) {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { q = !q; continue }
    if (c === ',' && !q) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur); return out
}

async function tick() {
  if (lock || !running) return
  lock = true
  try {
    const h = await authHeaders()
    const res = await fetch(`${apiUrl}/jobs/claim`, { method: 'POST', headers: h })
    if (!res.ok) { lock = false; return }
    const { job } = await res.json()
    if (!job) { self.postMessage({ type: 'status', status: 'idle' }); lock = false; return }

    const isVision = job.project_id && job.type === 'vision'
    self.postMessage({ type: 'status', status: 'training', progress: 3, jobName: job.project_id, kind: isVision ? 'vision' : 'text' })

    if (isVision) {
      // Vision jobs have image URLs zipped; defer to main thread which
      // already has TF.js MobileNet loaded (large bundle).
      self.postMessage({ type: 'trainVision', job })
      // main will call back with {type:'visionDone', jobId, ...} or {visionFailed}
      lock = false
      return
    }

    // Text job: decode CSV, train with textML via the main thread (worker
    // can't easily ESM-import textML when bundled by Vite without extra
    // config; so we ship training back to main and keep the poll loop here).
    const rows = parseCSV(decodeBase64(job.csv_data), job.text_column, job.label_column)
    self.postMessage({ type: 'trainText', job, rows })
    // Main thread will postText back when it's done.
    lock = false
  } catch (e) {
    console.warn('[byoc-worker] tick error', e)
    lock = false
  }
}

self.onmessage = async (e) => {
  const msg = e.data || {}
  if (msg.type === 'start') {
    apiUrl = msg.apiUrl; token = msg.token
    if (!running) {
      running = true
      self.postMessage({ type: 'status', status: 'idle' })
      // Kick immediately + every 30s
      tick()
      timer = setInterval(tick, 30000)
    }
  } else if (msg.type === 'stop') {
    running = false
    if (timer) { clearInterval(timer); timer = null }
    self.postMessage({ type: 'status', status: 'disabled' })
  } else if (msg.type === 'token') {
    token = msg.token
  } else if (msg.type === 'textDone') {
    const { jobId, result, error } = msg
    if (error) { await failJob(jobId, error) }
    else { await completeJob(jobId, result); self.postMessage({ type: 'message', text: `Training complete (${Math.round((result.accuracy||0)*100)}% accuracy).` }) }
  } else if (msg.type === 'visionDone') {
    const { jobId, result, error } = msg
    if (error) { await failJob(jobId, error) }
    else { await completeJob(jobId, result); self.postMessage({ type: 'message', text: 'Vision model trained on-device.' }) }
  }
}
