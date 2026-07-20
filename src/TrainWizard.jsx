import React, { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth, db } from './firebase'
import { collection, addDoc, updateDoc } from 'firebase/firestore'
import { chunkDocuments, storeChunks } from './rag'
import Sidebar from './components/Sidebar'
import toast from 'react-hot-toast'

export default function TrainWizard() {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: mode, 2: upload, 3: review, 4: training, 5: done
  const [mode, setMode] = useState('rag') // 'rag' | 'lora'
  const [projectName, setProjectName] = useState('')
  const [files, setFiles] = useState([])
  const [chunks, setChunks] = useState([])
  const [training, setTraining] = useState(false)
  const [progress, setProgress] = useState(0)
  const [project, setProject] = useState(null)
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

  const handleFileUpload = async (e) => {
    const uploaded = Array.from(e.target.files)
    if (uploaded.length === 0) return
    setFiles(uploaded)
    setStep(3)
  }

  const handleTrain = async () => {
    if (!projectName.trim()) { toast.error('Give your model a name.'); return }
    setTraining(true)
    setStep(4)
    setProgress(10)

    try {
      // 1. Chunk documents
      setProgress(20)
      const allChunks = await chunkDocuments(files)
      setChunks(allChunks)
      setProgress(40)

      // 2. Create Firestore project
      const projectData = {
        ownerUid: auth.currentUser.uid,
        name: projectName,
        baseModelId: modelId,
        baseModelName: modelName,
        trainingMode: mode,
        status: 'training',
        progress: 50,
        chunkCount: allChunks.length,
        fileCount: files.length,
        createdAt: new Date(),
        version: 1,
      }
      const docRef = await addDoc(collection(db, 'projects'), projectData)
      setProgress(60)

      // 3. Store chunks locally in IndexedDB
      await storeChunks(docRef.id, allChunks)
      setProgress(80)

      // 4. Mark as trained
      await updateDoc(docRef, {
        status: 'trained',
        progress: 100,
        trainedAt: new Date(),
      })
      setProgress(100)

      const finished = { id: docRef.id, ...projectData, status: 'trained', progress: 100 }
      setProject(finished)
      setStep(5)
      toast.success('Model trained!')
    } catch (err) {
      toast.error(err.message || 'Training failed')
      setStep(3)
    } finally {
      setTraining(false)
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

        {/* Progress bar */}
        <div style={{ display:'flex', gap:4, marginBottom:40 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= step ? (i === step ? 'var(--purple)' : 'var(--lime)') : 'var(--line)' }} />
          ))}
        </div>

        {/* Model info */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
          <div style={{ width:44, height:44, background:'var(--surface-2)', border:'1px solid var(--line)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🧠</div>
          <div>
            <h3 style={{ fontFamily:"'Space Grotesk'", fontSize:18, fontWeight:600 }}>{modelName}</h3>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, color:'var(--text-faint)' }}>{mode === 'rag' ? 'RAG mode' : 'Fine-tune mode'}</div>
          </div>
        </div>

        {/* Step 1: Choose Mode */}
        {step === 1 && (
          <div className="animate-in">
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Choose Training Mode</h2>
            <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:24 }}>How do you want to train this model?</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:32 }}>
              <div
                onClick={() => setMode('rag')}
                style={{
                  background:'var(--surface-2)', border:`2px solid ${mode === 'rag' ? 'var(--lime)' : 'var(--line)'}`,
                  padding:24, borderRadius:4, cursor:'pointer', transition:'all 0.2s',
                }}
              >
                <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--lime)', marginBottom:8 }}>📄 RAG Mode</div>
                <h4 style={{ fontFamily:"'Space Grotesk'", fontSize:18, fontWeight:600, marginBottom:8 }}>Retrieval-Augmented</h4>
                <p style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.6 }}>
                  Upload your docs. Model reads them at chat time. Instant. No GPU needed. Works on any device.
                </p>
              </div>
              <div
                onClick={() => setMode('lora')}
                style={{
                  background:'var(--surface-2)', border:`2px solid ${mode === 'lora' ? 'var(--lime)' : 'var(--line)'}`,
                  padding:24, borderRadius:4, cursor:'pointer', opacity:0.5,
                }}
              >
                <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--purple)', marginBottom:8 }}>🔧 Fine-Tune (LoRA)</div>
                <h4 style={{ fontFamily:"'Space Grotesk'", fontSize:18, fontWeight:600, marginBottom:8 }}>Weight Updates</h4>
                <p style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.6 }}>
                  Upload prompt/completion pairs. Model actually learns. Needs GPU. Coming in Phase 3.
                </p>
                <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--purple)', marginTop:8 }}>⚠️ Coming soon</div>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              style={{
                width:'100%', padding:'14px', background:'var(--lime)', color:'#14130F', border:'none',
                fontFamily:"'IBM Plex Mono'", fontSize:12, letterSpacing:2, textTransform:'uppercase', fontWeight:600, cursor:'pointer',
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Name + Upload */}
        {step === 2 && (
          <div className="animate-in">
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Name Your Model</h2>
            <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:24 }}>Give your model an identity.</p>
            <input
              type="text"
              placeholder="e.g. Medical FAQ Bot"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && projectName && setStep(3)}
              style={{
                width:'100%', padding:'14px 16px', background:'var(--surface-2)', border:'none',
                borderBottom:'2px solid var(--lime)', color:'var(--text)', fontSize:20,
                fontFamily:"'Space Grotesk'", fontWeight:600, outline:'none', marginBottom:32,
              }}
            />
            <button
              onClick={() => { if (projectName) setStep(3); else toast.error('Enter a name') }}
              disabled={!projectName}
              style={{
                width:'100%', padding:'14px', background: projectName ? 'var(--lime)' : 'var(--line)',
                color:'#14130F', border:'none',
                fontFamily:"'IBM Plex Mono'", fontSize:12, letterSpacing:2, textTransform:'uppercase', fontWeight:600,
                cursor: projectName ? 'pointer' : 'default',
              }}
            >
              Next: Upload Documents →
            </button>
          </div>
        )}

        {/* Step 3: Upload + Review */}
        {step === 3 && (
          <div className="animate-in">
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Upload Your Knowledge</h2>
            <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:24 }}>Drop your files. Toddler will chunk them and make them searchable at inference time.</p>

            {/* Upload zone */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border:'2px dashed var(--line)', background:'var(--surface-2)', padding:48,
                textAlign:'center', borderRadius:4, cursor:'pointer', marginBottom:24,
                transition:'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
            >
              <div style={{ fontSize:32, marginBottom:12 }}>📄</div>
              <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:13, color:'var(--lime)', marginBottom:8 }}>
                {files.length > 0 ? 'Add more files' : 'Drop files here or click to browse'}
              </div>
              <div style={{ fontSize:12, color:'var(--text-faint)' }}>.txt · .csv · .md · .json · .pdf</div>
              <input ref={fileRef} type="file" multiple accept=".txt,.csv,.md,.json,.pdf" onChange={handleFileUpload} style={{ display:'none' }} />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', borderRadius:4, padding:16, marginBottom:24 }}>
                <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--lime)', marginBottom:12 }}>✓ {files.length} file{files.length > 1 ? 's' : ''} selected</div>
                {files.map((f, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'8px 0', borderBottom: i < files.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <span style={{ color:'var(--text)' }}>{f.name}</span>
                    <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, color:'var(--text-faint)' }}>{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}

            {/* Train button */}
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setStep(2)} style={{ padding:'14px', background:'transparent', border:'1px solid var(--line)', color:'var(--text-dim)', fontFamily:"'IBM Plex Mono'", fontSize:11, cursor:'pointer' }}>← Back</button>
              <button
                onClick={handleTrain}
                disabled={files.length === 0}
                style={{
                  flex:1, padding:'14px', background: files.length > 0 ? 'var(--lime)' : 'var(--line)',
                  color:'#14130F', border:'none',
                  fontFamily:"'IBM Plex Mono'", fontSize:12, letterSpacing:2, textTransform:'uppercase', fontWeight:600,
                  cursor: files.length > 0 ? 'pointer' : 'default',
                }}
              >
                🚀 Start Training
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Training progress */}
        {step === 4 && (
          <div className="animate-in" style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ width:80, height:80, border:'3px solid var(--line)', borderTopColor:'var(--purple)', borderRadius:'50%', margin:'0 auto 24px', animation:'spin 1.5s linear infinite' }} />
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Training {projectName}</h2>
            <p style={{ fontFamily:"'IBM Plex Mono'", fontSize:12, color:'var(--purple)', marginBottom:24 }}>
              {progress < 30 ? 'Parsing documents...' : progress < 50 ? 'Creating chunks...' : progress < 70 ? 'Storing knowledge base...' : progress < 90 ? 'Indexing for retrieval...' : 'Finalizing...'}
            </p>
            <div style={{ maxWidth:400, margin:'0 auto' }}>
              <div style={{ width:'100%', height:6, background:'var(--line)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${progress}%`, height:'100%', background:'var(--purple)', borderRadius:3, transition:'width 0.5s' }} />
              </div>
              <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, color:'var(--text-faint)', marginTop:8 }}>{progress}%</div>
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && project && (
          <div className="animate-in" style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:8 }}>Training Complete!</h2>
            <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:8 }}>{projectName}</p>
            <p style={{ fontFamily:"'IBM Plex Mono'", fontSize:12, color:'var(--lime)', marginBottom:32 }}>
              {chunks.length} knowledge chunks from {files.length} file{files.length > 1 ? 's' : ''}
            </p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, maxWidth:500, margin:'0 auto 32px' }}>
              <button
                onClick={() => navigate(`/models/${project.id}`)}
                style={{ padding:'16px', background:'var(--lime)', color:'#14130F', border:'none', borderRadius:4, fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', fontWeight:600, cursor:'pointer' }}
              >
                💬 Chat
              </button>
              <button
                onClick={() => navigate('/models')}
                style={{ padding:'16px', background:'var(--surface-2)', color:'var(--text)', border:'1px solid var(--line)', borderRadius:4, fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', cursor:'pointer' }}
              >
                🧠 My Models
              </button>
              <button
                onClick={() => navigate('/zoo')}
                style={{ padding:'16px', background:'var(--surface-2)', color:'var(--text)', border:'1px solid var(--line)', borderRadius:4, fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', cursor:'pointer' }}
              >
                🔍 Zoo
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
