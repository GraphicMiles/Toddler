import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'

export default function ModelDetail() {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) { setLoading(false); return }
    fetch(`${apiUrl}/models`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.models) {
          const found = data.models.find(m => m.id === modelId)
          setModel(found)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [modelId])

  const platformBadge = (runsOn) => {
    if (!runsOn) return ['💻', '☁️']
    return runsOn.map(p => p === 'mobile' ? '📱' : p === 'desktop' ? '💻' : '☁️')
  }

  if (loading) return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <div className="hidden md:block"><Sidebar /></div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:32, height:32, border:'3px solid var(--line)', borderTopColor:'var(--lime)', borderRadius:'50%' }} className="animate-spin" />
      </div>
    </div>
  )

  if (!model) return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <div className="hidden md:block"><Sidebar /></div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <div style={{ fontSize:32 }}>🔍</div>
        <p style={{ color:'var(--text-dim)' }}>Model not found.</p>
        <button onClick={() => navigate('/zoo')} style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, padding:'8px 16px', border:'1px solid var(--line)', background:'transparent', color:'var(--text-dim)', cursor:'pointer' }}>← Back to Zoo</button>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:"'Inter', sans-serif" }}>
      <div className="hidden md:block"><Sidebar /></div>
      <div style={{ flex:1, overflowY:'auto', padding:32, maxWidth:800 }}>
        {/* Back */}
        <button onClick={() => navigate('/zoo')} style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, color:'var(--text-faint)', background:'none', border:'none', cursor:'pointer', marginBottom:24, padding:0 }}>
          ← Back to Zoo
        </button>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:32 }}>
          <div style={{ width:56, height:56, background:'var(--surface-2)', border:'1px solid var(--line)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🧠</div>
          <div>
            <h1 style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, marginBottom:4 }}>{model.name}</h1>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:12, color:'var(--text-faint)' }}>
              {model.task === 'chat' ? 'Chat LLM' : model.task} · {model.params ? `${(model.params / 1e6).toFixed(0)}M params` : ''} · {model.sizeMb}MB · {model.license || 'Open'}
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom:32 }}>
          <p style={{ color:'var(--text-dim)', fontSize:15, lineHeight:1.7 }}>
            {model.description || `A ${model.task} model designed to run on consumer hardware. Train it on your own data using RAG (instant) or LoRA fine-tuning (desktop/cloud). Your data never leaves your device.`}
          </p>
        </div>

        {/* Specs Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:32 }}>
          <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:20, borderRadius:4 }}>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:8 }}>Min RAM</div>
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:24, fontWeight:700 }}>{model.minRamGb || 2} GB</div>
          </div>
          <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:20, borderRadius:4 }}>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:8 }}>Download Size</div>
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:24, fontWeight:700 }}>{model.sizeMb} MB</div>
          </div>
          <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:20, borderRadius:4 }}>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:8 }}>Runs On</div>
            <div style={{ fontSize:20 }}>{platformBadge(model.runsOn).join(' ')}</div>
          </div>
          <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:20, borderRadius:4 }}>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:8 }}>Training Modes</div>
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:18, fontWeight:600 }}>{(model.trainingModes || ['rag']).join(' + ').toUpperCase()}</div>
          </div>
        </div>

        {/* How Training Works */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', padding:24, borderRadius:4, marginBottom:32 }}>
          <h3 style={{ fontFamily:"'Space Grotesk'", fontSize:18, fontWeight:600, marginBottom:16 }}>How Training Works</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:16, borderRadius:4 }}>
              <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--lime)', marginBottom:8 }}>📄 RAG Mode (Instant)</div>
              <p style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.6 }}>
                Upload your documents. The model reads them at inference time. No weight changes. Works on any device. Instant.
              </p>
            </div>
            <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:16, borderRadius:4 }}>
              <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--purple)', marginBottom:8 }}>🔧 Fine-Tune Mode (LoRA)</div>
              <p style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.6 }}>
                Upload prompt/completion pairs. Model weights are actually updated via LoRA. Needs desktop or cloud GPU. Pro only.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:12 }}>
          <button
            onClick={() => navigate(`/zoo/${modelId}/train`)}
            style={{
              flex:1, padding:'14px 24px', background:'var(--lime)', color:'#14130F', border:'none',
              fontFamily:"'IBM Plex Mono'", fontSize:12, letterSpacing:2, textTransform:'uppercase', fontWeight:600, cursor:'pointer',
            }}
          >
            🚀 Train This Model
          </button>
          <button style={{
            padding:'14px 24px', background:'transparent', color:'var(--text-dim)',
            border:'1px solid var(--line)',
            fontFamily:"'IBM Plex Mono'", fontSize:12, letterSpacing:2, textTransform:'uppercase', cursor:'pointer',
          }}>
            💬 Try Demo
          </button>
        </div>
      </div>
    </div>
  )
}
