import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from './firebase'
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore'
import { buildRAGPrompt } from './rag'
import { loadModel, streamCompletion, hasWebGPU, onLlmState } from './llm'
import Onboarding from './Onboarding'
import toast from 'react-hot-toast'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const vibrate = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style }).catch(() => {})
}

export default function MobileApp() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('zoo')
  const [models, setModels] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [llmState, setLlmState] = useState({ status: 'idle' })
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef()

  // Load model catalog
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL
    if (apiUrl) {
      fetch(`${apiUrl}/models`).then(r => r.ok ? r.json() : null).then(data => {
        if (data?.models) setModels(data.models)
      }).catch(() => {})
    }
  }, [])

  // Load user projects
  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
    getDocs(q).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setProjects(data)
      if (data.length && !activeProjectId) setActiveProjectId(data[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // LLM state listener
  useEffect(() => onLlmState(setLlmState), [])

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const activeProject = projects.find(p => p.id === activeProjectId)

  // Load model when switching to chat
  useEffect(() => {
    if (tab === 'myai' && activeProject?.baseModelId && llmState.status === 'idle') {
      loadModel(activeProject.baseModelId).catch(err => console.warn('Load failed:', err.message))
    }
  }, [tab, activeProject])

  const handleDelete = async (pid) => {
    if (!window.confirm('Delete this model?')) return
    try {
      await deleteDoc(doc(db, 'projects', pid))
      setProjects(prev => prev.filter(p => p.id !== pid))
      if (activeProjectId === pid) setActiveProjectId(null)
      toast.success('Deleted')
      vibrate(ImpactStyle.Heavy)
    } catch { toast.error('Delete failed') }
  }

  const handleChatSend = async (e) => {
    e?.preventDefault()
    const text = chatInput.trim()
    if (!text || sending || !activeProject) return

    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text }])
    setSending(true)

    try {
      let systemPrompt = 'You are a helpful assistant.'
      let sources = []

      if (activeProject.trainingMode === 'rag' && activeProject.chunkCount > 0) {
        const rag = await buildRAGPrompt(activeProject.id, text)
        if (rag.systemPrompt) systemPrompt = rag.systemPrompt
        sources = rag.sources || []
      }

      const botIndex = chatMessages.length + 1
      setChatMessages(prev => [...prev, { role: 'bot', text: '', sources, loading: true }])

      await streamCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        (chunk, accumulated) => {
          setChatMessages(prev => {
            const updated = [...prev]
            updated[botIndex] = { ...updated[botIndex], text: accumulated, loading: false }
            return updated
          })
        }
      )
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'bot', text: `Error: ${err.message}`, error: true }])
    } finally {
      setSending(false)
    }
  }

  // ─── Zoo Tab ──────────────────────────────────────────────────
  const ZooTab = () => (
    <div style={{ padding:16 }}>
      <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:12 }}>🔍 Recommended for your device</div>
      {models.length === 0 && <div style={{ color:'var(--text-faint)', fontSize:13, textAlign:'center', padding:40 }}>No models loaded.</div>}
      {models.map(m => (
        <div key={m.id} style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:16, borderRadius:4, marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:4 }}>
            <h4 style={{ fontFamily:"'Space Grotesk'", fontSize:16, fontWeight:600 }}>{m.name}</h4>
          </div>
          <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--text-faint)', marginBottom:8 }}>
            {m.task === 'chat' ? 'Chat LLM' : m.task} · {m.sizeMb}MB · ~{m.minRamGb || 2}GB RAM
          </div>
          <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:9, color:'var(--lime)', marginBottom:12, display:'flex', alignItems:'center', gap:4 }}>
            ✅ Compatible with your device
          </div>
          <button
            onClick={() => { setShowOnboarding(true); setTab('train') }}
            style={{
              width:'100%', padding:'8px', background:'var(--lime)', color:'#14130F', border:'none',
              fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', fontWeight:600, cursor:'pointer',
            }}
          >
            Train This Model
          </button>
        </div>
      ))}
    </div>
  )

  // ─── My AI Tab ────────────────────────────────────────────────
  const MyAITab = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 140px)' }}>
      {/* Project selector */}
      {projects.length > 0 && (
        <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--line)', background:'var(--surface)', display:'flex', gap:8, overflowX:'auto' }}>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => { setActiveProjectId(p.id); setChatMessages([]) }}
              style={{
                padding:'6px 12px', borderRadius:100, whiteSpace:'nowrap',
                fontFamily:"'IBM Plex Mono'", fontSize:9, letterSpacing:1, textTransform:'uppercase',
                background: activeProjectId === p.id ? 'rgba(198,255,51,0.1)' : 'transparent',
                border: `1px solid ${activeProjectId === p.id ? 'var(--lime)' : 'var(--line)'}`,
                color: activeProjectId === p.id ? 'var(--lime)' : 'var(--text-faint)',
                cursor:'pointer',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* LLM status */}
      <div style={{ padding:'6px 16px', background: llmState.status === 'ready' ? 'rgba(198,255,51,0.05)' : 'rgba(125,57,235,0.08)', borderBottom:'1px solid var(--line)', textAlign:'center' }}>
        <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:9, color: llmState.status === 'ready' ? 'var(--lime)' : 'var(--purple)' }}>
          {llmState.status === 'loading' ? `🧠 Loading... ${llmState.progress || 0}%` : llmState.status === 'ready' ? `🧠 ${activeProject?.baseModelName || 'Model'} · On-device` : '⏳ Initializing...'}
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:16 }}>
        {chatMessages.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:24, marginBottom:8 }}>💬</div>
            <p style={{ color:'var(--text-faint)', fontSize:13 }}>Ask your model anything.</p>
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} style={{ marginBottom:14 }}>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:9, letterSpacing:2, textTransform:'uppercase', marginBottom:4, color: msg.role === 'user' ? 'var(--text-dim)' : 'var(--purple)', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              {msg.role === 'user' ? 'USER' : 'TODDLER'}
            </div>
            <div style={{
              fontSize:13, lineHeight:1.6, marginLeft: msg.role === 'user' ? 32 : 0,
              background: msg.role === 'user' ? 'var(--surface-2)' : 'transparent',
              border: msg.role === 'user' ? '1px solid var(--line)' : 'none',
              borderLeft: msg.role === 'bot' ? '2px solid var(--purple)' : 'none',
              padding: msg.role === 'user' ? '10px 14px' : '0 0 0 12px',
              color: msg.error ? 'var(--danger)' : msg.role === 'user' ? 'var(--text)' : 'var(--text-dim)',
            }}>
              {msg.loading ? <span style={{ color:'var(--purple)', animation:'typing 1.2s infinite' }}>▊</span> : msg.text}
            </div>
            {msg.sources?.length > 0 && !msg.loading && (
              <div style={{ marginTop:6, padding:'6px 10px', background:'rgba(198,255,51,0.04)', border:'1px solid rgba(198,255,51,0.12)', borderRadius:4, marginLeft: msg.role === 'user' ? 32 : 0 }}>
                {msg.sources.map((s, j) => (
                  <div key={j} style={{ fontFamily:"'IBM Plex Mono'", fontSize:9, color:'var(--lime)', marginBottom: j < msg.sources.length - 1 ? 2 : 0 }}>
                    📎 {s.source} · chunk_{String(s.chunkIndex).padStart(3, '0')} · {Math.round((s.score || 0) * 100)}%
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleChatSend} style={{ display:'flex', gap:8, padding:12, borderTop:'1px solid var(--line)', background:'var(--surface-2)' }}>
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder={llmState.status === 'ready' ? 'Type a message...' : 'Loading...'}
          disabled={sending || llmState.status !== 'ready' || !activeProject}
          style={{ flex:1, padding:'10px 12px', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:4, color:'var(--text)', fontSize:13, outline:'none' }}
        />
        <button type="submit" disabled={sending || !chatInput.trim() || llmState.status !== 'ready'} style={{ padding:'10px 14px', background: (!sending && chatInput.trim() && llmState.status === 'ready') ? 'var(--lime)' : 'var(--line)', color:'#14130F', border:'none', borderRadius:4, fontFamily:"'IBM Plex Mono'", fontSize:11, fontWeight:600, cursor:'pointer' }}>▲</button>
      </form>
    </div>
  )

  // ─── Train Tab ────────────────────────────────────────────────
  const TrainTab = () => {
    if (showOnboarding) return <Onboarding onComplete={(p) => { setProjects(prev => [...prev, p]); setActiveProjectId(p.id); setShowOnboarding(false); setTab('myai'); toast.success('Model trained!'); vibrate(ImpactStyle.Heavy) }} />

    const activeJobs = projects.filter(p => ['queued','training'].includes(p.status))
    const finishedJobs = projects.filter(p => p.status === 'trained')

    return (
      <div style={{ padding:16 }}>
        {activeJobs.length > 0 && (
          <>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--purple)', marginBottom:12 }}>Currently Training</div>
            {activeJobs.map(j => (
              <div key={j.id} style={{ background:'var(--surface-2)', border:'1px solid var(--purple)', padding:16, borderRadius:4, marginBottom:12 }}>
                <h4 style={{ fontFamily:"'Space Grotesk'", fontSize:14, fontWeight:600, marginBottom:4 }}>{j.name}</h4>
                <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--text-faint)', marginBottom:8 }}>{j.baseModelName} · {j.trainingMode}</div>
                <div style={{ width:'100%', height:4, background:'var(--bg)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ width:`${j.progress || 0}%`, height:'100%', background:'var(--purple)', borderRadius:2 }} />
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:9, color:'var(--text-faint)', marginTop:4 }}>{j.progress || 0}%</div>
              </div>
            ))}
          </>
        )}

        <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:12, marginTop: activeJobs.length ? 24 : 0 }}>Completed</div>
        {finishedJobs.length === 0 && <div style={{ color:'var(--text-faint)', fontSize:13, textAlign:'center', padding:40 }}>No completed jobs yet.</div>}
        {finishedJobs.map(j => (
          <div key={j.id} style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:14, borderRadius:4, marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h4 style={{ fontFamily:"'Space Grotesk'", fontSize:14, fontWeight:600, marginBottom:2 }}>{j.name}</h4>
              <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--text-faint)' }}>{j.baseModelName} · {j.chunkCount || 0} chunks</div>
            </div>
            <button onClick={() => { setActiveProjectId(j.id); setTab('myai') }} style={{ padding:'6px 12px', background:'transparent', border:'1px solid var(--line)', color:'var(--text)', fontFamily:"'IBM Plex Mono'", fontSize:9, letterSpacing:1, textTransform:'uppercase', cursor:'pointer' }}>💬 Chat</button>
          </div>
        ))}
      </div>
    )
  }

  // ─── Profile Tab ──────────────────────────────────────────────
  const ProfileTab = () => (
    <div style={{ padding:16 }}>
      <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:20, borderRadius:4, marginBottom:16, textAlign:'center' }}>
        <div style={{ width:48, height:48, background:'var(--surface)', border:'1px solid var(--line)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:20 }}>👤</div>
        <div style={{ fontWeight:600, marginBottom:4 }}>{auth.currentUser?.email || 'User'}</div>
        <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--lime)' }}>Free Plan</div>
      </div>

      <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:16, borderRadius:4, marginBottom:16 }}>
        <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:12 }}>Device</div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
          <span style={{ color:'var(--text-dim)' }}>Platform</span>
          <span>{Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'Web'}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
          <span style={{ color:'var(--text-dim)' }}>RAM</span>
          <span>{navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown'}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
          <span style={{ color:'var(--text-dim)' }}>WebGPU</span>
          <span>Checking...</span>
        </div>
      </div>

      <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', padding:16, borderRadius:4, marginBottom:16 }}>
        <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text-faint)', marginBottom:12 }}>Stats</div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
          <span style={{ color:'var(--text-dim)' }}>Models Trained</span>
          <span>{projects.filter(p => p.status === 'trained').length}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
          <span style={{ color:'var(--text-dim)' }}>Total Chunks</span>
          <span>{projects.reduce((sum, p) => sum + (p.chunkCount || 0), 0)}</span>
        </div>
      </div>

      <button
        onClick={() => auth.signOut()}
        style={{
          width:'100%', padding:14, background:'transparent',
          border:'1px solid var(--danger)', color:'var(--danger)',
          fontFamily:"'IBM Plex Mono'", fontSize:11, letterSpacing:2, textTransform:'uppercase', cursor:'pointer',
        }}
      >
        Log out
      </button>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:"'Inter', sans-serif", display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <header style={{ padding:'12px 16px', background:'var(--surface)', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:14, height:14, border:'2px solid var(--lime)', display:'inline-block', position:'relative' }}>
            <span style={{ position:'absolute', top:-2, left:-2, width:3, height:3, borderTop:'2px solid var(--lime)', borderLeft:'2px solid var(--lime)' }} />
            <span style={{ position:'absolute', bottom:-2, right:-2, width:3, height:3, borderBottom:'2px solid var(--lime)', borderRight:'2px solid var(--lime)' }} />
          </span>
          <span style={{ fontFamily:"'Space Grotesk'", fontWeight:700, fontSize:15 }}>TODDLER</span>
        </div>
        <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:9, color:'var(--lime)', display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:5, height:5, background:'var(--lime)', borderRadius:'50%' }} />
          Online
        </div>
      </header>

      {/* Content */}
      <main style={{ flex:1, overflowY:'auto' }}>
        {tab === 'zoo' && <ZooTab />}
        {tab === 'myai' && <MyAITab />}
        {tab === 'train' && <TrainTab />}
        {tab === 'profile' && <ProfileTab />}
      </main>

      {/* Tab Bar */}
      <div style={{ display:'flex', borderTop:'1px solid var(--line)', background:'var(--surface)' }}>
        {[
          { id:'zoo', icon:'🔍', label:'Zoo' },
          { id:'myai', icon:'🧠', label:'My AI' },
          { id:'train', icon:'⚡', label:'Train' },
          { id:'profile', icon:'👤', label:'Profile' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex:1, textAlign:'center', padding:'10px 4px 8px', background:'none', border:'none',
              fontFamily:"'IBM Plex Mono'", fontSize:9, letterSpacing:1, textTransform:'uppercase',
              color: tab === t.id ? 'var(--lime)' : 'var(--text-faint)',
              borderTop: `2px solid ${tab === t.id ? 'var(--lime)' : 'transparent'}`,
              cursor:'pointer',
            }}
          >
            <span style={{ fontSize:18, display:'block', marginBottom:2 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <style>{`@keyframes typing { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}
