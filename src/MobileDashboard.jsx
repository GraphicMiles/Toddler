import React from 'react'
import { Download, Cpu, HardDrive, MemoryStick, CheckCircle2, Play, Send, Code2, ChevronRight, Smartphone, Zap, Loader2, Menu, X, Plus, Trash2, FolderOpen, Unlink } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { auth, db } from './firebase'
import { signOut } from 'firebase/auth'
import { collection, query, where, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'react-hot-toast'
import { Haptics, ImpactStyle } from '@capacitor/haptics'


import { startTrainingForeground, stopTrainingForeground } from './nativeBridge'
import { ensureNotifyPermission, notifyTrainingComplete } from './notify'

import Onboarding from './Onboarding'

const trainTextModel = () => { throw new Error('Native training module pending Phase 2'); };
const loadLlm = async () => {};
const chatLlm = async () => {};
const unloadLlm = async () => {};
const isWebGpuAvailable = () => false;
const addKnowledgeFile = async () => {};
const clearKnowledge = () => {};
const getKnowledgeFiles = () => [];
const onLlmState = () => {};


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
function Sidebar({ currentProject, onDeleteProject, onClose, isMobile }) {
  const handleUnpair = async () => {
    if (!window.confirm('Unpair this device? You will be locked out and need a new pairing code to reconnect.')) return;
    try {
      await auth.signOut();
      if (isMobile) onClose?.();
    } catch (e) {
      toast.error('Failed to unpair');
    }
  };

  return (
    <aside className="td-sidebar td-sidebar-drawer flex flex-col h-full bg-[var(--surface-2)] w-64 border-r border-[var(--line)]">
      <div className="p-6 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)]">
        <div>
          <h2 className="text-xl font-display font-bold text-white">Toddler Worker</h2>
          <div className="text-[var(--accent-lime)] text-[10px] font-mono mt-1 flex items-center gap-2 tracking-widest uppercase">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-lime)] animate-pulse"></div> Online
          </div>
        </div>
        {isMobile && <button className="btn-ghost !p-2" onClick={onClose}><X size={20}/></button>}
      </div>

      <div className="p-6 border-b border-[var(--line)]">
        <div className="text-[10px] font-mono text-[var(--text-faint)] mb-3 uppercase tracking-wider">User Profile</div>
        <div className="font-bold text-sm text-[var(--text)] truncate">{auth.currentUser?.email || 'Worker Node'}</div>
        <button className="btn w-full mt-4 !border-[var(--danger)] !text-[var(--danger)] bg-transparent hover:!bg-[var(--danger)] hover:!text-white flex justify-center items-center gap-2 text-xs" onClick={handleUnpair}>
          <Unlink size={14} /> Unpair Device
        </button>
      </div>

      <div className="p-6 flex-grow">
        <div className="text-[10px] font-mono text-[var(--text-faint)] mb-4 uppercase tracking-wider">Project Settings</div>
        {currentProject ? (
          <div>
            <div className="font-bold text-sm text-[var(--text)] mb-4 truncate">{currentProject.name}</div>
            <button className="btn-ghost w-full !text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)]/10 flex justify-center items-center gap-2 text-xs" onClick={() => { onDeleteProject(currentProject.id); onClose?.(); }}>
              <Trash2 size={14} /> Delete Project
            </button>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-dim)] italic">No active project.</div>
        )}
      </div>
    </aside>
  );
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
  const [catalog, setCatalog] = React.useState([...fallbackModels])
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
    if (apiUrl) fetch(`${apiUrl}/models`).then(r => r.ok ? r.json() : null).then(data => { if (data?.models) setCatalog([...data.models]) }).catch(()=>{})
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

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const activeJobs = projects.filter(p => ['queued', 'training', 'device_training', 'awaiting_device'].includes(p.status));
  const finishedJobs = projects.filter(p => p.status === 'trained');

  if (projectsLoading) {
    return (
      <div style={{minHeight: '100vh', backgroundColor: '#14130F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: '32px', height: '32px', border: '3px solid #C6FF33', borderTopColor: 'transparent', borderRadius: '50%'}} className="animate-spin"></div>
      </div>
    );
  }

  if (projects.length === 0 && !showOnboarding) {
    return (
      <div className="mobile-app td-split-layout">
        <div className="td-sidebar-desktop">
          <Sidebar currentProject={currentProject} onDeleteProject={handleDeleteProject} isMobile={false} onClose={()=>{}}/>
        </div>
        {sidebarOpen && <>
          <div className="drawer-backdrop" onClick={()=>setSidebarOpen(false)}/>
          <Sidebar currentProject={currentProject} onDeleteProject={handleDeleteProject} isMobile={true} onClose={()=>setSidebarOpen(false)}/>
        </>}
        <main className="td-main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          <header className="dash-header p-6 flex flex-wrap justify-between items-center gap-4 bg-[var(--surface)] border-b border-[var(--line)]">
            <div className="md:hidden flex items-center gap-4 w-full">
              <button className="btn-ghost !px-2" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <h1 className="text-xl font-display font-bold flex-1">Toddler Control</h1>
            </div>
            <div className="hidden md:block">
              <h1 className="text-4xl font-display font-bold">Welcome to Toddler</h1>
            </div>
          </header>
          
          <div className="p-6 md:p-12 flex-grow overflow-y-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <p className="text-[var(--text-dim)]">Toddler trains AI models securely on your own hardware. The web app is just your control tower — connect a worker device or upload a dataset to get started.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 max-w-2xl">
              <div className="panel border border-[var(--line)] bg-[var(--surface-2)]">
                <h3 className="font-bold mb-2 text-[var(--accent-lime)]">1. Connect a Worker</h3>
                <p className="text-sm text-[var(--text-faint)] mb-4">Download the Toddler app on your phone or desktop to provide actual compute power.</p>
                <div className="flex gap-2 mb-4">
                  <a href="#" onClick={(e)=>{e.preventDefault(); alert("Android APK build coming in Phase 3!")}} className="btn-ghost flex-1 text-center border border-[var(--line)] py-2 text-xs font-mono no-underline hover:bg-[var(--line)]">📱 Android</a>
                  <a href="#" onClick={(e)=>{e.preventDefault(); alert("Desktop Agent coming in Phase 3!")}} className="btn-ghost flex-1 text-center border border-[var(--line)] py-2 text-xs font-mono no-underline hover:bg-[var(--line)]">💻 Mac/PC</a>
                </div>
                <div className="bg-[var(--bg)] p-4 border border-[var(--line)] text-center">
                  <div className="text-[10px] uppercase font-mono text-[var(--text-dim)] mb-1">Your Pairing Code</div>
                  <div className="text-2xl font-mono text-[var(--text)] tracking-widest">{auth.currentUser?.uid?.substring(0, 6).toUpperCase() || '749012'}</div>
                </div>
              </div>

              <div className="panel border border-[var(--line)] bg-[var(--surface-2)] flex flex-col">
                <h3 className="font-bold mb-2">2. Train a Model</h3>
                <p className="text-sm text-[var(--text-faint)] mb-6 flex-grow">Upload a CSV or image dataset. We'll add the job to your queue and push it to your connected devices.</p>
                <button className="btn btn-solid w-full" onClick={() => setShowOnboarding(true)}>
                  + Create Project
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="mobile-app td-split-layout">
        <div className="td-sidebar-desktop">
          <Sidebar currentProject={currentProject} onDeleteProject={handleDeleteProject} isMobile={false} onClose={()=>{}}/>
        </div>
        <main className="td-main-content overflow-y-auto">
           <Onboarding onComplete={handleOnboardingComplete} />
        </main>
      </div>
    );
  }

  return (
    <div className="mobile-app flex flex-col h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      {sidebarOpen && <>
        <div className="fixed inset-0 bg-black/80 z-40" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 z-50 transform transition-transform duration-300">
          <Sidebar currentProject={currentProject} onDeleteProject={handleDeleteProject} onClose={() => setSidebarOpen(false)} isMobile={true} />
        </div>
      </>}

      <header className="p-4 flex items-center justify-between bg-[var(--surface)] shrink-0">
        <div className="flex items-center gap-4">
          <button className="text-[var(--text-dim)] hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-lg font-display font-bold leading-none">Toddler Worker</h1>
            <div className="text-[var(--accent-lime)] text-[10px] font-mono mt-1 tracking-widest flex items-center gap-2 uppercase">
               <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)] animate-pulse"></div> Online
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full border-y border-[var(--line)] bg-[var(--surface)] shrink-0">
        {['Zoo', 'Training', 'Sandbox'].map(t => (
          <button 
            key={t} 
            onClick={() => setTab(t.toLowerCase())} 
            className={`flex-1 py-3 text-center font-mono text-xs uppercase transition-colors ${tab === t.toLowerCase() ? 'border-b-2 border-[var(--accent-lime)] text-[var(--accent-lime)] bg-[var(--surface-2)]' : 'text-[var(--text-dim)] border-b-2 border-transparent hover:text-[var(--text)]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <main className="flex-grow overflow-y-auto p-4 md:p-6 relative">
        {tab === 'zoo' && (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-lg mx-auto">
            <div>
              <h2 className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-widest mb-4">Recommended for your device</h2>
              <div className="grid grid-cols-1 gap-4">
                {catalog.slice(0, 3).map(model => (
                  <div key={model.id} className="panel border border-[var(--line)] bg-[var(--surface-2)] p-5 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg">{model.name}</h3>
                    </div>
                    <div className="text-xs text-[var(--text-dim)] mb-4 capitalize">{model.task === 'chat' ? 'Chat LLM' : model.type}</div>
                    
                    <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-faint)] mb-4">
                      <span>{model.sizeMb} MB</span>
                      <span>•</span>
                      <span>~{model.inferenceRamMb || 300} MB RAM req</span>
                    </div>
                    
                    <div className="text-[10px] font-mono text-[var(--accent-lime)] mb-5 flex items-center gap-2">
                      <CheckCircle2 size={12} /> Compatible with your device
                    </div>
                    
                    <button className="btn-ghost border border-[var(--line)] w-full text-xs font-mono uppercase hover:bg-[var(--line)] py-2" onClick={() => toast('Native downloads pending Phase 3')}>
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'training' && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-lg mx-auto">
            <div>
              <h2 className="text-[10px] font-mono text-[var(--accent-purple)] uppercase tracking-widest mb-4">Currently Training (Background)</h2>
              {activeJobs.length === 0 ? (
                <div className="text-sm text-[var(--text-faint)] italic panel bg-transparent border-dashed border-[var(--line)] text-center py-8">No active jobs in queue.</div>
              ) : (
                <div className="space-y-4">
                  {activeJobs.map(job => (
                    <div key={job.id} className="panel border border-[var(--accent-purple)] bg-[var(--surface-2)] p-5">
                      <h3 className="font-bold text-lg mb-1">{job.name}</h3>
                      <div className="text-xs text-[var(--text-dim)] mb-4 capitalize">{job.type} Model</div>
                      
                      <div className="w-full bg-[var(--bg)] h-2 rounded-full mb-3 overflow-hidden border border-[var(--line)]">
                        <div className="bg-[var(--accent-purple)] h-full transition-all duration-500" style={{ width: `${job.progress || 0}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-faint)] uppercase">
                        <span className="text-[var(--text)]">Progress: {job.progress || 0}%</span>
                        <button className="text-[var(--danger)] hover:underline" onClick={() => handleDeleteProject(job.id)}>Pause</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-widest mb-4">Finished on this device</h2>
              {finishedJobs.length === 0 ? (
                <div className="text-sm text-[var(--text-faint)] italic">No completed jobs yet.</div>
              ) : (
                <div className="space-y-4">
                  {finishedJobs.map(job => (
                    <div key={job.id} className="panel border border-[var(--line)] bg-[var(--surface-2)] p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm mb-1">{job.name}</h3>
                        <div className="text-xs text-[var(--text-dim)] capitalize">{job.type} • {((job.accuracy||0)*100).toFixed(0)}% Acc</div>
                      </div>
                      <button 
                        className="btn-ghost text-[var(--text)] text-[10px] font-mono border border-[var(--line)] px-3 py-2 hover:bg-[var(--line)] transition-colors uppercase tracking-wider"
                        onClick={() => { setActiveProjectId(job.id); setTab('sandbox'); }}
                      >
                        TEST ↗
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'sandbox' && (
          <div className="h-full flex flex-col animate-in fade-in duration-300 max-w-lg mx-auto">
            {currentProject && currentProject.status === 'trained' ? (
              <div className="flex-grow flex flex-col border border-[var(--line)] bg-[var(--surface-2)] relative">
                <div className="p-3 border-b border-[var(--line)] bg-[var(--surface)] text-[10px] font-mono uppercase tracking-widest flex justify-between items-center">
                  <span className="text-[var(--accent-lime)]">Active: {currentProject.name}</span>
                  <span className="text-[var(--text-dim)]">{currentProject.type}</span>
                </div>
                
                <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-[var(--bg)]">
                  {chatHistory.length === 0 && (
                    <div className="text-center text-[var(--text-faint)] text-sm mt-10">
                      Sandbox ready. Test your model's accuracy offline.
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-3 text-sm rounded-sm ${msg.role === 'user' ? 'bg-[var(--surface-2)] border border-[var(--line)] text-white' : 'bg-transparent text-[var(--text-dim)]'}`}>
                        {msg.role === 'bot' && <div className="text-[10px] font-mono text-[var(--text-faint)] mb-1 uppercase tracking-widest">TODDLER &gt;</div>}
                        {msg.role === 'user' && msg.imageSrc && <div className="text-[10px] font-mono text-[var(--accent-purple)] mb-2">(Uploaded Image)</div>}
                        {msg.text}
                      </div>
                      {msg.role === 'bot' && !msg.error && (
                        <div className="text-[10px] font-mono text-[var(--accent-lime)] mt-1 ml-2">Confidence: {(msg.confidence||0.98)*100}%</div>
                      )}
                    </div>
                  ))}
                  {testing && (
                    <div className="flex flex-col items-start mt-2">
                      <div className="p-3 text-sm text-[var(--text-faint)]">
                         <div className="text-[10px] font-mono uppercase tracking-widest mb-1">TODDLER &gt;</div>
                         <span className="animate-pulse">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-[var(--line)] bg-[var(--surface)]">
                  <form onSubmit={e => { e.preventDefault(); sendChat(); }} className="flex gap-2 items-center">
                    {currentProject.type === 'vision' ? (
                       <button type="button" className="btn-ghost !p-3 border border-[var(--line)] text-[var(--text-dim)] hover:text-white bg-[var(--bg)]" onClick={() => toast('Camera capture pending Phase 3')}>
                         📷
                       </button>
                    ) : null}
                    <input 
                      type="text" 
                      className="input-field flex-grow !m-0 !py-3 bg-[var(--bg)] border border-[var(--line)]" 
                      placeholder="Type a message..." 
                      value={testText}
                      onChange={e => setTestText(e.target.value)}
                      disabled={testing}
                    />
                    <button type="submit" className="btn btn-solid !px-4 !py-3 !m-0" disabled={testing || !testText.trim()}>
                      ▲
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="text-center text-[var(--text-faint)] text-sm mt-10">
                No trained model selected. Go to Training to select a finished job.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
