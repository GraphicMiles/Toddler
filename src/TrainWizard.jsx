import React, { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth, db } from './firebase'
import { collection, addDoc, updateDoc } from 'firebase/firestore'
import { uploadDatasetToCloudinary } from './cloud'
import Sidebar from './components/Sidebar'
import toast from 'react-hot-toast'

/**
 * TrainWizard — Web control tower.
 *
 * Creates a training job in Firestore + backend queue.
 * Does NOT train locally. A phone, desktop, or cloud worker picks it up.
 */
export default function TrainWizard() {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: name, 2: upload, 3: choose runner, 4: queued, 5: done
  const [projectName, setProjectName] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [project, setProject] = useState(null)
  const [runner, setRunner] = useState('auto')
  const fileRef = useRef()

  const MODEL_NAMES = {
    'smollm2-360m': 'SmolLM2 360M',
    'smollm2-1.7b': 'SmolLM2 1.7B',
    'llama-3.2-3b': 'Llama 3.2 3B',
    'qwen2.5-1.5b': 'Qwen 2.5 1.5B',
    'phi-3-mini': 'Phi-3 Mini 3.8B',
    'mobilenet-v3': 'MobileNet V3',
    'yolov8-nano': 'YOLOv8 Nano',
  }
  const modelName = MODEL_NAMES[modelId] || modelId

  const handleFileUpload = (e) => {
    const uploaded = Array.from(e.target.files)
    if (uploaded.length === 0) return
    setFiles(uploaded)
  }

  const handleSubmit = async () => {
    if (!projectName.trim()) { toast.error('Give your model a name.'); return }
    if (files.length === 0) { toast.error('Upload at least one file.'); return }

    setUploading(true)
    setStep(4) // Queued

    try {
      // 1. Upload dataset to Cloudinary (signed)
      const datasetUrls = []
      for (const file of files) {
        const url = await uploadDatasetToCloudinary(file)
        datasetUrls.push({ name: file.name, url, size: file.size })
      }

      // 2. Create Firestore project
      const projectData = {
        ownerUid: auth.currentUser.uid,
        name: projectName,
        baseModelId: modelId,
        baseModelName: modelName,
        trainingMode: 'rag',
        status: 'queued',
        progress: 0,
        fileCount: files.length,
        datasetFiles: datasetUrls,
        createdAt: new Date(),
        version: 1,
      }
      const docRef = await addDoc(collection(db, 'projects'), projectData)

      // 3. Queue training job on backend
      const apiUrl = import.meta.env.VITE_API_URL
      if (apiUrl) {
        try {
          const token = await auth.currentUser?.getIdToken()
          const formData = new FormData()
          formData.append('project_id', docRef.id)
          formData.append('model_id', modelId)
          formData.append('training_mode', 'rag')
          formData.append('runner', runner)
          formData.append('dataset_url', datasetUrls[0]?.url || '')
          await fetch(`${apiUrl}/train`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          })
        } catch (e) {
          console.warn('Backend train queue failed (will rely on BYOC poll):', e.message)
        }
      }

      const finished = { id: docRef.id, ...projectData }
      setProject(finished)
      setStep(5)
      toast.success('Training job queued!')
    } catch (err) {
      toast.error(err.message || 'Failed to queue training')
      setStep(3)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:"'Inter', sans-serif" }}>
      <div className="hidden md:block"><Sidebar /></div>
      <div style={{ flex:1, overflowY:'auto', padding:32, maxWidth:700, margin:'0 auto' }}>
        {/* Back */}
        <button onClick={() => step > 1 && step < 5 ? setStep(step - 1) : navigate(`/zoo/${modelId}`)} style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, color:'var(--text-faint)', background:'none', border:'none', cursor:'pointer', marginBottom:24 }}>
          ← Back
        </button>

        {/* Progress */}
        <div style={{ display:'flex', gap:4, marginBottom:40 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= step ? (i === step ? 'var(--purple)' : 'var(--lime)') : 'var(--line)' }} />
          ))}
        </div>

        {/* Model info */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
          <div style={{ width:44, height:44, background:'var(--surface-2)', border:'1px solid var(--line)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🧠</div>
          <div>
            <h3 style={{ fontFamily:"'Space Grotesk'", fontSize:18, fontWeight:600 }}>{modelName}</h3>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, color:'var(--text-faint)' }}>RAG training · Queued to your devices</div>
          </div>
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="animate-in">
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Name Your Model</h2>
            <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:24 }}>Give your model an identity.</p>
            <input
              type="text" placeholder="e.g. Medical FAQ Bot" autoFocus
              value={projectName} onChange={e => setProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && projectName && setStep(2)}
              style={{
                width:'100%', padding:'14px 16px', background:'var(--surface-2)', border:'none',
                borderBottom:'2px solid var(--lime)', color:'var(--text)', fontSize:20,
                fontFamily:"'Space Grotesk'", fontWeight:600, outline:'none', marginBottom:32,
              }}
            />
            <button onClick={() => projectName ? setStep(2) : toast.error('Enter a name')} disabled={!projectName}
              style={{
                width:'100%', padding:'14px', background: projectName ? 'var(--lime)' : 'var(--line)',
                color:'#14130F', border:'none', fontFamily:"'IBM Plex Mono'", fontSize:12,
                letterSpacing:2, textTransform:'uppercase', fontWeight:600,
                cursor: projectName ? 'pointer' : 'default',
              }}>Continue →</button>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === 2 && (
          <div className="animate-in">
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Upload Your Knowledge</h2>
            <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:24 }}>
              Drop your files. They'll be uploaded to secure storage and sent to your training device.
            </p>

            <div onClick={() => fileRef.current?.click()}
              style={{
                border:'2px dashed var(--line)', background:'var(--surface-2)', padding:48,
                textAlign:'center', borderRadius:4, cursor:'pointer', marginBottom:24,
                transition:'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
              <div style={{ fontSize:32, marginBottom:12 }}>📄</div>
              <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:13, color:'var(--lime)', marginBottom:8 }}>
                {files.length > 0 ? 'Add more files' : 'Drop files here or click to browse'}
              </div>
              <div style={{ fontSize:12, color:'var(--text-faint)' }}>.txt · .csv · .md · .json · .pdf</div>
              <input ref={fileRef} type="file" multiple accept=".txt,.csv,.md,.json,.pdf" onChange={handleFileUpload} style={{ display:'none' }} />
            </div>

            {files.length > 0 && (
              <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', borderRadius:4, padding:16, marginBottom:24 }}>
                <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--lime)', marginBottom:12 }}>✓ {files.length} file{files.length > 1 ? 's' : ''}</div>
                {files.map((f, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'8px 0', borderBottom: i < files.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <span style={{ color:'var(--text)' }}>{f.name}</span>
                    <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, color:'var(--text-faint)' }}>{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setStep(1)} style={{ padding:'14px', background:'transparent', border:'1px solid var(--line)', color:'var(--text-dim)', fontFamily:"'IBM Plex Mono'", fontSize:11, cursor:'pointer' }}>← Back</button>
              <button onClick={() => files.length > 0 ? setStep(3) : toast.error('Upload at least one file')} disabled={files.length === 0}
                style={{
                  flex:1, padding:'14px', background: files.length > 0 ? 'var(--lime)' : 'var(--line)',
                  color:'#14130F', border:'none', fontFamily:"'IBM Plex Mono'", fontSize:12,
                  letterSpacing:2, textTransform:'uppercase', fontWeight:600,
                  cursor: files.length > 0 ? 'pointer' : 'default',
                }}>Next: Choose Runner →</button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Runner */}
        {step === 3 && (
          <div className="animate-in">
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Where Should Training Run?</h2>
            <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:24 }}>
              Training happens on your devices — never on this web app. Pick a runner.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
              {[
                { id:'auto', icon:'⚡', name:'Auto (Recommended)', desc:'Routes to your fastest online device. Falls back to cloud if none available.', badge:'Best option' },
                { id:'device_mobile', icon:'📱', name:'Your Phone', desc:'Train on your Android device. Data stays local. Needs the Toddler app open.', badge:'Private' },
                { id:'device_desktop', icon:'💻', name:'Your Desktop', desc:'Train on your Mac/PC. Bigger models, faster training. Needs the desktop agent.', badge:'Powerful' },
                { id:'cloud', icon:'☁️', name:'Cloud GPU', desc:'Train on remote GPU. Requires Pro plan. Fastest for large datasets.', badge:'Pro only', disabled: true },
              ].map(r => (
                <div key={r.id} onClick={() => !r.disabled && setRunner(r.id)}
                  style={{
                    background:'var(--surface-2)', padding:20, borderRadius:4, cursor: r.disabled ? 'default' : 'pointer',
                    border: `2px solid ${runner === r.id ? 'var(--lime)' : 'var(--line)'}`,
                    opacity: r.disabled ? 0.5 : 1, transition:'all 0.2s',
                    display:'flex', gap:16, alignItems:'start',
                  }}>
                  <div style={{ fontSize:24, flexShrink:0 }}>{r.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <h4 style={{ fontFamily:"'Space Grotesk'", fontSize:15, fontWeight:600 }}>{r.name}</h4>
                      <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:9, padding:'2px 8px', borderRadius:4, background: runner === r.id ? 'rgba(198,255,51,0.1)' : 'rgba(110,105,92,0.15)', color: runner === r.id ? 'var(--lime)' : 'var(--text-faint)' }}>{r.badge}</span>
                    </div>
                    <p style={{ fontSize:12, color:'var(--text-dim)', lineHeight:1.5 }}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:'var(--surface)', border:'1px solid var(--line)', padding:16, borderRadius:4, marginBottom:24 }}>
              <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:8 }}>What happens next</div>
              <ul style={{ listStyle:'none', padding:0, fontSize:13, color:'var(--text-dim)', lineHeight:1.8 }}>
                <li>→ Your files are uploaded to secure storage</li>
                <li>→ A training job is created in the queue</li>
                <li>→ Your device picks up the job (or cloud, if Pro)</li>
                <li>→ Device downloads your files, chunks them, stores locally</li>
                <li>→ You get a notification when it's done</li>
                <li>→ You come back here to chat with your model</li>
              </ul>
            </div>

            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setStep(2)} style={{ padding:'14px', background:'transparent', border:'1px solid var(--line)', color:'var(--text-dim)', fontFamily:"'IBM Plex Mono'", fontSize:11, cursor:'pointer' }}>← Back</button>
              <button onClick={handleSubmit}
                style={{
                  flex:1, padding:'14px', background:'var(--lime)', color:'#14130F', border:'none',
                  fontFamily:"'IBM Plex Mono'", fontSize:12, letterSpacing:2, textTransform:'uppercase', fontWeight:600, cursor:'pointer',
                }}>🚀 Queue Training Job</button>
            </div>
          </div>
        )}

        {/* Step 4: Queued (waiting) */}
        {step === 4 && (
          <div className="animate-in" style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ width:80, height:80, border:'3px solid var(--line)', borderTopColor:'var(--purple)', borderRadius:'50%', margin:'0 auto 24px', animation:'spin 1.5s linear infinite' }} />
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Uploading & Queuing</h2>
            <p style={{ fontFamily:"'IBM Plex Mono'", fontSize:12, color:'var(--purple)', marginBottom:12 }}>Sending files to secure storage...</p>
            <p style={{ fontSize:13, color:'var(--text-faint)' }}>Your training job will appear in the queue momentarily.</p>
          </div>
        )}

        {/* Step 5: Done — job queued */}
        {step === 5 && project && (
          <div className="animate-in" style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📡</div>
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Job Queued!</h2>
            <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:8 }}>{projectName}</p>
            <p style={{ fontFamily:"'IBM Plex Mono'", fontSize:12, color:'var(--purple)', marginBottom:32 }}>
              Waiting for a training device to pick it up.
            </p>

            <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:20, borderRadius:4, marginBottom:32, textAlign:'left' }}>
              <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:12 }}>Next steps</div>
              <ul style={{ listStyle:'none', padding:0, fontSize:13, color:'var(--text-dim)', lineHeight:2 }}>
                <li>📱 Open the Toddler app on your phone to pick up this job</li>
                <li>💻 Or open the desktop agent on your laptop</li>
                <li>🔔 You'll get a notification when training completes</li>
                <li>💬 Come back here to chat with your trained model</li>
              </ul>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, maxWidth:500, margin:'0 auto' }}>
              <button onClick={() => navigate('/models')}
                style={{ padding:'16px', background:'var(--lime)', color:'#14130F', border:'none', borderRadius:4, fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', fontWeight:600, cursor:'pointer' }}>
                🧠 My Models
              </button>
              <button onClick={() => navigate('/zoo')}
                style={{ padding:'16px', background:'var(--surface-2)', color:'var(--text)', border:'1px solid var(--line)', borderRadius:4, fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', cursor:'pointer' }}>
                🔍 Zoo
              </button>
              <button onClick={() => navigate('/devices')}
                style={{ padding:'16px', background:'var(--surface-2)', color:'var(--text)', border:'1px solid var(--line)', borderRadius:4, fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', cursor:'pointer' }}>
                📱 Devices
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
