import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { auth, db } from './firebase'
import { doc, getDoc } from 'firebase/firestore'
import { buildRAGPrompt } from './rag'
import { loadModel, streamCompletion, hasWebGPU, onLlmState } from './llm'
import Sidebar from './components/Sidebar'
import toast from 'react-hot-toast'

export default function ModelWorkspace() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [llmState, setLlmState] = useState({ status: 'idle' })
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef()

  // Load project
  useEffect(() => {
    if (!auth.currentUser || !projectId) return
    getDoc(doc(db, 'projects', projectId))
      .then(snap => {
        if (snap.exists()) setProject({ id: snap.id, ...snap.data() })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  // Listen to LLM state
  useEffect(() => onLlmState(setLlmState), [])

  // Auto-load model when project is ready
  useEffect(() => {
    if (!project || project.status !== 'trained') return
    if (project.baseModelId && llmState.status === 'idle') {
      loadModel(project.baseModelId).catch(err => {
        console.warn('Model load failed:', err.message)
      })
    }
  }, [project, llmState.status])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setSending(true)

    try {
      let systemPrompt = 'You are a helpful assistant.'
      let sources = []

      // RAG: retrieve relevant chunks
      if (project.trainingMode === 'rag' && project.chunkCount > 0) {
        const rag = await buildRAGPrompt(projectId, text)
        if (rag.systemPrompt) systemPrompt = rag.systemPrompt
        sources = rag.sources || []
      }

      // Add placeholder for bot response
      const botIndex = messages.length + 1
      setMessages(prev => [...prev, { role: 'bot', text: '', sources, loading: true }])

      // Stream LLM response
      const fullText = await streamCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        (chunk, accumulated) => {
          setMessages(prev => {
            const updated = [...prev]
            updated[botIndex] = { ...updated[botIndex], text: accumulated, loading: false }
            return updated
          })
        }
      )
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'bot') {
          updated[updated.length - 1] = { ...last, text: `Error: ${err.message}`, error: true, loading: false }
        } else {
          updated.push({ role: 'bot', text: `Error: ${err.message}`, error: true })
        }
        return updated
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <div className="hidden md:block"><Sidebar /></div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:32, height:32, border:'3px solid var(--line)', borderTopColor:'var(--lime)', borderRadius:'50%' }} className="animate-spin" />
      </div>
    </div>
  )

  if (!project) return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <div className="hidden md:block"><Sidebar /></div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <p style={{ color:'var(--text-dim)' }}>Model not found.</p>
        <button onClick={() => navigate('/models')} style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, padding:'8px 16px', border:'1px solid var(--line)', background:'transparent', color:'var(--text-dim)', cursor:'pointer' }}>← My Models</button>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:"'Inter', sans-serif" }}>
      {sidebarOpen && <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:40 }} onClick={() => setSidebarOpen(false)} />}
      {sidebarOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50, pointerEvents:'none' }}>
          <div style={{ pointerEvents:'all' }}><Sidebar onClose={() => setSidebarOpen(false)} /></div>
        </div>
      )}
      <div className="hidden md:block"><Sidebar /></div>

      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        {/* Mobile header */}
        <div className="md:hidden" style={{ padding:'12px 16px', borderBottom:'1px solid var(--line)', background:'var(--surface)', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>☰</button>
          <span style={{ fontFamily:"'Space Grotesk'", fontWeight:700, fontSize:16 }}>{project.name}</span>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex" style={{ padding:'20px 32px', borderBottom:'1px solid var(--line)', background:'var(--surface)', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--lime)', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:6, height:6, background:'var(--lime)', borderRadius:'50%', display:'inline-block' }} />
              Trained · {project.trainingMode === 'rag' ? 'RAG' : 'Fine-tune'} · {project.chunkCount || 0} chunks
            </div>
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:24, fontWeight:700 }}>{project.name}</h2>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, padding:'6px 14px', border:'1px solid var(--line)', color:'var(--text-dim)', borderRadius:4, cursor:'pointer' }}>🔑 API Key</span>
            <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, padding:'6px 14px', border:'1px solid var(--line)', color:'var(--text-dim)', borderRadius:4, cursor:'pointer' }}>📥 Export</span>
          </div>
        </div>

        {/* LLM Status Bar */}
        <div style={{
          padding:'8px 24px', background: llmState.status === 'ready' ? 'rgba(198,255,51,0.05)' : llmState.status === 'loading' ? 'rgba(125,57,235,0.08)' : 'rgba(110,105,92,0.1)',
          borderBottom:'1px solid var(--line)', textAlign:'center',
        }}>
          <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:1, color: llmState.status === 'ready' ? 'var(--lime)' : llmState.status === 'loading' ? 'var(--purple)' : 'var(--text-faint)' }}>
            {llmState.status === 'loading' && `🧠 Loading ${project.baseModelName || 'model'}... ${llmState.progress || 0}%`}
            {llmState.status === 'ready' && `🧠 ${project.baseModelName || 'Model'} loaded · WebGPU · Ready`}
            {llmState.status === 'error' && `⚠️ Model load failed: ${llmState.error}. Falling back to cloud.`}
            {llmState.status === 'idle' && '⏳ Initializing...'}
          </span>
        </div>

        {/* Chat Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>💬</div>
              <h3 style={{ fontFamily:"'Space Grotesk'", fontSize:20, fontWeight:600, marginBottom:8 }}>Ready to chat</h3>
              <p style={{ color:'var(--text-dim)', fontSize:14, maxWidth:400, margin:'0 auto', lineHeight:1.6 }}>
                {project.trainingMode === 'rag'
                  ? `Your model has ${project.chunkCount || 0} knowledge chunks. Ask it anything about your data.`
                  : 'Your model has been fine-tuned. Ask it anything.'}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom:20, maxWidth:'80%' }} className={msg.role === 'user' ? 'ml-auto' : ''}>
              <div style={{
                fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase', marginBottom:6,
                color: msg.role === 'user' ? 'var(--text-dim)' : 'var(--purple)',
                textAlign: msg.role === 'user' ? 'right' : 'left',
              }}>
                {msg.role === 'user' ? 'USER' : 'TODDLER'}
              </div>
              <div style={{
                fontSize:14, lineHeight:1.7,
                background: msg.role === 'user' ? 'var(--surface-2)' : 'transparent',
                border: msg.role === 'user' ? '1px solid var(--line)' : 'none',
                borderLeft: msg.role === 'bot' ? '2px solid var(--purple)' : 'none',
                padding: msg.role === 'user' ? '14px 18px' : '0 0 0 14px',
                borderRadius: msg.role === 'user' ? 4 : 0,
                color: msg.error ? 'var(--danger)' : msg.role === 'user' ? 'var(--text)' : 'var(--text-dim)',
              }}>
                {msg.loading ? (
                  <span style={{ color:'var(--purple)', animation:'typing 1.2s infinite' }}>▊</span>
                ) : (
                  msg.text || (msg.role === 'bot' ? '...' : '')
                )}
              </div>

              {/* RAG Sources */}
              {msg.sources && msg.sources.length > 0 && !msg.loading && (
                <div style={{
                  marginTop:10, padding:'8px 12px',
                  background:'rgba(198,255,51,0.04)', border:'1px solid rgba(198,255,51,0.12)', borderRadius:4,
                }}>
                  {msg.sources.map((s, j) => (
                    <div key={j} style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--lime)', marginBottom: j < msg.sources.length - 1 ? 4 : 0 }}>
                      📎 {s.source} · chunk_{String(s.chunkIndex).padStart(3, '0')} · {s.score ? `${Math.round(s.score * 100)}%` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{
          display:'flex', gap:12, padding:'16px 32px', borderTop:'1px solid var(--line)', background:'var(--surface-2)',
        }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={llmState.status === 'ready' ? 'Type a message...' : 'Loading model...'}
            disabled={sending || llmState.status !== 'ready'}
            style={{
              flex:1, padding:'12px 16px', background:'var(--bg)', border:'1px solid var(--line)',
              borderRadius:4, color:'var(--text)', fontSize:14, fontFamily:"'Inter', sans-serif", outline:'none',
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || llmState.status !== 'ready'}
            style={{
              padding:'12px 24px',
              background: (!sending && input.trim() && llmState.status === 'ready') ? 'var(--lime)' : 'var(--line)',
              color:'#14130F', border:'none', borderRadius:4,
              fontFamily:"'IBM Plex Mono'", fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase',
              cursor: (!sending && input.trim() && llmState.status === 'ready') ? 'pointer' : 'default',
            }}
          >
            Send ▲
          </button>
        </form>
      </div>

      <style>{`@keyframes typing { 0%,100%{opacity:1} 50%{opacity:0.3} } .ml-auto{margin-left:auto}`}</style>
    </div>
  )
}
