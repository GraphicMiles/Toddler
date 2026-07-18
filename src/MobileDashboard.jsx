import React from 'react'
import { Download, Cpu, HardDrive, MemoryStick, CheckCircle2, Play, FlaskConical, Code2, ChevronRight, Smartphone, Zap, Loader2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { auth } from './firebase'
import { signOut } from 'firebase/auth'
import localforage from 'localforage'
import { trainTextModel } from './textML'
import { trainVisionModel } from './visionML'
import { startTrainingForeground, stopTrainingForeground } from './nativeBridge'

// Free-tier caps by device RAM (bytes). Users above cap get upsell unless
// their device can actually fit the training set.
const FREE_TIER = {
  maxTextRows: 50000,         // soft row cap for text
  maxVisionImages: 1000,      // hard image cap on free
  visionRamPerImageMb: 2.5,   // ~2.5 MB RAM per 224px MobileNet activation
}
function estimateTextRamMb(rows) { return Math.max(80, Math.round(rows * 0.02)) }
function estimateVisionRamMb(images) {
  return Math.max(200, Math.round(FREE_TIER.visionRamPerImageMb * images + 180))
}
function canDeviceFit(ramGb, requiredMb) {
  const avail = Math.round((ramGb || 4) * 1024 * 0.45)
  return avail >= requiredMb
}

const PLATFORM_LABEL = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'Web'
const PLATFORM_DISPLAY = PLATFORM_LABEL === 'android' ? 'Android device' : PLATFORM_LABEL === 'ios' ? 'iOS device' : PLATFORM_LABEL === 'web' ? 'This browser' : `${PLATFORM_LABEL} device`

const fallbackModels = [
  // ---------- TEXT ----------
  { id: 'sentiment-lite', name: 'Sentiment Lite', type: 'Text classification', sizeMb: 42, parameterCount: 1000000, trainingRamMb: 700, inferenceRamMb: 250, color: '#c6ff33', description: 'Fast positive, negative and neutral text predictions.', format: 'onnx', license: 'Apache-2.0', status: 'published', downloadUrl: 'https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/onnx/model_quantized.onnx' },
  { id: 'embed-mini', name: 'Embed Mini', type: 'Text embeddings', sizeMb: 86, parameterCount: 8000000, trainingRamMb: 1100, inferenceRamMb: 360, color: '#c084fc', description: 'Generate useful sentence vectors locally.', format: 'onnx', license: 'Apache-2.0', status: 'published', supportsTraining: false, downloadUrl: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx' },
  { id: 'toxicity-lite', name: 'Toxicity Lite', type: 'Text classification', sizeMb: 45, parameterCount: 1200000, trainingRamMb: 700, inferenceRamMb: 260, color: '#ff9b6a', description: 'Detect toxic, threatening or harassing text.', format: 'onnx', license: 'Apache-2.0', status: 'published', downloadUrl: 'https://huggingface.co/Xenova/toxic-bert/resolve/main/onnx/model_quantized.onnx' },
  { id: 'emotion-mini', name: 'Emotion Mini', type: 'Text classification', sizeMb: 42, parameterCount: 1000000, trainingRamMb: 700, inferenceRamMb: 250, color: '#60d6fa', description: 'Classify emotions: joy, anger, sadness, fear, surprise, love.', format: 'onnx', license: 'Apache-2.0', status: 'published', downloadUrl: 'https://huggingface.co/Xenova/emotion/resolve/main/onnx/model_quantized.onnx' },

  // ---------- VISION ----------
  { id: 'mobile-vision-v1', name: 'Vision Lite', type: 'Image classification', sizeMb: 4.3, parameterCount: 4200000, trainingRamMb: 620, inferenceRamMb: 180, color: '#60a5fa', description: 'Compact quantized MobileNet — 1000 ImageNet classes.', format: 'tflite', license: 'Apache-2.0', status: 'published', downloadUrl: 'https://storage.googleapis.com/download.tensorflow.org/models/tflite/mobilenet_v1_1.0_224_quant.tflite' },
  { id: 'mobilenet-v2-1.0', name: 'MobileNet V2', type: 'Image classification', sizeMb: 14, parameterCount: 3500000, trainingRamMb: 900, inferenceRamMb: 280, color: '#7df5a5', description: 'MobileNet V2 quantized — 1000 ImageNet classes, better accuracy.', format: 'tflite', license: 'Apache-2.0', status: 'published', downloadUrl: 'https://storage.googleapis.com/download.tensorflow.org/models/tflite_11_05_08/mobilenet_v2_1.0_224_quant.tgz' },
  { id: 'cocossd-mobilenet', name: 'Object Detector', type: 'Object detection', sizeMb: 27, parameterCount: 5000000, trainingRamMb: 1200, inferenceRamMb: 420, color: '#f9e264', description: 'Detect 80 object classes (COCO) — people, cars, animals, more.', format: 'tflite', license: 'Apache-2.0', status: 'published', supportsTraining: false, downloadUrl: 'https://storage.googleapis.com/tfjs-models/savedmodel/coco-ssd-mobilenet_v2/model.json' },
  { id: 'face-blaze', name: 'Face Detector', type: 'Face detection', sizeMb: 22, parameterCount: 1800000, trainingRamMb: 800, inferenceRamMb: 280, color: '#ffb2ef', description: 'Lightweight short-range face detector (BlazeFace).', format: 'tfjs', license: 'Apache-2.0', status: 'published', supportsTraining: false, downloadUrl: 'https://tfhub.dev/mediapipe/tfjs-model/blazeface/1/default/1/model.json' },
  { id: 'mobilenet-v3-small', name: 'MobileNet V3', type: 'Image classification', sizeMb: 11, parameterCount: 2500000, trainingRamMb: 700, inferenceRamMb: 220, color: '#c6ff33', description: 'MobileNet V3 Small — faster, more accurate than V1.', format: 'tflite', license: 'Apache-2.0', status: 'published', downloadUrl: 'https://storage.googleapis.com/download.tensorflow.org/models/tflite/mobilenet_v3_small_100_224_quant.tgz' },
  { id: 'pose-movenet-lightning', name: 'Pose Lightning', type: 'Pose estimation', sizeMb: 9, parameterCount: 3200000, trainingRamMb: 800, inferenceRamMb: 300, color: '#ff7d7d', description: 'Single-person 17-keypoint pose detection, real-time.', format: 'tflite', license: 'Apache-2.0', status: 'published', supportsTraining: false, downloadUrl: 'https://tfhub.dev/google/lite-model/movenet/singlepose/lightning/tflite/float16/4?lite-format=tflite' },
]

const formatRam = value => value >= 1024 ? `${(value / 1024).toFixed(1)} GB` : `${value} MB`

export default function MobileDashboard() {
  const [tab, setTab] = React.useState('zoo')
  const [downloaded, setDownloaded] = React.useState(() => JSON.parse(localStorage.getItem('toddler-models') || '[]'))
  const [downloading, setDownloading] = React.useState(null)
  const [category, setCategory] = React.useState('All')
  const [downloadProgress, setDownloadProgress] = React.useState(0)
  const [downloadError, setDownloadError] = React.useState('')
  const [failedModel, setFailedModel] = React.useState(null)
  const downloadLock = React.useRef(new Set())
  const [ram, setRam] = React.useState(null)
  const [storage, setStorage] = React.useState(null)
  const [catalog, setCatalog] = React.useState(fallbackModels)
  const [datasets, setDatasets] = React.useState([])
  const [uploading, setUploading] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerPage, setDrawerPage] = React.useState('home')
  const [selectedModel, setSelectedModel] = React.useState(null)
  const [testText, setTestText] = React.useState('')
  const [testResult, setTestResult] = React.useState(null)
  const [testing, setTesting] = React.useState(false)
  const msgTimeoutRef = React.useRef(null)
  const [byocEnabled, setByocEnabled] = React.useState(() => localStorage.getItem('toddler-byoc') !== '0')
  const [byocStatus, setByocStatus] = React.useState('idle') // idle|checking|training|disabled
  const [byocJobName, setByocJobName] = React.useState('')
  const [byocProgress, setByocProgress] = React.useState(0)
  const byocWorkerRef = React.useRef(null)
  const [proPrompt, setProPrompt] = React.useState(null) // {jobId, reason, requiredMb}

  const apiUrl = import.meta.env.VITE_API_URL

  const showMessage = React.useCallback((text, ms = 2500) => {
    setMessage(text)
    if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current)
    if (ms > 0) msgTimeoutRef.current = setTimeout(() => setMessage(''), ms)
  }, [])

  React.useEffect(() => () => {
    if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current)
    if (byocWorkerRef.current) { byocWorkerRef.current.postMessage({type:'stop'}); byocWorkerRef.current.terminate(); byocWorkerRef.current = null }
    stopTrainingForeground().catch(() => {})
  }, [])

  // ---- BYOC worker lifecycle ----
  React.useEffect(() => {
    if (!byocEnabled) {
      if (byocWorkerRef.current) { byocWorkerRef.current.postMessage({type:'stop'}); byocWorkerRef.current.terminate(); byocWorkerRef.current = null }
      setByocStatus('disabled'); setByocJobName(''); setByocProgress(0)
      stopTrainingForeground().catch(() => {})
      return
    }
    if (!apiUrl || !auth.currentUser) return
    let worker
    try {
      worker = new Worker('/byoc-worker.js', { type: 'classic' })
    } catch (e) {
      console.warn('BYOC worker failed to start', e); return
    }
    byocWorkerRef.current = worker

    const sendToken = async () => {
      try {
        const t = await auth.currentUser.getIdToken()
        worker.postMessage({ type: 'token', token: t })
      } catch {}
    }
    sendToken()
    worker.onmessage = async ev => {
      const msg = ev.data || {}
      if (msg.type === 'status') {
        setByocStatus(msg.status || 'idle')
        if (typeof msg.progress === 'number') setByocProgress(msg.progress)
        if (msg.jobName) setByocJobName(msg.jobName)
        if (msg.status === 'training') {
          startTrainingForeground().catch(() => {})
        } else if (msg.status === 'idle') {
          stopTrainingForeground().catch(() => {})
        }
      } else if (msg.type === 'message') {
        showMessage(msg.text, 4000)
        stopTrainingForeground().catch(() => {})
      } else if (msg.type === 'needToken') {
        sendToken()
      } else if (msg.type === 'trainText') {
        // Run text training on main thread (textML.js needs no WASM/TF)
        runTextTraining(msg.job, msg.rows).then(() => sendToken())
      } else if (msg.type === 'trainVision') {
        runVisionTraining(msg.job).then(() => sendToken())
      }
    }
    worker.postMessage({ type: 'start', apiUrl, token: await auth.currentUser.getIdToken() })
    return () => {
      worker.postMessage({ type: 'stop' })
      worker.terminate()
      byocWorkerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byocEnabled, apiUrl])

  // Refresh worker token when auth changes
  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(async user => {
      if (!user) return
      try {
        const t = await user.getIdToken()
        byocWorkerRef.current?.postMessage({ type: 'token', token: t })
      } catch {}
    })
    return unsub
  }, [])

  // ---- Train text on main thread (called by worker) ----
  const runTextTraining = async (job, rows) => {
    const worker = byocWorkerRef.current
    try {
      const requiredMb = estimateTextRamMb(rows.length)
      if (rows.length > FREE_TIER.maxTextRows || !canDeviceFit(ram, requiredMb)) {
        worker.postMessage({ type: 'textDone', jobId: job.id, error:
          rows.length > FREE_TIER.maxTextRows ? `Dataset too large for free tier (${rows.length} rows; cap ${FREE_TIER.maxTextRows}). Upgrade to Pro for cloud training.`
                                              : `Your ${ram||4} GB device needs ~${requiredMb} MB training RAM for this job. Upgrade to Pro for cloud training.` })
        setProPrompt({ reason: 'text', rows: rows.length, requiredMb })
        return
      }
      const result = trainTextModel(rows, p => {
        fetch(`${apiUrl}/jobs/${job.id}/progress`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${auth.currentUser.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: Math.round(p) })
        }).catch(() => {})
      })
      worker.postMessage({ type: 'textDone', jobId: job.id,
        result: { accuracy: result.accuracy, labels: result.labels, topFeatures: result.topFeatures,
                  distribution: result.distribution, confusionMatrix: result.confusionMatrix,
                  artifact: result.artifact } })
      showMessage(`Training complete (${Math.round(result.accuracy*100)}% accuracy)`, 4000)
    } catch (e) {
      worker.postMessage({ type: 'textDone', jobId: job.id, error: String(e.message || e) })
    } finally {
      stopTrainingForeground().catch(() => {})
    }
  }

  // ---- Train vision on main thread (TF.js MobileNet+KNN from visionML.js) ----
  const runVisionTraining = async (job) => {
    const worker = byocWorkerRef.current
    try {
      // Vision jobs store images as base64 or Cloudinary URLs. For now, BYOC vision
      // training is done via the onboarding vision flow (browser-side, during
      // upload). When a vision cloud job is queued by a mobile user, we
      // require Pro/cloud training since downloading 1000s of images to a
      // foreground service is unreliable on free-tier networks.
      worker.postMessage({ type: 'visionDone', jobId: job.id, error: 'Vision jobs require cloud training. Upgrade to Pro.' })
      setProPrompt({ reason: 'vision' })
    } catch (e) {
      worker.postMessage({ type: 'visionDone', jobId: job.id, error: String(e.message || e) })
    }
  }



  React.useEffect(() => {
    setRam(navigator.deviceMemory ? Math.round(navigator.deviceMemory) : 4)
    if (apiUrl) {
      fetch(`${apiUrl}/models`).then(r => r.ok ? r.json() : null).then(data => data?.models && setCatalog(data.models)).catch(() => {})
    }
    if (navigator.storage?.estimate) navigator.storage.estimate().then(({ quota, usage }) => setStorage({ quota, usage }))
    const tryLoadDatasets = async () => {
      try {
        if (!apiUrl || !auth.currentUser) return
        const token = await auth.currentUser.getIdToken()
        loadDatasets(token)
      } catch {}
    }
    tryLoadDatasets()
  }, [apiUrl])

  const saveModels = next => { setDownloaded(next); localStorage.setItem('toddler-models', JSON.stringify(next)) }
  const download = async model => {
    if (downloadLock.current.has(model.id)) return
    downloadLock.current.add(model.id)
    setDownloading(model.id); setDownloadProgress(0); setDownloadError(''); setFailedModel(null)
    try {
      if (!navigator.onLine) throw new Error('You are offline. Connect to the internet to download this model.')
      const url = model.downloadUrl || model.modelUrl
      if (!url) throw new Error('This model is not published for download yet.')
      if (model.downloadUrl || model.modelUrl) {
        const partialKey = `toddler-model-partial-${model.id}`
        const partial = await localforage.getItem(partialKey)
        const offset = partial instanceof Blob ? partial.size : 0
        const headers = offset ? { Range: `bytes=${offset}-` } : undefined
        const response = await fetch(url, { headers })
        if (!response.ok && response.status !== 206) throw new Error('Model download failed.')
        const resumed = offset > 0 && response.status === 206
        const base = resumed ? partial : new Blob([])
        const contentLength = Number(response.headers.get('content-length')) || 0
        const total = resumed ? offset + contentLength : contentLength
        const reader = response.body?.getReader(); const chunks = []; let received = offset
        if (reader) {
          while (true) {
            const part = await reader.read()
            if (part.done) break
            chunks.push(part.value); received += part.value.length
            await localforage.setItem(partialKey, new Blob([base, ...chunks]))
            if (total) setDownloadProgress(Math.min(99, Math.round(received / total * 100)))
          }
        } else { chunks.push(new Uint8Array(await response.arrayBuffer())); received += chunks[0].length }
        const blob = new Blob([base, ...chunks])
        const expectedBytes = Number(model.sizeBytes || 0)
        if (expectedBytes && blob.size < expectedBytes * 0.95) throw new Error('Download interrupted. Tap Continue download to resume.')
        await localforage.setItem(`toddler-model-${model.id}`, blob)
        await localforage.removeItem(partialKey)
        setDownloadProgress(100)
      }
      saveModels([...new Set([...downloaded, model.id])]); setTab('train')
    } catch (error) { setDownloadError(error.message); setFailedModel(model) } finally { downloadLock.current.delete(model.id); setDownloading(null); setDownloadProgress(0) }
  }

  const loadDatasets = async token => {
    if (!apiUrl) return
    const response = await fetch(`${apiUrl}/datasets`, { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) setDatasets((await response.json()).datasets || [])
  }

  const uploadDataset = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!apiUrl) { showMessage('VITE_API_URL is not configured.'); return }
    setUploading(true); showMessage('Preparing secure upload…', 0)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Please sign in again.')
      const signedResponse = await fetch(`${apiUrl}/uploads/sign`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const signed = await signedResponse.json()
      if (!signedResponse.ok || !signed.signature) throw new Error(signed.detail || 'Could not authorize upload.')
      const body = new FormData()
      body.append('file', file); body.append('api_key', signed.apiKey); body.append('timestamp', signed.timestamp)
      body.append('signature', signed.signature); body.append('folder', signed.folder)
      if (signed.uploadPreset) body.append('upload_preset', signed.uploadPreset)
      const upload = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/raw/upload`, { method: 'POST', body })
      const result = await upload.json()
      if (!upload.ok || !result.secure_url) throw new Error(result.error?.message || 'Cloudinary upload failed.')
      const savedResponse = await fetch(`${apiUrl}/datasets`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: file.name, publicId: result.public_id, secureUrl: result.secure_url, bytes: file.size, format: file.type || 'application/octet-stream' }) })
      const saved = await savedResponse.json()
      if (!savedResponse.ok) throw new Error(saved.detail || 'Could not save dataset metadata.')
      setDatasets(current => [saved.dataset || { id: saved.id, name: file.name, sizeBytes: file.size }, ...current])
      showMessage(`${file.name} uploaded and ready.`)
    } catch (error) { showMessage(error.message, 5000) } finally { setUploading(false); event.target.value = '' }
  }

  const availableRam = (ram || 4) * 1024 * .45
  const modelRam = model => Number(model.ram ?? model.trainingRamMb ?? model.inferenceRamMb ?? 0)
  const modelSize = model => {
    const mb = Number(model.size ?? model.sizeMb ?? 0)
    if (mb) return mb
    const bytes = Number(model.sizeBytes ?? 0)
    return bytes ? Math.round(bytes / 1048576) : 0
  }
  const freeStorageMb = storage ? (storage.quota - storage.usage) / 1048576 : 10240
  const isPublished = model => !!(model.downloadUrl || model.modelUrl) && (model.status === 'published' || model.status == null)
  const canDownload = model => isPublished(model) && modelSize(model) <= freeStorageMb
  const canFit = model => modelRam(model) <= availableRam && canDownload(model)
  const recommended = catalog.filter(canFit)
  const baseList = category === 'Recommended' ? recommended
                 : category === 'Downloaded' ? catalog.filter(m => downloaded.includes(m.id))
                 : category === 'All' ? catalog
                 : category === 'Vision' ? catalog.filter(m => /image|vision/i.test(m.type || ''))
                 : category === 'Detection' ? catalog.filter(m => /detection|pose|face/i.test(m.type || ''))
                 : catalog.filter(m => (m.type || '').toLowerCase().includes(category.toLowerCase()))
  const visibleModels = baseList

  const removeModel = async id => { await localforage.removeItem(`toddler-model-${id}`); saveModels(downloaded.filter(item => item !== id)) }
  const deleteAccount = async () => {
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return
    if (!apiUrl) { showMessage('Server not configured.'); return }
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Please sign in again.')
      const response = await fetch(`${apiUrl}/account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Account deletion failed.')
      await signOut(auth)
    } catch (error) { showMessage(error.message, 4000) }
  }

  const runTest = async () => {
    if (!testText.trim() || testing) return
    setTesting(true); setTestResult(null)
    const started = performance.now()
    try {
      const { pipeline, env } = await import('@huggingface/transformers')
      env.allowLocalModels = false; env.useBrowserCache = true
      const classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', { quantized: true })
      const output = await classifier(testText)
      const result = Array.isArray(output) ? output[0] : output
      setTestResult({ label: result.label, confidence: `${Math.round(result.score * 100)}%`, latency: `${Math.round(performance.now() - started)} ms` })
    } catch (error) { setTestResult({ label: 'Runtime unavailable', confidence: '—', latency: error.message }) }
    finally { setTesting(false) }
  }

  return <div className="mobile-app">
    <header className="mobile-header"><div className="mobile-brand"><span className="mobile-mark" /> TODDLER</div><div className="mobile-header-actions">
      <label className="byoc-pill" title={byocEnabled ? 'Your device is helping train free-tier models' : 'Tap to let your device train free-tier models'}>
        <input type="checkbox" checked={byocEnabled} onChange={e => { const on = e.target.checked; localStorage.setItem('toddler-byoc', on ? '1' : '0'); setByocEnabled(on); if (on) { showMessage('Device training enabled — will pick up jobs when idle.'); setTimeout(runByocTick, 500) } }} style={{display:'none'}} />
        {byocStatus === 'training' ? <Loader2 size={12} className="spin" /> : <span className="online-dot" style={{background: byocEnabled ? '#c6ff33' : '#6f786c'}} />}
        {byocStatus === 'training' ? `TRAINING ${byocProgress}%` : byocEnabled ? 'DEVICE READY' : 'DEVICE IDLE'}
      </label>
      <button className="profile-button" onClick={() => setDrawerOpen(true)} aria-label="Open profile menu">{(auth.currentUser?.displayName || auth.currentUser?.email || 'U').charAt(0).toUpperCase()}</button>
    </div></header>
    {drawerOpen && <><div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} /><aside className="profile-drawer"><button className="drawer-close" onClick={() => setDrawerOpen(false)}>×</button><div className="profile-avatar">{(auth.currentUser?.displayName || auth.currentUser?.email || 'U').charAt(0).toUpperCase()}</div><h2>{auth.currentUser?.displayName || 'Toddler user'}</h2><p>{auth.currentUser?.email || 'Signed-in account'}</p><div className="drawer-section"><span>PROJECT</span><b>Toddler workspace</b><button className="drawer-link" onClick={() => setDrawerPage('project')}>Project settings <ChevronRight size={14}/></button></div><div className="drawer-section"><span>ACCOUNT</span><button className="drawer-link" onClick={() => setDrawerPage('profile')}>Profile settings <ChevronRight size={14}/></button><button className="drawer-link" onClick={() => setDrawerPage('developer')}>Developer settings <ChevronRight size={14}/></button></div>{drawerPage !== 'home' && <div className="drawer-page"><button className="drawer-back" onClick={() => setDrawerPage('home')}>← Back to account</button>{drawerPage === 'project' && <><h3>Project settings</h3><label className="drawer-field">Project name<input defaultValue="Toddler workspace" /></label><button className="drawer-save" onClick={() => showMessage('Project settings saved locally.')}>Save changes</button></>}{drawerPage === 'profile' && <><h3>Profile settings</h3><label className="drawer-field">Display name<input defaultValue={auth.currentUser?.displayName || ''} /></label><button className="drawer-save" onClick={() => showMessage('Profile settings saved locally.')}>Save changes</button></>}{drawerPage === 'developer' && <><h3>Developer settings</h3><p className="drawer-note">Local API access is disabled by default. Enable it from the Dev tab when the local server is available.</p><button className="drawer-save" onClick={() => setTab('dev')}>Open Dev tab</button></>}</div>}
          <div className="drawer-danger"><span>DANGER ZONE</span><button onClick={() => showMessage('Use the web dashboard to manage projects.')}>Delete project</button><button onClick={deleteAccount}>Delete account</button></div><button className="drawer-logout" onClick={() => signOut(auth)}>Log out</button></aside></>}
    {selectedModel && <div className="model-modal-backdrop" onClick={() => setSelectedModel(null)}><section className="model-modal" onClick={event => event.stopPropagation()}><button className="drawer-close" onClick={() => setSelectedModel(null)}>×</button><p className="mobile-kicker">MODEL DETAILS</p><h2>{selectedModel.name}</h2><p className="mobile-muted">{selectedModel.description}</p><div className="detail-grid"><span>Task<b>{selectedModel.type}</b></span><span>Format<b>{selectedModel.format || 'ONNX'}</b></span><span>Size<b>{modelSize(selectedModel)} MB</b></span><span>Parameters<b>{selectedModel.params || `${(selectedModel.parameterCount || 0) / 1000000}M`}</b></span><span>Training RAM<b>{formatRam(modelRam(selectedModel))}</b></span><span>License<b>{selectedModel.license || 'Apache-2.0'}</b></span></div><button className="primary-button" disabled={downloaded.includes(selectedModel.id) || !canFit(selectedModel) || !isPublished(selectedModel)} onClick={() => { setSelectedModel(null); download(selectedModel) }}>{downloaded.includes(selectedModel.id) ? 'Downloaded' : !isPublished(selectedModel) ? 'Coming soon' : canFit(selectedModel) ? 'Download model' : 'Not compatible'}</button></section></div>}
    <main className="mobile-main">
      <section className="mobile-welcome"><div><p className="mobile-kicker">LOCAL AI WORKSPACE</p><h1>Train on your device.</h1><p className="mobile-muted">Small models, private data, no cloud required.</p></div><div className="device-card"><Smartphone size={18}/><strong>{ram || '—'} GB RAM</strong><span>{PLATFORM_DISPLAY}</span></div></section>
      <section className="device-stats"><div><MemoryStick size={15}/><span>RAM</span><b>{ram || '—'} GB</b></div><div><HardDrive size={15}/><span>STORAGE</span><b>{storage ? `${Math.round((storage.quota - storage.usage) / 1e9)} GB free` : 'Checking'}</b></div><div><Cpu size={15}/><span>MODE</span><b>{ram && ram <= 2 ? 'Low memory' : 'Mobile'}</b></div></section>
      <nav className="mobile-tabs">{[['zoo','Model Zoo',Zap],['train','Train',Play],['test','Test',FlaskConical],['dev','Dev',Code2]].map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16}/>{label}</button>)}</nav>

      {tab === 'zoo' && <><div className="section-heading"><div><p className="mobile-kicker">MODEL ZOO</p><h2>Recommended for you</h2></div><span className="model-count">{recommended.length} compatible</span></div><div className="model-filters">{['All','Text','Vision','Detection','Embeddings','Recommended','Downloaded'].map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>{proPrompt && <div className="pro-upsell"><div><b>Device can't run this job.</b><small>{proPrompt.reason === 'vision' ? 'Vision BYOC jobs need cloud training.' : `Requires ~${proPrompt.requiredMb} MB training RAM.`}</small></div><button className="small-button" onClick={() => window.open('https://toddler.ai/pricing','_blank')}>Upgrade to Pro</button><button className="model-delete" onClick={() => setProPrompt(null)}>Dismiss</button></div>}{downloadError && <div className="download-error"><span>{downloadError}</span>{failedModel && <button className="retry-download" onClick={() => download(failedModel)}>Continue download</button>}</div>}<div className="model-list">{visibleModels.map(model => { const isDownloaded = downloaded.includes(model.id); const fits = canFit(model); return <article className={`model-card ${!fits ? 'disabled' : ''}`} key={model.id}><button className="model-icon model-info-trigger" style={{ color: model.color }} onClick={() => setSelectedModel(model)} aria-label={`View ${model.name} details`}><Zap size={19}/></button><div className="model-info" onClick={() => setSelectedModel(model)}><div className="model-title"><h3>{model.name}</h3>{isDownloaded && <CheckCircle2 size={16} className="success"/>}</div><p>{model.type}</p><small>{model.description}</small><div className="model-meta"><span>{modelSize(model)} MB</span><span>{model.params || `${(model.parameterCount || 0) / 1000000}M`} params</span><span>~{formatRam(modelRam(model))} RAM</span></div><div className="model-compatibility">{fits ? `✓ Fits your ${ram || 4} GB device` : modelRam(model) > availableRam ? `Needs ${formatRam(modelRam(model))} RAM` : `Needs ${modelSize(model)} MB storage`}</div></div><button className="model-action" disabled={isDownloaded || downloading === model.id || !fits || !isPublished(model)} onClick={() => download(model)}>{isDownloaded ? 'Downloaded' : downloading === model.id ? `Downloading ${downloadProgress}%…` : !isPublished(model) ? 'Coming soon' : fits ? <><Download size={15}/> Download</> : 'Not compatible'}</button>{isDownloaded && <button className="model-delete" onClick={() => removeModel(model.id)}>Remove local copy</button>}</article>})}</div></>}

      {tab === 'train' && <div className="empty-panel"><Play size={28}/><h2>Your downloaded models</h2>{downloaded.length ? <><div className="downloaded-list">{catalog.filter(model => downloaded.includes(model.id)).map(model => <div className="downloaded-row" key={model.id}><div><b>{model.name}</b><span>{modelSize(model)} MB · ready to train</span></div><label className="small-button">{uploading ? 'Uploading…' : 'Upload dataset'}<input type="file" accept=".csv,.json" hidden disabled={uploading} onChange={uploadDataset}/><ChevronRight size={14}/></label></div>)}</div>{message && <p className="upload-message">{message}</p>}{datasets.length > 0 && <div className="downloaded-list"><p className="mobile-kicker">UPLOADED DATASETS</p>{datasets.map(dataset => <div className="downloaded-row" key={dataset.id}><div><b>{dataset.name}</b><span>{Math.round((dataset.sizeBytes || dataset.bytes || 0) / 1024)} KB · uploaded</span></div><button className="small-button" disabled title="On-device training is coming soon">Coming soon <ChevronRight size={14}/></button></div>)}</div>}</> : <><p>Download a model from the Model Zoo to start training locally.</p><button className="primary-button" onClick={() => setTab('zoo')}>Browse Model Zoo</button></>}</div>}
      {tab === 'test' && <div className="empty-panel"><FlaskConical size={28}/><h2>Test locally</h2><p>Try a downloaded text model on your device.</p>{downloaded.length ? <><textarea className="test-input" value={testText} onChange={event => setTestText(event.target.value)} placeholder="Type text to classify…"/><button className="primary-button" onClick={runTest}>{testing ? 'Loading model…' : 'Run test'}</button>{testResult && <div className="test-result"><b>{testResult.label}</b><span>Confidence: {testResult.confidence}</span><span>Latency: {testResult.latency}</span></div>}</> : <button className="primary-button" onClick={() => setTab('zoo')}>Choose a model</button>}</div>}
      {tab === 'dev' && <div className="empty-panel dev-panel"><Code2 size={28}/><h2>Build with your models</h2><p>Use the local API to call models running on this device.</p><pre id="toddler-dev-snippet">{`fetch('http://localhost:8787/predict', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ text })\n}).then(r => r.json()).then(console.log)`}</pre><button className="small-button" onClick={() => {
        const el = document.getElementById('toddler-dev-snippet');
        if (el && navigator.clipboard) navigator.clipboard.writeText(el.textContent || '');
        showMessage('Snippet copied.');
      }}>Copy snippet</button>{message && <p className="upload-message">{message}</p>}</div>}
    </main>
  </div>
}
