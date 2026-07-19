import React from 'react'
import { Download, Cpu, HardDrive, MemoryStick, CheckCircle2, Play, Send, Code2, ChevronRight, Smartphone, Zap, Loader2, Menu, X, Plus, Trash2, FolderOpen } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { auth, db } from './firebase'
import { signOut } from 'firebase/auth'
import { collection, query, where, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'react-hot-toast'
import { Haptics, ImpactStyle } from '@capacitor/haptics'


import { startTrainingForeground, stopTrainingForeground } from './nativeBridge'
import { ensureNotifyPermission, notifyTrainingComplete } from './notify'

import Onboarding from './Onboarding'

const vibrate = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style }).catch(() => {})
}

// Free-tier caps by device RAM
const FREE_TIER = { maxTextRows: 50000, maxVisionImages: 1000 }
function estimateTextRamMb(rows) { return Math.max(80, Math.round(rows * 0.02)) }
function canDeviceFit(ramGb, requiredMb) {
  const avail = Math.round((ramGb || 4) * 1024 * 0.45)
  return avail >= requiredMb
}

const PLATFORM_LABEL = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'Web'
const PLATFORM_DISPLAY = PLATFORM_LABEL === 'android' ? 'Android device' : PLATFORM_LABEL === 'ios' ? 'iOS device' : PLATFORM_LABEL === 'web' ? 'This browser' : `${PLATFORM_LABEL} device`

const fallbackModels = []; // Will be fetched from API in Phase 2

const chatableIds = new Set(fallbackModels.filter(m => m.task === 'text-classification' && m.hfId).map(m => m.id))
const hfIdFor = model => model.hfId || ({
  'sentiment-lite': 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  'toxicity-lite': 'Xenova/toxic-bert',
  'emotion-mini': 'Xenova/emotion',
}[model.id])

const formatRam = value => value >= 1024 ? `${(value / 1024).toFixed(1)} GB` : `${value} MB`

function statusColor(s) {
  if (s === 'trained') return 'var(--accent-lime)'
  if (s === 'failed') return 'var(--danger)'
  if (s === 'queued' || s === 'training' || s === 'device_training' || s === 'awaiting_device') return 'var(--accent-purple)'
  return 'var(--text-dim)'
}
function statusLabel(s) {
  if (s === 'trained') return 'Ready'
  if (s === 'queued' || s === 'training' || s === 'device_training' || s === 'awaiting_device') return 'Training…'
  if (s === 'failed') return 'Failed'
  return 'Draft'
}

function ChatPanel({ catalog, downloaded, activeChatModel, setActiveChatModel, chatHistory, testText, setTestText, testing, sendChat, onGoToZoo, llmState, onUploadDocs, onClearDocs, knowledgeFiles }) {
  const scrollRef = React.useRef(null)
  const fileRef = React.useRef(null)
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatHistory, testing, llmState?.progress])
  const chatable = catalog.filter(m =>
    (chatableIds.has(m.id) && downloaded.includes(m.id)) ||
    (m.task === 'chat' && (downloaded.includes(m.id) || (llmState?.ready && llmState.modelId === m.id)))
  )
  const activeModel = catalog.find(m => m.id === activeChatModel)
  const isLlm = activeModel?.task === 'chat'
  const loadingLlm = llmState?.loading && llmState?.modelId === activeChatModel
  if (!chatable.length) {
    return <div className="empty-panel"><Send size={28}/><h2>Chat with a model</h2>
      <p>Download a chat LLM (needs ≥4 GB RAM) or a text-classification model from the Model Zoo.</p>
      <button className="primary-button" onClick={onGoToZoo}>Browse Model Zoo</button></div>
  }
  return <div className="chat-panel">
    <div className="chat-model-picker">
      <label>MODEL</label>
      <select value={activeChatModel || ''} onChange={e => setActiveChatModel(e.target.value)}>
        {chatable.map(m => <option key={m.id} value={m.id}>{m.name}{m.task === 'chat' ? ' (LLM)' : ''}</option>)}
      </select>
    </div>
    {isLlm && <div className="chat-docs-bar">
      <small>{knowledgeFiles.length ? `${knowledgeFiles.length} doc(s) in memory` : 'No documents added'}</small>
      <button onClick={() => fileRef.current?.click()} className="chat-doc-btn">+ Add docs</button>
      <input ref={fileRef} type="file" accept=".txt,.csv,.md,.json,.js,.py" multiple hidden
        onChange={async e => { for (const f of Array.from(e.target.files || [])) await onUploadDocs(f); e.target.value = '' }} />
      {knowledgeFiles.length > 0 && <button onClick={onClearDocs} className="chat-doc-btn chat-doc-clear">Clear</button>}
    </div>}
    <div className="chat-history" ref={scrollRef}>
      {chatHistory.length === 0 && <div className="chat-empty">
        <p className="mobile-kicker">{isLlm ? 'LOCAL LLM' : 'LOCAL INFERENCE'}</p>
        <h3>{isLlm ? 'Talk to Toddler locally' : `Ask ${activeModel?.name} anything`}</h3>
        <small>{isLlm ? 'Runs entirely on your device via WebGPU. Add documents to "train" it on your data.' : 'Runs entirely on your device. No internet required after first load.'}</small>
      </div>}
      {chatHistory.map((m, i) => (
        <div key={m._id || i} className={`chat-msg ${m.role === 'user' ? 'chat-msg-user' : m.error ? 'chat-msg-error' : 'chat-msg-bot'}`}>
          {m.role === 'bot' && !m.error && m.streaming ? (
            <pre className="chat-stream">{m.text}<span className="chat-caret"/></pre>
          ) : m.role === 'bot' && !m.error ? (
            <><pre className="chat-bubble-text">{m.text}</pre>{m.modelName && <small>{m.latency ? `${m.latency}ms · ` : ''}{m.modelName}</small>}</>
          ) : m.role === 'bot' && m.error ? <span>{m.text}</span>
            : m.role === 'user' && <span>{m.text}</span>}
        </div>
      ))}
      {loadingLlm && <div className="chat-msg chat-msg-bot chat-msg-loading">
        <span className="chat-loading-text">Loading model… {Math.round((llmState.progress||0)*100)}% {llmState.text ? '· ' + llmState.text.slice(0,50) : ''}</span>
      </div>}
      {testing && !loadingLlm && <div className="chat-msg chat-msg-bot chat-msg-loading"><span className="dot-pulse"/></div>}
    </div>
    <form className="chat-input" onSubmit={e => { e.preventDefault(); sendChat() }}>
      <input type="text" value={testText} onChange={e => setTestText(e.target.value)}
        placeholder={testing || loadingLlm ? 'Thinking…' : isLlm ? `Message ${activeModel?.name.split(' ')[0]}…` : `Ask ${activeModel?.name}…`}
        disabled={testing || loadingLlm || !activeChatModel} />
      <button type="submit" disabled={testing || loadingLlm || !testText.trim() || !activeChatModel} aria-label="Send"><Send size={16}/></button>
    </form>
  </div>
}

