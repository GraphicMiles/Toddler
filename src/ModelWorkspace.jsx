import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth, db } from './firebase'
import { doc, getDoc } from 'firebase/firestore'
import Sidebar from './components/Sidebar'
import toast from 'react-hot-toast'

/**
 * ModelWorkspace — Web control tower view of a trained model.
 *
 * Chat proxies through the backend /chat endpoint.
 * Does NOT load web-llm or run inference locally.
 * The web app is a manager, not a trainer/runner.
 */
export default function ModelWorkspace() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef()

  useEffect(() => {
    if (!auth.currentUser || !projectId) return
    getDoc(doc(db, 'projects', projectId))
      .then(snap => {
        if (snap.exists()) setProject({ id: snap.id, ...snap.data() })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending || !project) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setSending(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL
      if (!apiUrl) throw new Error('VITE_API_URL not configured')

      const token = await auth.currentUser?.getIdToken()
      const formData = new FormData()
      formData.append('project_id', projectId)
      formData.append('text', text)

      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'bot',
        text: data.response || data.prediction || 'No response.',
        sources: data.sources || [],
        latency: data.latency_ms,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: `Error: ${err.message}`,
        error: true,
      }])
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
              {project.status === 'trained' ? `Trained · ${project.trainingMode === 'rag' ? 'RAG' : 'Fine-tune'} · ${project.chunkCount || 0} chunks` : project.status || 'Queued'}
            </div>
            <h2 style={{ fontFamily:"'Space Grotesk'", fontSize:24, fontWeight:700 }}>{project.name}</h2>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, padding:'6px 14px', border:'1px solid var(--line)', color:'var(--text-dim)', borderRadius:4, cursor:'pointer' }}>🔑 API Key</span>
            <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, padding:'6px 14px', border:'1px solid var(--line)', color:'var(--text-dim)', borderRadius:4, cursor:'pointer' }}>📥 Export</span>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          padding:'8px 24px',
          background: project.status === 'trained' ? 'rgba(198,255,51,0.05)' : 'rgba(125,57,235,0.08)',
          borderBottom:'1px solid var(--line)', textAlign:'center',
        }}>
          <span style={{
            fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:1,
            color: project.status === 'trained' ? 'var(--lime)' : 'var(--purple)',
          }}>
            {project.status === 'trained'
              ? `🌐 ${project.baseModelName || 'Model'} · Inference via backend proxy`
              : `⏳ Status: ${project.status || 'queued'} · Waiting for training device`}
          </span>
        </div>

        {/* Chat Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>
          {project.status !== 'trained' && (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
              <h3 style={{ fontFamily:"'Space Grotesk'", fontSize:20, fontWeight:600, marginBottom:8 }}>Waiting for Training</h3>
              <p style={{ color:'var(--text-dim)', fontSize:14, maxWidth:400, margin:'0 auto', lineHeight:1.6 }}>
                This model is {project.status || 'queued'}. Open the Toddler app on your phone or desktop to pick up the training job.
              </p>
            </div>
          )}

          {project.status === 'trained' && messages.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>💬</div>
              <h3 style={{ fontFamily:"'Space Grotesk'", fontSize:20, fontWeight:600, marginBottom:8 }}>Ready to chat</h3>
              <p style={{ color:'var(--text-dim)', fontSize:14, maxWidth:400, margin:'0 auto', lineHeight:1.6 }}>
                {project.trainingMode === 'rag'
                  ? `Your model has ${project.chunkCount || 0} knowledge chunks. Ask it anything about your data. Inference runs on the backend.`
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
                {msg.text}
              </div>

              {msg.sources?.length > 0 && (
                <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(198,255,51,0.04)', border:'1px solid rgba(198,255,51,0.12)', borderRadius:4 }}>
                  {msg.sources.map((s, j) => (
                    <div key={j} style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--lime)', marginBottom: j < msg.sources.length - 1 ? 4 : 0 }}>
                      📎 {s.source || s} {s.score ? `· ${Math.round(s.score * 100)}%` : ''}
                    </div>
                  ))}
                </div>
              )}

              {msg.latency && (
                <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:9, color:'var(--text-faint)', marginTop:4, textAlign:'right' }}>
                  ⚡ {msg.latency}ms · Backend proxy
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
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder={project.status === 'trained' ? 'Type a message...' : 'Waiting for training to complete...'}
            disabled={sending || project.status !== 'trained'}
            style={{
              flex:1, padding:'12px 16px', background:'var(--bg)', border:'1px solid var(--line)',
              borderRadius:4, color:'var(--text)', fontSize:14, fontFamily:"'Inter', sans-serif", outline:'none',
            }}
          />
          <button type="submit" disabled={sending || !input.trim() || project.status !== 'trained'}
            style={{
              padding:'12px 24px',
              background: (!sending && input.trim() && project.status === 'trained') ? 'var(--lime)' : 'var(--line)',
              color:'#14130F', border:'none', borderRadius:4,
              fontFamily:"'IBM Plex Mono'", fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase',
              cursor: (!sending && input.trim() && project.status === 'trained') ? 'pointer' : 'default',
            }}>
            Send ▲
          </button>
        </form>
      </div>
      <style>{`.ml-auto{margin-left:auto}`}</style>
    </div>
  )
}
