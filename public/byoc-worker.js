/* eslint-disable */
// BYOC worker — runs claim/train/upload loop even when the UI tab is in the
// background on Android (workers don't get throttled the way the main thread
// does, and we hold a wake lock via the main thread while a job is running).
//
// Messages:
//   main -> worker: { type: 'start', apiUrl, token } | { type: 'stop' }
//                | { type: 'token', token }
//   worker -> main: { type: 'status', status, progress?, jobName? }
//                | { type: 'message', text }
//                | { type: 'needToken' }
//                | { type: 'trainText'|'trainVision', job, rows? }

let timer = null
let running = false
let apiUrl = null
let token = null
let lock = false
let trainingActive = false
let waitingForToken = null // {promise, resolveFn}

async function authHeaders() {
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
  self.postMessage({ type: 'needToken' })
  if (!waitingForToken) {
    let resolveFn
    const p = new Promise(resolve => { resolveFn = resolve })
    waitingForToken = { promise: p, resolve: () => { waitingForToken = null; resolveFn() } }
    // Safety timeout: don't hang forever
    setTimeout(() => { if (waitingForToken) waitingForToken.resolve() }, 10000)
  }
  await waitingForToken.promise
  return {
    'Authorization': `Bearer ${token || ''}`,
    'Content-Type': 'application/json'
  }
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

function parseCSV(text, textCol, labelCol) {
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

async function tick() {
  if (lock || !running || trainingActive) return
  lock = true
  try {
    const h = await authHeaders()
    const res = await fetch(`${apiUrl}/jobs/claim?platform=mobile`, { method: 'POST', headers: h })
    if (!res.ok) { lock = false; return }
    const { job } = await res.json()
    if (!job) { self.postMessage({ type: 'status', status: 'idle' }); lock = false; return }

    const isVision = job.project_id && job.type === 'vision'
    self.postMessage({ type: 'status', status: 'training', progress: 3, jobName: job.project_id })
    trainingActive = true

    if (isVision) {
      self.postMessage({ type: 'trainVision', job })
      return // lock held until visionDone/fail
    }

    const rows = parseCSV(decodeBase64(job.csv_data), job.text_column, job.label_column)
    self.postMessage({ type: 'trainText', job, rows })
    // lock held until textDone/fail
  } catch (e) {
    console.warn('[byoc-worker] tick error', e)
    lock = false
    trainingActive = false
  }
}

function releaseLockAfterTraining() {
  lock = false
  trainingActive = false
  // Kick next tick immediately so we don't wait a full 30s
  setTimeout(tick, 250)
}

self.onmessage = async (e) => {
  const msg = e.data || {}
  if (msg.type === 'start') {
    apiUrl = msg.apiUrl; token = msg.token
    if (!running) {
      running = true
      self.postMessage({ type: 'status', status: 'idle' })
      tick()
      timer = setInterval(tick, 150000)
    }
  } else if (msg.type === 'stop') {
    running = false
    trainingActive = false
    lock = false
    if (timer) { clearInterval(timer); timer = null }
    self.postMessage({ type: 'status', status: 'disabled' })
  } else if (msg.type === 'token') {
    token = msg.token
    if (waitingForToken) waitingForToken.resolve()
  } else if (msg.type === 'textDone') {
    const { jobId, result, error } = msg
    try {
      if (error) { await failJob(jobId, error) }
      else {
        const h = await authHeaders()
        const res = await fetch(`${apiUrl}/jobs/${jobId}/complete`, {
          method: 'POST', headers: h, body: JSON.stringify(result)
        })
        if (!res.ok) throw new Error(`complete failed ${res.status}`)
        self.postMessage({ type: 'message', text: `Training complete (${Math.round((result.accuracy||0)*100)}% accuracy).` })
      }
    } catch (err) {
      console.warn('[byoc-worker] textDone err', err)
    } finally {
      releaseLockAfterTraining()
    }
  } else if (msg.type === 'visionDone') {
    const { jobId, result, error } = msg
    try {
      if (error) { await failJob(jobId, error) }
      else {
        const h = await authHeaders()
        const res = await fetch(`${apiUrl}/jobs/${jobId}/complete`, {
          method: 'POST', headers: h, body: JSON.stringify(result)
        })
        if (!res.ok) throw new Error(`complete failed ${res.status}`)
        self.postMessage({ type: 'message', text: 'Vision model trained on-device.' })
      }
    } catch (err) {
      console.warn('[byoc-worker] visionDone err', err)
    } finally {
      releaseLockAfterTraining()
    }
  }
}
