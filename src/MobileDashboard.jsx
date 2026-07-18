import React from 'react'
import { Download, Cpu, HardDrive, MemoryStick, CheckCircle2, Play, FlaskConical, Code2, ChevronRight, Smartphone, Zap } from 'lucide-react'
import { auth } from './firebase'
import localforage from 'localforage'

const fallbackModels = [
  { id: 'sentiment-lite', name: 'Sentiment Lite', type: 'Text classification', size: 42, params: '1M', ram: 700, color: '#c6ff33', description: 'Fast positive, negative and neutral text predictions.' },
  { id: 'image-lite', name: 'Vision Lite', type: 'Image classification', size: 28, params: '2M', ram: 620, color: '#60a5fa', description: 'A compact image classifier for low-memory devices.' },
  { id: 'embed-mini', name: 'Embed Mini', type: 'Text embeddings', size: 86, params: '8M', ram: 1100, color: '#c084fc', description: 'Generate useful sentence vectors locally.' },
]

const formatRam = value => value >= 1024 ? `${(value / 1024).toFixed(1)} GB` : `${value} MB`

export default function MobileDashboard() {
  const [tab, setTab] = React.useState('zoo')
  const [downloaded, setDownloaded] = React.useState(() => JSON.parse(localStorage.getItem('toddler-models') || '[]'))
  const [downloading, setDownloading] = React.useState(null)
  const [category, setCategory] = React.useState('All')
  const [downloadProgress, setDownloadProgress] = React.useState(0)
  const [ram, setRam] = React.useState(null)
  const [storage, setStorage] = React.useState(null)
  const [catalog, setCatalog] = React.useState(fallbackModels)
  const [datasets, setDatasets] = React.useState([])
  const [uploading, setUploading] = React.useState(false)
  const [message, setMessage] = React.useState('')

  const apiUrl = import.meta.env.VITE_API_URL

  React.useEffect(() => {
    setRam(navigator.deviceMemory ? Math.round(navigator.deviceMemory) : 4)
    if (apiUrl) {
      fetch(`${apiUrl}/models`).then(r => r.ok ? r.json() : null).then(data => data?.models && setCatalog(data.models)).catch(() => {})
    }
    if (navigator.storage?.estimate) navigator.storage.estimate().then(({ quota, usage }) => setStorage({ quota, usage }))
  }, [apiUrl])

  const saveModels = next => { setDownloaded(next); localStorage.setItem('toddler-models', JSON.stringify(next)) }
  const download = async model => {
    setDownloading(model.id); setDownloadProgress(0)
    try {
      if (model.downloadUrl) {
        const response = await fetch(model.downloadUrl)
        if (!response.ok) throw new Error('Model download failed.')
        const total = Number(response.headers.get('content-length')) || 0
        const reader = response.body?.getReader(); const chunks = []; let received = 0
        if (reader) { while (true) { const part = await reader.read(); if (part.done) break; chunks.push(part.value); received += part.value.length; if (total) setDownloadProgress(Math.round(received / total * 100)) } }
        const blob = new Blob(reader ? chunks : [await response.arrayBuffer()]); await localforage.setItem(`toddler-model-${model.id}`, blob)
      }
      saveModels([...new Set([...downloaded, model.id])]); setTab('train')
    } catch (error) { window.alert(error.message) } finally { setDownloading(null); setDownloadProgress(0) }
  }

  const loadDatasets = async token => {
    if (!apiUrl) return
    const response = await fetch(`${apiUrl}/datasets`, { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) setDatasets((await response.json()).datasets || [])
  }

  const uploadDataset = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!apiUrl) { setMessage('VITE_API_URL is not configured.'); return }
    setUploading(true); setMessage('Preparing secure upload…')
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
      setMessage(`${file.name} uploaded and ready.`)
    } catch (error) { setMessage(error.message) } finally { setUploading(false); event.target.value = '' }
  }

  const availableRam = (ram || 4) * 1024 * .45
  const recommended = catalog.filter(model => model.ram <= availableRam)
  const visibleModels = (category === 'Recommended' ? recommended : category === 'Downloaded' ? catalog.filter(model => downloaded.includes(model.id)) : category === 'All' ? catalog : catalog.filter(model => model.type?.toLowerCase().includes(category.toLowerCase())))

  return <div className="mobile-app">
    <header className="mobile-header"><div className="mobile-brand"><span className="mobile-mark" /> TODDLER</div><div className="device-pill"><span className="online-dot" /> DEVICE READY</div></header>
    <main className="mobile-main">
      <section className="mobile-welcome"><div><p className="mobile-kicker">LOCAL AI WORKSPACE</p><h1>Train on your device.</h1><p className="mobile-muted">Small models, private data, no cloud required.</p></div><div className="device-card"><Smartphone size={18}/><strong>{ram || '—'} GB RAM</strong><span>Android device</span></div></section>
      <section className="device-stats"><div><MemoryStick size={15}/><span>RAM</span><b>{ram || '—'} GB</b></div><div><HardDrive size={15}/><span>STORAGE</span><b>{storage ? `${Math.round((storage.quota - storage.usage) / 1e9)} GB free` : 'Checking'}</b></div><div><Cpu size={15}/><span>MODE</span><b>{ram && ram <= 2 ? 'Low memory' : 'Mobile'}</b></div></section>
      <nav className="mobile-tabs">{[['zoo','Model Zoo',Zap],['train','Train',Play],['test','Test',FlaskConical],['dev','Dev',Code2]].map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16}/>{label}</button>)}</nav>

      {tab === 'zoo' && <><div className="section-heading"><div><p className="mobile-kicker">MODEL ZOO</p><h2>Recommended for you</h2></div><span className="model-count">{recommended.length} compatible</span></div><div className="model-filters">{['All','Text','Vision','Embeddings','Recommended','Downloaded'].map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="model-list">{visibleModels.map(model => { const isDownloaded = downloaded.includes(model.id); const fits = model.ram <= availableRam; return <article className={`model-card ${!fits ? 'disabled' : ''}`} key={model.id}><div className="model-icon" style={{ color: model.color }}><Zap size={19}/></div><div className="model-info"><div className="model-title"><h3>{model.name}</h3>{isDownloaded && <CheckCircle2 size={16} className="success"/>}</div><p>{model.type}</p><small>{model.description}</small><div className="model-meta"><span>{model.size} MB</span><span>{model.params || `${model.parameterCount / 1000000}M`} params</span><span>~{formatRam(model.ram || model.trainingRamMb)} RAM</span></div></div><button className="model-action" disabled={!fits || downloading === model.id || isDownloaded} onClick={() => download(model)}>{isDownloaded ? 'Downloaded' : downloading === model.id ? `Downloading ${downloadProgress}%…` : fits ? <><Download size={15}/> Train model</> : 'Not compatible'}</button></article>})}</div></>}

      {tab === 'train' && <div className="empty-panel"><Play size={28}/><h2>Your downloaded models</h2>{downloaded.length ? <><div className="downloaded-list">{catalog.filter(model => downloaded.includes(model.id)).map(model => <div className="downloaded-row" key={model.id}><div><b>{model.name}</b><span>{model.size} MB · ready to train</span></div><label className="small-button">{uploading ? 'Uploading…' : 'Upload dataset'}<input type="file" accept=".csv,.json" hidden disabled={uploading} onChange={uploadDataset}/><ChevronRight size={14}/></label></div>)}</div>{message && <p className="upload-message">{message}</p>}{datasets.length > 0 && <div className="downloaded-list"><p className="mobile-kicker">UPLOADED DATASETS</p>{datasets.map(dataset => <div className="downloaded-row" key={dataset.id}><div><b>{dataset.name}</b><span>{Math.round((dataset.sizeBytes || dataset.bytes || 0) / 1024)} KB · ready</span></div><button className="small-button">Start training <ChevronRight size={14}/></button></div>)}</div>}</> : <><p>Download a model from the Model Zoo to start training locally.</p><button className="primary-button" onClick={() => setTab('zoo')}>Browse Model Zoo</button></>}</div>}
      {tab === 'test' && <div className="empty-panel"><FlaskConical size={28}/><h2>Test locally</h2><p>Run predictions and evaluate your trained models without uploading your data.</p><button className="primary-button" onClick={() => setTab('train')}>Choose a model</button></div>}
      {tab === 'dev' && <div className="empty-panel dev-panel"><Code2 size={28}/><h2>Build with your models</h2><p>Use the local API to call models running on this device.</p><pre>{`fetch('http://localhost:8787/predict', {\n  method: 'POST',\n  body: JSON.stringify({ text })\n})`}</pre><button className="small-button">Copy snippet</button></div>}
    </main>
  </div>
}
