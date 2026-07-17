import React from 'react'
import { Download, Cpu, HardDrive, MemoryStick, CheckCircle2, Play, FlaskConical, Code2, ChevronRight, Smartphone, Zap } from 'lucide-react'

const models = [
  { id: 'sentiment-lite', name: 'Sentiment Lite', type: 'Text classification', size: 42, params: '1M', ram: 700, color: '#c6ff33', description: 'Fast positive, negative and neutral text predictions.' },
  { id: 'image-lite', name: 'Vision Lite', type: 'Image classification', size: 28, params: '2M', ram: 620, color: '#60a5fa', description: 'A compact image classifier for low-memory devices.' },
  { id: 'embed-mini', name: 'Embed Mini', type: 'Text embeddings', size: 86, params: '8M', ram: 1100, color: '#c084fc', description: 'Generate useful sentence vectors locally.' },
]

function formatRam(value) { return value >= 1024 ? `${(value / 1024).toFixed(1)} GB` : `${value} MB` }

export default function MobileDashboard() {
  const [tab, setTab] = React.useState('zoo')
  const [downloaded, setDownloaded] = React.useState(() => JSON.parse(localStorage.getItem('toddler-models') || '[]'))
  const [downloading, setDownloading] = React.useState(null)
  const [ram, setRam] = React.useState(null)
  const [storage, setStorage] = React.useState(null)
  const [catalog, setCatalog] = React.useState(models)
  const [uploading, setUploading] = React.useState(false)
  const [uploadMessage, setUploadMessage] = React.useState('')

  React.useEffect(() => {
    setRam(navigator.deviceMemory ? Math.round(navigator.deviceMemory) : 4)
    const apiUrl = import.meta.env.VITE_API_URL
    if (apiUrl) fetch(`${apiUrl}/models`).then(r => r.ok ? r.json() : null).then(data => data?.models && setCatalog(data.models)).catch(() => {})
    if (navigator.storage?.estimate) navigator.storage.estimate().then(({ quota, usage }) => setStorage({ quota, usage }))
  }, [])

  const saveModels = (next) => { setDownloaded(next); localStorage.setItem('toddler-models', JSON.stringify(next)) }
  const download = (model) => {
    setDownloading(model.id)
    window.setTimeout(() => { saveModels([...new Set([...downloaded, model.id])]); setDownloading(null); setTab('train') }, 900)
  }
  const availableRam = (ram || 4) * 1024 * .45
  const recommended = catalog.filter(model => model.ram <= availableRam)

  return <div className="mobile-app">
    <header className="mobile-header">
      <div className="mobile-brand"><span className="mobile-mark" /> TODDLER</div>
      <div className="device-pill"><span className="online-dot" /> DEVICE READY</div>
    </header>

    <main className="mobile-main">
      <section className="mobile-welcome">
        <div><p className="mobile-kicker">LOCAL AI WORKSPACE</p><h1>Train on your device.</h1><p className="mobile-muted">Small models, private data, no cloud required.</p></div>
        <div className="device-card"><Smartphone size={18}/><strong>{ram || '—'} GB RAM</strong><span>Android device</span></div>
      </section>
      <section className="device-stats">
        <div><MemoryStick size={15}/><span>RAM</span><b>{ram || '—'} GB</b></div>
        <div><HardDrive size={15}/><span>STORAGE</span><b>{storage ? `${Math.round((storage.quota-storage.usage)/1e9)} GB free` : 'Checking'}</b></div>
        <div><Cpu size={15}/><span>MODE</span><b>{ram && ram <= 2 ? 'Low memory' : 'Mobile'}</b></div>
      </section>

      <nav className="mobile-tabs">
        {[['zoo','Model Zoo',Zap],['train','Train',Play],['test','Test',FlaskConical],['dev','Dev',Code2]].map(([id,label,Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16}/>{label}</button>)}
      </nav>

      {tab === 'zoo' && <>
        <div className="section-heading"><div><p className="mobile-kicker">MODEL ZOO</p><h2>Recommended for you</h2></div><span className="model-count">{recommended.length} compatible</span></div>
        <div className="model-list">{catalog.map(model => { const isDownloaded = downloaded.includes(model.id); const fits = model.ram <= availableRam; return <article className={`model-card ${!fits ? 'disabled' : ''}`} key={model.id}>
          <div className="model-icon" style={{color:model.color}}><Zap size={19}/></div><div className="model-info"><div className="model-title"><h3>{model.name}</h3>{isDownloaded && <CheckCircle2 size={16} className="success"/>}</div><p>{model.type}</p><small>{model.description}</small><div className="model-meta"><span>{model.size} MB</span><span>{model.params} params</span><span>~{formatRam(model.ram)} RAM</span></div></div>
          <button className="model-action" disabled={!fits || downloading === model.id || isDownloaded} onClick={() => download(model)}>{isDownloaded ? 'Downloaded' : downloading === model.id ? 'Downloading…' : fits ? <><Download size={15}/> Train model</> : 'Not compatible'}</button>
        </article>})}</div>
      </>}

      {tab === 'train' && <div className="empty-panel"><Play size={28}/><h2>Your downloaded models</h2>{downloaded.length ? <div className="downloaded-list">{catalog.filter(m=>downloaded.includes(m.id)).map(m=><div className="downloaded-row" key={m.id}><div><b>{m.name}</b><span>{m.size} MB · ready to train</span></div><><label className="small-button">Upload dataset<input type="file" accept=".csv,.json" hidden onChange={async (e) => { const file=e.target.files?.[0]; if (!file) return; const apiUrl=import.meta.env.VITE_API_URL; if (!apiUrl) { setUploadMessage('Add VITE_API_URL to connect uploads.'); return } setUploading(true); setUploadMessage('Preparing secure upload…'); try { const { auth } = await import('./firebase'); const token=await auth.currentUser?.getIdToken(); if (!token) throw new Error('Please sign in again.'); const signed=await fetch(`${apiUrl}/uploads/sign`, {method:'POST',headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()); if (!signed.signature) throw new Error(signed.detail || 'Could not authorize upload.'); const body=new FormData(); body.append('file',file); body.append('api_key',signed.apiKey); body.append('timestamp',signed.timestamp); body.append('signature',signed.signature); body.append('folder',signed.folder); if (signed.uploadPreset) body.append('upload_preset',signed.uploadPreset); const result=await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/raw/upload`, {method:'POST',body}).then(r=>r.json()); if (!result.secure_url) throw new Error(result.error?.message || 'Upload failed.'); setUploadMessage(`${file.name} uploaded successfully.`); } catch (err) { setUploadMessage(err.message); } finally { setUploading(false) } }} />{uploading ? 'Uploading…' : 'Upload dataset'} <ChevronRight size={14}/></label>{uploadMessage && <span className="upload-message">{uploadMessage}</span>}</></div>)}</div> : <><p>Download a model from the Model Zoo to start training locally.</p><button className="primary-button" onClick={() => setTab('zoo')}>Browse Model Zoo</button></>}</div>}
      {tab === 'test' && <div className="empty-panel"><FlaskConical size={28}/><h2>Test locally</h2><p>Run predictions and evaluate your trained models without uploading your data.</p><button className="primary-button" onClick={() => setTab('train')}>Choose a model</button></div>}
      {tab === 'dev' && <div className="empty-panel dev-panel"><Code2 size={28}/><h2>Build with your models</h2><p>Use the local API to call models running on this device.</p><pre>{`fetch('http://localhost:8787/predict', {\n  method: 'POST',\n  body: JSON.stringify({ text })\n})`}</pre><button className="small-button">Copy snippet</button></div>}
    </main>
  </div>
}