// ---------- Sidebar: Projects list + current model settings ----------
function Sidebar({ projects, activeProjectId, onSelectProject, onNewProject, onDeleteProject,
                   downloaded, catalog, activeChatModel, onRemoveActiveModel,
                   onClose, isMobile, byocStatus, byocJobName, byocEnabled, onToggleByoc }) {
  const activeDownloaded = catalog.find(m => m.id === activeChatModel)
  return <aside className={`td-sidebar${isMobile ? ' td-sidebar-drawer' : ''}`}>
    <div className="td-sidebar-head">
      <div className="mobile-brand"><span className="mobile-mark"/> TODDLER</div>
      {isMobile && <button className="td-icon-btn" onClick={onClose} aria-label="Close menu"><X size={18}/></button>}
    </div>

    <div className="td-sidebar-section">
      <div className="td-section-label">
        <FolderOpen size={12}/> Projects
      </div>
      <div className="td-project-list">
        {projects.length === 0 && <div className="td-empty-note">No projects yet.</div>}
        {projects.map(p => (
          <button key={p.id}
            className={`td-project-item${p.id === activeProjectId ? ' active' : ''}`}
            onClick={() => { onSelectProject(p.id); onClose?.() }}>
            <div className="td-project-name">{p.name}</div>
            <div className="td-project-meta" style={{ color: statusColor(p.status) }}>{statusLabel(p.status)}</div>
          </button>
        ))}
      </div>
      <button className="td-btn td-btn-outline td-btn-block" onClick={() => { onNewProject(); onClose?.() }}>
        <Plus size={14}/> New Project
      </button>
    </div>

    <div className="td-sidebar-section">
      <div className="td-section-label"><Cpu size={12}/> Active Model</div>
      {activeDownloaded ? (
        <div className="td-model-card">
          <div className="td-model-name">{activeDownloaded.name}</div>
          <div className="td-model-meta">{activeDownloaded.type} · {Math.round((activeDownloaded.sizeMb || activeDownloaded.size/1024/1024) || 0)} MB</div>
          <button className="td-btn td-btn-ghost td-btn-sm" onClick={() => onRemoveActiveModel(activeDownloaded.id)}>
            <Trash2 size={12}/> Remove local copy
          </button>
        </div>
      ) : (
        <div className="td-empty-note">No active model. Download one from the Model Zoo.</div>
      )}
    </div>

    <div className="td-sidebar-section">
      <div className="td-section-label"><Zap size={12}/> Device Training</div>
      <label className="td-byoc-toggle">
        <input type="checkbox" checked={byocEnabled} onChange={e => onToggleByoc(e.target.checked)} />
        <span className="td-byoc-dot" style={{ background: byocEnabled ? '#c6ff33' : '#6f786c' }}/>
        <span className="td-byoc-text">
          {byocStatus === 'training' ? `Training${byocJobName ? ' ' + byocJobName.slice(0,10) : ''}` : byocEnabled ? 'Device ready' : 'Device idle'}
        </span>
      </label>
    </div>

    <div className="td-sidebar-footer">
      {activeProjectId && projects.find(p => p.id === activeProjectId) && (
        <button className="td-btn td-btn-danger td-btn-sm td-btn-block"
          onClick={() => onDeleteProject(activeProjectId)}>
          <Trash2 size={12}/> Delete active project
        </button>
      )}
      <button className="td-btn td-btn-ghost td-btn-block" onClick={() => signOut(auth)}>Log out</button>
    </div>
  </aside>
}

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
  const [catalog, setCatalog] = React.useState([...fallbackModels, ...LLM_CATALOG])
  const [datasets, setDatasets] = React.useState([])
  const [uploading, setUploading] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [profileOpen, setProfileOpen] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState(null)
  const [testText, setTestText] = React.useState('')
  const [testing, setTesting] = React.useState(false)
  const [activeChatModel, setActiveChatModel] = React.useState(null)
  const [chatHistory, setChatHistory] = React.useState([])
  const [showOnboarding, setShowOnboarding] = React.useState(false)
  const [projectsLoading, setProjectsLoading] = React.useState(true)
  const [projects, setProjects] = React.useState([])
  const [activeProjectId, setActiveProjectId] = React.useState(null)
  const projectsRef = React.useRef([])
  const classifiersRef = React.useRef({})
  const msgTimeoutRef = React.useRef(null)
  const [byocEnabled, setByocEnabled] = React.useState(() => localStorage.getItem('toddler-byoc') !== '0')
  const [byocStatus, setByocStatus] = React.useState('idle')
  const [byocJobName, setByocJobName] = React.useState('')
  const [byocProgress, setByocProgress] = React.useState(0)
  const byocWorkerRef = React.useRef(null)
  const [proPrompt, setProPrompt] = React.useState(null)

  const apiUrl = import.meta.env.VITE_API_URL

  const showMessage = React.useCallback((text, ms = 2500) => {
    setMessage(text)
    if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current)
    if (ms > 0) msgTimeoutRef.current = setTimeout(() => setMessage(''), ms)
  }, [])

  // ---------- Fetch user's Firestore projects ----------
  const [authReady, setAuthReady] = React.useState(false)
  React.useEffect(() => {
    if (auth.currentUser) { setAuthReady(true); return }
    const unsub = auth.onAuthStateChanged(u => setAuthReady(!!u))
    return unsub
  }, [])

  React.useEffect(() => {
    let cancelled = false
    let iv = null
    const fetchProjects = async () => {
      if (!auth.currentUser) return
      try {
        const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
        const snap = await getDocs(q)
        if (cancelled) return
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        const prev = projectsRef.current
        data.forEach(p => {
          if (p.status === 'trained') {
            const was = prev.find(pp => pp.id === p.id)
            if (was && was.status !== 'trained' && was.status !== 'failed') {
              const acc = typeof p.accuracy === 'number' ? ` (${Math.round(p.accuracy*100)}% accuracy)` : ''
              notifyTrainingComplete({ id: p.id, title: 'Toddler', body: `"${p.name || 'Model'}" ready${acc}.` }).catch(()=>{})
            }
          }
        })
        projectsRef.current = data
        setProjects(data)
        if (data.length) setActiveProjectId(prev => prev && data.find(p => p.id === prev) ? prev : data[0].id);
        else {
          setActiveProjectId(null);
          setShowOnboarding(true);
        }
        
        const anyTraining = data.some(p => ['queued','training','device_training','awaiting_device'].includes(p.status))
        if (iv) clearInterval(iv)
        iv = anyTraining ? setInterval(fetchProjects, 5000) : null
      } catch (e) { console.error(e) } finally { if (!cancelled) setProjectsLoading(false) }
    }
    fetchProjects()
    return () => { cancelled = true; if (iv) clearInterval(iv) }
  }, [authReady])

  const handleNewProject = () => setShowOnboarding(true)
  const handleOnboardingComplete = (p) => {
    setProjects(prev => [...prev, p])
    setActiveProjectId(p.id)
    setShowOnboarding(false)
    setTab('train')
    toast.success('Project created.')
    vibrate(ImpactStyle.Medium)
  }
  const handleDeleteProject = async (pid) => {
    if (!pid) return
    if (!window.confirm('Delete this project? This cannot be undone.')) return
    try {
      await deleteDoc(doc(db, 'projects', pid))
      const remaining = projects.filter(p => p.id !== pid)
      setProjects(remaining)
      setActiveProjectId(remaining[0]?.id || null)
      toast.success('Project deleted.')
      vibrate(ImpactStyle.Heavy)
    } catch { toast.error('Delete failed') }
  }

  React.useEffect(() => () => {
    if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current)
    if (byocWorkerRef.current) { byocWorkerRef.current.postMessage({type:'stop'}); byocWorkerRef.current.terminate(); byocWorkerRef.current = null }
    stopTrainingForeground().catch(() => {})
  }, [])

  React.useEffect(() => {
    if (authReady && auth.currentUser) ensureNotifyPermission().catch(() => {})
  }, [authReady])

  // ---- BYOC worker ----
  React.useEffect(() => {
    let cancelled = false
    let worker
    let cleanupRan = false
    const cleanup = () => {
      if (cleanupRan) return
      cleanupRan = true
      if (worker) { try { worker.postMessage({ type: 'stop' }) } catch {}; worker.terminate() }
      if (byocWorkerRef.current === worker) byocWorkerRef.current = null
      if (!cancelled) { setByocJobName(''); setByocProgress(0) }
      stopTrainingForeground().catch(() => {})
    }
    if (!byocEnabled) {
      setByocStatus('disabled'); setByocJobName(''); setByocProgress(0)
      if (byocWorkerRef.current) { byocWorkerRef.current.postMessage({type:'stop'}); byocWorkerRef.current.terminate(); byocWorkerRef.current = null }
      stopTrainingForeground().catch(() => {})
      return cleanup
    }
    if (!apiUrl || !authReady || !auth.currentUser) return cleanup
    const boot = async () => {
      try { worker = new Worker('/byoc-worker.js', { type: 'classic' }) } catch (e) { console.warn('BYOC worker failed to start', e); return }
      if (cancelled) { worker.terminate(); return }
      byocWorkerRef.current = worker
      const sendToken = async () => { try { const t = await auth.currentUser?.getIdToken(); if (t && !cancelled) worker.postMessage({ type: 'token', token: t }) } catch {} }
      sendToken()
      worker.onmessage = ev => {
        if (cancelled) return
        const msg = ev.data || {}
        if (msg.type === 'status') {
          setByocStatus(msg.status || 'idle')
          if (typeof msg.progress === 'number') setByocProgress(msg.progress)
          if (msg.jobName) setByocJobName(msg.jobName)
          if (msg.status === 'training') startTrainingForeground().catch(()=>{})
          else if (msg.status === 'idle' || msg.status === 'disabled') stopTrainingForeground().catch(()=>{})
        } else if (msg.type === 'message') {
          showMessage(msg.text, 4000)
          if (/training complete/i.test(msg.text || '')) notifyTrainingComplete({ id: 'byoc-'+Date.now(), title:'Toddler', body: msg.text }).catch(()=>{})
        } else if (msg.type === 'needToken') sendToken()
        else if (msg.type === 'trainText') runTextTraining(msg.job, msg.rows).then(()=>sendToken())
        else if (msg.type === 'trainVision') runVisionTraining(msg.job).then(()=>sendToken())
      }
      try {
        const token = await auth.currentUser.getIdToken()
        if (cancelled) { worker.terminate(); return }
        worker.postMessage({ type: 'start', apiUrl, token })
      } catch (e) { console.warn('BYOC boot failed', e) }
    }
    boot()
    return () => { cancelled = true; cleanup() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byocEnabled, apiUrl, authReady])

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(async user => {
      if (!user) return
      try { const t = await user.getIdToken(); byocWorkerRef.current?.postMessage({ type: 'token', token: t }) } catch {}
    })
    return unsub
  }, [])

  const runTextTraining = async (job, rows) => {
    const worker = byocWorkerRef.current
    try {
      const requiredMb = estimateTextRamMb(rows.length)
      if (rows.length > FREE_TIER.maxTextRows || !canDeviceFit(ram, requiredMb)) {
        worker.postMessage({ type: 'textDone', jobId: job.id, error: rows.length > FREE_TIER.maxTextRows ? `Too large (${rows.length} rows; cap ${FREE_TIER.maxTextRows}). Upgrade to Pro.` : `Your ${ram||4} GB device needs ~${requiredMb} MB training RAM. Upgrade to Pro.` })
        setProPrompt({ reason: 'text', rows: rows.length, requiredMb }); return
      }
      const result = trainTextModel(rows, async p => {
        try {
          const tok = await auth.currentUser?.getIdToken()
          await fetch(`${apiUrl}/jobs/${job.id}/progress`, { method:'POST', headers:{'Authorization':`Bearer ${tok||''}`,'Content-Type':'application/json'}, body: JSON.stringify({ progress: Math.round(p) }) })
        } catch {}
      })
      worker.postMessage({ type:'textDone', jobId:job.id, result:{ accuracy: result.accuracy, labels: result.labels, topFeatures: result.topFeatures, distribution: result.distribution, confusionMatrix: result.confusionMatrix, artifact: result.artifact } })
      showMessage(`Training complete (${Math.round(result.accuracy*100)}% accuracy)`, 4000)
    } catch (e) { worker.postMessage({ type:'textDone', jobId:job.id, error: String(e.message||e) }) }
    finally { stopTrainingForeground().catch(()=>{}) }
  }
  const runVisionTraining = async (job) => {
    const worker = byocWorkerRef.current
    try {
      worker.postMessage({ type:'visionDone', jobId:job.id, error:'Vision jobs require cloud training. Upgrade to Pro.' })
      setProPrompt({ reason:'vision' })
    } catch (e) { worker.postMessage({ type:'visionDone', jobId:job.id, error: String(e.message||e) }) }
  }

  React.useEffect(() => {
    setRam(navigator.deviceMemory ? Math.round(navigator.deviceMemory) : 4)
    if (apiUrl) fetch(`${apiUrl}/models`).then(r => r.ok ? r.json() : null).then(data => { if (data?.models) setCatalog([...data.models, ...LLM_CATALOG]) }).catch(()=>{})
    if (navigator.storage?.estimate) navigator.storage.estimate().then(({ quota, usage }) => setStorage({ quota, usage }))
    if (!apiUrl || !authReady || !auth.currentUser) return
    let cancelled = false
    ;(async () => { try { const token = await auth.currentUser.getIdToken(); if (!cancelled) loadDatasets(token) } catch {} })()
    return () => { cancelled = true }
  }, [apiUrl, authReady])

  const saveModels = next => { setDownloaded(next); localStorage.setItem('toddler-models', JSON.stringify(next)) }

  const downloadLlm = async model => {
    if (downloading === model.id) return
    setDownloading(model.id); setDownloadError(''); setFailedModel(null)
    try {
      await loadLlm(model.id, p => setDownloadProgress(Math.round((p||0)*100)))
      const saved = new Set(downloaded); saved.add(model.id); saveModels([...saved])
      setDownloadProgress(100); showMessage(`${model.name} ready.`, 3500)
      setChatHistory([]); setActiveChatModel(model.id); setTab('chat')
    } catch (error) { setDownloadError(error.message); setFailedModel(model) }
    finally { setDownloading(null); setDownloadProgress(0) }
  }

  const download = async model => {
    if (downloadLock.current.has(model.id)) return
    downloadLock.current.add(model.id)
    if (model.task === 'chat') { downloadLock.current.delete(model.id); return downloadLlm(model) }
    setDownloading(model.id); setDownloadProgress(0); setDownloadError(''); setFailedModel(null)
    try {
      if (!navigator.onLine) throw new Error('You are offline.')
      const url = model.downloadUrl || model.modelUrl
      if (!url) throw new Error('This model is not published yet.')
      const partialKey = `toddler-model-partial-${model.id}`
      const partial = null /* Phase 2: use Capacitor Filesystem */
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
          /* Phase 2: use Capacitor Filesystem */
          if (total) setDownloadProgress(Math.min(99, Math.round(received/total*100)))
        }
      } else { chunks.push(new Uint8Array(await response.arrayBuffer())); received += chunks[0].length }
      const blob = new Blob([base, ...chunks])
      /* Phase 2: use Capacitor Filesystem */
      /* Phase 2: use Capacitor Filesystem */
      setDownloadProgress(100)
      saveModels([...new Set([...downloaded, model.id])])
      if (model.task === 'text-classification') { setActiveChatModel(null); setTab('chat') } else setTab('train')
    } catch (error) { setDownloadError(error.message); setFailedModel(model) }
    finally { downloadLock.current.delete(model.id); setDownloading(null); setDownloadProgress(0) }
  }

  const loadDatasets = async token => {
    if (!apiUrl) return
    const r = await fetch(`${apiUrl}/datasets`, { headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) setDatasets((await r.json()).datasets || [])
  }

  const uploadDataset = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!apiUrl) { showMessage('VITE_API_URL is not configured.'); return }
    setUploading(true); showMessage('Preparing upload…', 0)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Please sign in again.')
      const signedResponse = await fetch(`${apiUrl}/uploads/sign`, { method:'POST', headers:{ Authorization:`Bearer ${token}` } })
      const signed = await signedResponse.json()
      if (!signedResponse.ok || !signed.signature) throw new Error(signed.detail || 'Could not authorize upload.')
      const body = new FormData()
      body.append('file', file); body.append('api_key', signed.apiKey); body.append('timestamp', signed.timestamp)
      body.append('signature', signed.signature); body.append('folder', signed.folder)
      if (signed.uploadPreset) body.append('upload_preset', signed.uploadPreset)
      const upload = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/raw/upload`, { method:'POST', body })
      const result = await upload.json()
      if (!upload.ok || !result.secure_url) throw new Error(result.error?.message || 'Cloudinary upload failed.')
      const savedResponse = await fetch(`${apiUrl}/datasets`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ name: file.name, publicId: result.public_id, secureUrl: result.secure_url, bytes: file.size, format: file.type || 'application/octet-stream' }) })
      const saved = await savedResponse.json()
      if (!savedResponse.ok) throw new Error(saved.detail || 'Could not save dataset metadata.')
      setDatasets(current => [saved.dataset || { id: saved.id, name: file.name, sizeBytes: file.size }, ...current])
      showMessage(`${file.name} uploaded.`)
    } catch (error) { showMessage(error.message, 5000) } finally { setUploading(false); event.target.value = '' }
  }

  const availableRam = (ram || 4) * 1024 * .45
  const modelRam = m => Number(m.ram ?? m.trainingRamMb ?? m.inferenceRamMb ?? 0)
  const modelSize = m => {
    const mb = Number(m.size ?? m.sizeMb ?? 0); if (mb) return mb
    const bytes = Number(m.sizeBytes ?? 0); return bytes ? Math.round(bytes/1048576) : 0
  }
  const freeStorageMb = storage ? (storage.quota - storage.usage)/1048576 : 10240
  const isPublished = m => !!(m.downloadUrl || m.modelUrl || m.task === 'chat') && (m.status === 'published' || m.status == null)
  const canDownload = m => isPublished(m) && modelSize(m) <= freeStorageMb
  const modelUnavailableReason = m => {
    if (m.task === 'chat' && !isWebGpuAvailable()) return 'Needs WebGPU (recent Chrome).'
    if (m.minRamGb && (ram||4) < m.minRamGb) return `Needs ≥${m.minRamGb} GB RAM`
    return null
  }
  const canFit = m => modelRam(m) <= availableRam && canDownload(m) && !modelUnavailableReason(m)
  const recommended = catalog.filter(canFit)
  const baseList = category === 'Recommended' ? recommended
    : category === 'Downloaded' ? catalog.filter(m => downloaded.includes(m.id) || (m.task === 'chat' && llmReadyModels.has(m.id)))
    : category === 'All' ? catalog
    : category === 'Chat' || category === 'LLM' ? catalog.filter(m => m.task === 'chat')
    : category === 'Vision' ? catalog.filter(m => /image|vision/i.test(m.type || ''))
    : category === 'Detection' ? catalog.filter(m => /detection|pose|face/i.test(m.type || ''))
    : category === 'Embeddings' ? catalog.filter(m => /embedding/i.test(m.type || ''))
    : catalog.filter(m => (m.type||'').toLowerCase().includes(category.toLowerCase()))

  const [llmState, setLlmState] = React.useState({ ready:false, loading:false, modelId:null, progress:0, text:'' })
  const llmReadyModels = React.useMemo(() => new Set(llmState.ready && llmState.modelId ? [llmState.modelId] : []), [llmState])
  React.useEffect(() => onLlmState(setLlmState), [])

  const removeModel = async id => {
    const m = catalog.find(c => c.id === id)
    if (m?.task === 'chat') {
      try { await unloadLlm() } catch {}
      clearKnowledge()
      if (activeChatModel === id) { setActiveChatModel(null); setChatHistory([]) }
    } else {
      /* Phase 2: use Capacitor Filesystem */
      /* Phase 2: use Capacitor Filesystem */
      delete classifiersRef.current[id]
    }
    saveModels(downloaded.filter(item => item !== id))
  }
  const deleteAccount = async () => {
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return
    if (!apiUrl) { showMessage('Server not configured.'); return }
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Please sign in again.')
      const r = await fetch(`${apiUrl}/account`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } })
      if (!r.ok) throw new Error('Account deletion failed.')
      await signOut(auth)
    } catch (error) { showMessage(error.message, 4000) }
  }

  React.useEffect(() => {
    const chatable = catalog.filter(m =>
      (chatableIds.has(m.id) && downloaded.includes(m.id)) ||
      (m.task === 'chat' && (downloaded.includes(m.id) || (llmState.ready && llmState.modelId === m.id))))
    if (!chatable.length) { if (!llmState.loading) { setActiveChatModel(null); setChatHistory([]) }; return }
    if (!activeChatModel || !chatable.find(m => m.id === activeChatModel)) {
      const llms = chatable.filter(m => m.task === 'chat').sort((a,b)=>(b.minRamGb||0)-(a.minRamGb||0))
      setActiveChatModel((llms[0] || chatable[0]).id)
    }
  }, [downloaded, catalog, activeChatModel, llmState])

  const sendChat = async () => {
    const text = testText.trim()
    if (!text || testing) return
    const modelId = activeChatModel
    if (!modelId) return
    
    // In Phase 2, catalog is dynamic, but we just need an ID to route to the proxy
    setTestText('')
    setTesting(true)
    const started = performance.now()
    setChatHistory(h => [...h, { role:'user', text }])
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const formData = new FormData();
      formData.append('project_id', modelId);
      formData.append('text', text);
      
      const response = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Backend inference proxy failed");
      const result = await response.json();
      
      setChatHistory(h => [...h, { role:'bot', text:`${result.prediction}  (${Math.round((result.confidence||0)*100)}%)`, modelName:'Remote Model', latency: Math.round(performance.now()-started) }])
    } catch (error) {
      setChatHistory(h => [...h, { role:'bot', text:`Error: ${error.message||error}`, error:true }])
    } finally { setTesting(false) }
  }

  const handleUploadDocs = async (file) => {
    try { throw new Error("RAG Document Upload moved to Phase 2 (Backend Proxy)"); showMessage(`Added ${res.filename} (${res.chunks} chunks)`, 2500); setChatHistory(h=>[...h]) }
    catch (err) { showMessage(err.message||'Failed to read document', 3000) }
  }
  const handleClearDocs = () => { clearKnowledge(); showMessage('Documents cleared.', 2000); setChatHistory(h=>[...h]) }
  const knowledgeFiles = []

  const sidebarProps = {
    projects, activeProjectId,
    onSelectProject: setActiveProjectId,
    onNewProject: handleNewProject,
    onDeleteProject: handleDeleteProject,
    downloaded, catalog, activeChatModel,
    onRemoveActiveModel: removeModel,
    byocStatus, byocJobName, byocEnabled,
    onToggleByoc: (on) => { localStorage.setItem('toddler-byoc', on?'1':'0'); setByocEnabled(on); if (on) showMessage('Device training enabled.', 3000) },
  }

  if (projectsLoading) {
    return (
      <div style={{minHeight: '100vh', backgroundColor: '#14130F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: '32px', height: '32px', border: '3px solid #C6FF33', borderTopColor: 'transparent', borderRadius: '50%'}} className="animate-spin"></div>
      </div>
    );
  }

  if (showOnboarding || projects.length === 0) return <Onboarding onComplete={handleOnboardingComplete} />

  return <div className="mobile-app td-split-layout">
    {/* Desktop sidebar (persistent) */}
    <div className="td-sidebar-desktop">
      <Sidebar {...sidebarProps} isMobile={false} onClose={()=>{}}/>
    </div>

    {/* Mobile drawer */}
    {sidebarOpen && <>
      <div className="drawer-backdrop" onClick={()=>setSidebarOpen(false)}/>
      <Sidebar {...sidebarProps} isMobile={true} onClose={()=>setSidebarOpen(false)}/>
    </>}

    {/* Profile drawer (account settings) */}
    {profileOpen && <>
      <div className="drawer-backdrop" onClick={()=>setProfileOpen(false)}/>
      <aside className="profile-drawer">
        <button className="drawer-close" onClick={()=>setProfileOpen(false)}>×</button>
        <div className="profile-avatar">{(auth.currentUser?.displayName || auth.currentUser?.email || 'U').charAt(0).toUpperCase()}</div>
        <h2>{auth.currentUser?.displayName || 'Toddler user'}</h2>
        <p>{auth.currentUser?.email || 'Signed-in account'}</p>
        <div className="drawer-section"><span>ACCOUNT</span>
          <button className="drawer-link" onClick={()=>showMessage('Profile settings coming soon.')}>Profile settings <ChevronRight size={14}/></button>
          <button className="drawer-link" onClick={()=>{setProfileOpen(false); setTab('dev')}}>Developer settings <ChevronRight size={14}/></button>
        </div>
        <div className="drawer-danger"><span>DANGER ZONE</span>
          <button onClick={deleteAccount}>Delete account</button>
        </div>
        <button className="drawer-logout" onClick={()=>signOut(auth)}>Log out</button>
      </aside>
    </>}

    {selectedModel && <div className="model-modal-backdrop" onClick={()=>setSelectedModel(null)}>
      <section className="model-modal" onClick={e=>e.stopPropagation()}>
        <button className="drawer-close" onClick={()=>setSelectedModel(null)}>×</button>
        <p className="mobile-kicker">MODEL DETAILS</p>
        <h2>{selectedModel.name}</h2>
        <p className="mobile-muted">{selectedModel.description}</p>
        <div className="detail-grid">
          <span>Task<b>{selectedModel.type}</b></span>
          <span>Format<b>{selectedModel.format || 'ONNX'}</b></span>
          <span>Size<b>{modelSize(selectedModel)} MB</b></span>
          <span>Parameters<b>{selectedModel.params || `${(selectedModel.parameterCount||0)/1000000}M`}</b></span>
          <span>Training RAM<b>{formatRam(modelRam(selectedModel))}</b></span>
          <span>License<b>{selectedModel.license || 'Apache-2.0'}</b></span>
        </div>
        <button className="primary-button" disabled={downloaded.includes(selectedModel.id) || !canFit(selectedModel) || !isPublished(selectedModel)}
          onClick={()=>{ setSelectedModel(null); download(selectedModel) }}>
          {downloaded.includes(selectedModel.id) ? 'Downloaded' : !isPublished(selectedModel) ? 'Coming soon' : canFit(selectedModel) ? 'Download model' : 'Not compatible'}
        </button>
      </section>
    </div>}

    {/* Main work area */}
    <main className="td-main">
      <header className="mobile-header td-main-header">
        <div className="td-header-left">
          <button className="td-icon-btn td-menu-btn" onClick={()=>setSidebarOpen(true)} aria-label="Open menu"><Menu size={18}/></button>
          <div className="td-current-project">
            {activeProjectId && projects.find(p=>p.id===activeProjectId) ? (
              <>
                <span className="td-kicker">PROJECT</span>
                <span className="td-project-title">{projects.find(p=>p.id===activeProjectId).name}</span>
              </>
            ) : (
              <>
                <span className="td-kicker">WORKSPACE</span>
                <span className="td-project-title">Toddler</span>
              </>
            )}
          </div>
        </div>
        <div className="mobile-header-actions">
          <label className="byoc-pill" title={byocEnabled ? 'Device helping train free-tier models' : 'Tap to enable device training'}>
            <input type="checkbox" checked={byocEnabled} onChange={e=>{const on=e.target.checked; localStorage.setItem('toddler-byoc',on?'1':'0'); setByocEnabled(on); if(on)showMessage('Device training enabled.',3000)}} style={{display:'none'}}/>
            {byocStatus==='training' ? <Loader2 size={12} className="spin"/> : <span className="online-dot" style={{background: byocEnabled?'#c6ff33':'#6f786c'}}/>}
            {byocStatus==='training' ? `TRAINING ${byocProgress}%` : byocEnabled ? 'READY' : 'IDLE'}
          </label>
          <button className="profile-button" onClick={()=>setProfileOpen(true)} aria-label="Profile">
            {(auth.currentUser?.displayName || auth.currentUser?.email || 'U').charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <div className="mobile-main td-main-body">
        <section className="mobile-welcome">
          <div>
            <p className="mobile-kicker">LOCAL AI WORKSPACE</p>
            <h1>Train on your device.</h1>
            <p className="mobile-muted">Small models, private data, no cloud required.</p>
          </div>
          <div className="device-card">
            <Smartphone size={18}/><strong>{ram || '—'} GB RAM</strong><span>{PLATFORM_DISPLAY}</span>
          </div>
        </section>

        <section className="device-stats">
          <div><MemoryStick size={15}/><span>RAM</span><b>{ram || '—'} GB</b></div>
          <div><HardDrive size={15}/><span>STORAGE</span><b>{storage ? `${Math.round((storage.quota-storage.usage)/1e9)} GB free` : 'Checking'}</b></div>
          <div><Cpu size={15}/><span>MODE</span><b>{ram && ram<=2 ? 'Low memory' : 'Mobile'}</b></div>
        </section>

        <nav className="mobile-tabs">
          {[['zoo','Model Zoo',Zap],['train','Train',Play],['chat','Chat',Send],['dev','Dev',Code2]].map(([id,label,Icon]) =>
            <button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}
        </nav>

        {proPrompt && <div className="pro-upsell">
          <div><b>Device can't run this job.</b>
            <small>{proPrompt.reason==='vision' ? 'Vision BYOC jobs need cloud training.' : `Requires ~${proPrompt.requiredMb} MB training RAM.`}</small>
          </div>
          <button className="small-button" onClick={()=>window.open('https://toddler.ai/pricing','_blank')}>Upgrade to Pro</button>
          <button className="model-delete" onClick={()=>setProPrompt(null)}>Dismiss</button>
        </div>}

        {downloadError && <div className="download-error">
          <span>{downloadError}</span>
          {failedModel && <button className="retry-download" onClick={()=>download(failedModel)}>Continue download</button>}
        </div>}

        {tab === 'zoo' && <>
          <div className="section-heading">
            <div><p className="mobile-kicker">MODEL ZOO</p><h2>Recommended for you</h2></div>
            <span className="model-count">{recommended.length} compatible</span>
          </div>
          <div className="model-filters">{['All','Chat','Text','Vision','Detection','Embeddings','Recommended','Downloaded'].map(item =>
            <button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}
          </div>
          <div className="model-list">
            {baseList.map(model => {
              const isDownloaded = downloaded.includes(model.id); const fits = canFit(model)
              return <article className={`model-card${!fits?' disabled':''}`} key={model.id}>
                <button className="model-icon model-info-trigger" style={{color:model.color}} onClick={()=>setSelectedModel(model)} aria-label={`View ${model.name}`}><Zap size={19}/></button>
                <div className="model-info" onClick={()=>setSelectedModel(model)}>
                  <div className="model-title"><h3>{model.name}</h3>{isDownloaded && <CheckCircle2 size={16} className="success"/>}</div>
                  <p>{model.type}</p>
                  <small>{model.description}</small>
                  <div className="model-meta"><span>{modelSize(model)} MB</span><span>{model.params||`${(model.parameterCount||0)/1000000}M`} params</span><span>~{formatRam(modelRam(model))} RAM</span></div>
                  <div className="model-compatibility">
                    {fits ? `✓ Fits your ${ram||4} GB device` : modelUnavailableReason(model) || (modelRam(model)>availableRam ? `Needs ${formatRam(modelRam(model))} RAM` : `Needs ${modelSize(model)} MB storage`)}
                  </div>
                </div>
                <button className="model-action" disabled={isDownloaded || downloading===model.id || !fits || !isPublished(model)} onClick={()=>download(model)}>
                  {isDownloaded ? (model.task==='chat'?'Ready':'Downloaded')
                    : downloading===model.id ? `Downloading ${downloadProgress}%…`
                    : !isPublished(model) ? 'Coming soon'
                    : fits ? <><Download size={15}/> {model.task==='chat'?'Download LLM':'Download'}</>
                    : 'Not compatible'}
                </button>
                {isDownloaded && <button className="model-delete" onClick={()=>removeModel(model.id)}>Remove local copy</button>}
              </article>
            })}
          </div>
        </>}

        {tab === 'train' && <div className="empty-panel">
          <Play size={28}/><h2>Training & Datasets</h2>
          {downloaded.length ? <>
            <div className="downloaded-list">
              {catalog.filter(m=>downloaded.includes(m.id)).map(m =>
                <div className="downloaded-row" key={m.id}>
                  <div><b>{m.name}</b><span>{modelSize(m)} MB · ready to train</span></div>
                  <label className="small-button">{uploading?'Uploading…':'Upload dataset'}<input type="file" accept=".csv,.json" hidden disabled={uploading} onChange={uploadDataset}/><ChevronRight size={14}/></label>
                </div>)}
            </div>
            {message && <p className="upload-message">{message}</p>}
            {datasets.length>0 && <div className="downloaded-list">
              <p className="mobile-kicker">UPLOADED DATASETS</p>
              {datasets.map(ds =>
                <div className="downloaded-row" key={ds.id}>
                  <div><b>{ds.name}</b><span>{Math.round((ds.sizeBytes||ds.bytes||0)/1024)} KB · uploaded</span></div>
                  <button className="small-button" disabled title="On-device training coming soon">Coming soon <ChevronRight size={14}/></button>
                </div>)}
            </div>}
            {activeProjectId && <div className="downloaded-list" style={{marginTop: 20}}>
              <p className="mobile-kicker">ACTIVE PROJECT</p>
              <div className="downloaded-row">
                <div>
                  <b>{projects.find(p=>p.id===activeProjectId)?.name}</b>
                  <span>Status: {statusLabel(projects.find(p=>p.id===activeProjectId)?.status)}</span>
                </div>
                <button className="small-button" onClick={handleNewProject}><Plus size={12}/> New</button>
              </div>
            </div>}
          </> : <>
            <p>Download a model from the Model Zoo to start training locally.</p>
            <button className="primary-button" onClick={()=>setTab('zoo')}>Browse Model Zoo</button>
          </>}
        </div>}

        {tab === 'chat' && <ChatPanel
          catalog={catalog} downloaded={downloaded}
          activeChatModel={activeChatModel} setActiveChatModel={setActiveChatModel}
          chatHistory={chatHistory} testText={testText} setTestText={setTestText} testing={testing}
          sendChat={sendChat} onGoToZoo={()=>setTab('zoo')} llmState={llmState}
          onUploadDocs={handleUploadDocs} onClearDocs={handleClearDocs} knowledgeFiles={knowledgeFiles}
        />}

        {tab === 'dev' && <div className="empty-panel dev-panel">
          <Code2 size={28}/><h2>Build with your models</h2>
          <p>Use the local API to call models running on this device.</p>
          <pre id="toddler-dev-snippet">{`fetch('http://localhost:8787/predict', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ text })\n}).then(r => r.json()).then(console.log)`}</pre>
          <button className="small-button" onClick={()=>{
            const el=document.getElementById('toddler-dev-snippet');
            if (el && navigator.clipboard) navigator.clipboard.writeText(el.textContent||'');
            showMessage('Snippet copied.');
          }}>Copy snippet</button>
          {message && <p className="upload-message">{message}</p>}
        </div>}
      </div>
    </main>
  </div>
}
