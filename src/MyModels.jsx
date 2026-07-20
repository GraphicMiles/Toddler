import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from './firebase'
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from './components/Sidebar'
import toast from 'react-hot-toast'

export default function MyModels() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
    getDocs(q)
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        data.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0
          const tb = b.createdAt?.seconds || 0
          return tb - ta
        })
        setProjects(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (pid, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'projects', pid))
      setProjects(prev => prev.filter(p => p.id !== pid))
      toast.success('Deleted.')
    } catch { toast.error('Delete failed') }
  }

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
        <div className="md:hidden" style={{ padding:'12px 16px', borderBottom:'1px solid var(--line)', background:'var(--surface)', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>☰</button>
          <span style={{ fontFamily:"'Space Grotesk'", fontWeight:700, fontSize:16 }}>My Models</span>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:32 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32, flexWrap:'wrap', gap:16 }}>
            <div>
              <h1 style={{ fontFamily:"'Space Grotesk'", fontSize:32, fontWeight:700, marginBottom:4 }}>My Models</h1>
              <p style={{ color:'var(--text-dim)', fontSize:14 }}>Your trained AI models. Chat, export, or publish to the marketplace.</p>
            </div>
            <button
              onClick={() => navigate('/zoo')}
              style={{
                padding:'10px 20px', background:'var(--lime)', color:'#14130F', border:'none',
                fontFamily:"'IBM Plex Mono'", fontSize:11, letterSpacing:2, textTransform:'uppercase', fontWeight:600, cursor:'pointer',
              }}
            >
              + Train New Model
            </button>
          </div>

          {loading && (
            <div style={{ textAlign:'center', padding:60 }}>
              <div style={{ width:32, height:32, border:'3px solid var(--line)', borderTopColor:'var(--lime)', borderRadius:'50%' }} className="animate-spin" />
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div style={{ textAlign:'center', padding:60, background:'var(--surface-2)', border:'1px dashed var(--line)', borderRadius:4 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🧠</div>
              <h3 style={{ fontFamily:"'Space Grotesk'", fontSize:20, fontWeight:600, marginBottom:8 }}>No models yet</h3>
              <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:20 }}>Browse the Zoo and train your first model.</p>
              <button
                onClick={() => navigate('/zoo')}
                style={{ padding:'10px 20px', background:'var(--lime)', color:'#14130F', border:'none', fontFamily:"'IBM Plex Mono'", fontSize:11, letterSpacing:2, textTransform:'uppercase', fontWeight:600, cursor:'pointer' }}
              >
                Browse Zoo →
              </button>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {projects.map(p => (
              <div
                key={p.id}
                style={{
                  background:'var(--surface-2)', border:'1px solid var(--line)',
                  padding:24, borderRadius:4, cursor:'pointer', transition:'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
                onClick={() => navigate(`/models/${p.id}`)}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', flexWrap:'wrap', gap:12 }}>
                  <div>
                    <h3 style={{ fontFamily:"'Space Grotesk'", fontSize:18, fontWeight:600, marginBottom:4 }}>{p.name}</h3>
                    <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, color:'var(--text-faint)' }}>
                      {p.baseModelName || p.baseModelId} · {p.trainingMode === 'rag' ? 'RAG' : 'Fine-tune'} · {p.chunkCount || 0} chunks
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {p.status === 'trained' ? (
                      <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, padding:'3px 10px', background:'rgba(198,255,51,0.1)', color:'var(--lime)', borderRadius:4 }}>✅ Trained</span>
                    ) : p.status === 'training' ? (
                      <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, padding:'3px 10px', background:'rgba(125,57,235,0.15)', color:'var(--purple)', borderRadius:4 }}>⚡ Training</span>
                    ) : (
                      <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, padding:'3px 10px', background:'rgba(110,105,92,0.2)', color:'var(--text-faint)', borderRadius:4 }}>{p.status || 'Draft'}</span>
                    )}
                  </div>
                </div>

                <div style={{ display:'flex', gap:8, marginTop:16, flexWrap:'wrap' }}>
                  <span
                    onClick={(e) => { e.stopPropagation(); navigate(`/models/${p.id}`) }}
                    style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:1, textTransform:'uppercase', padding:'6px 14px', background:'var(--lime)', color:'#14130F', borderRadius:4, fontWeight:600, cursor:'pointer' }}
                  >💬 Chat</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); navigate(`/models/${p.id}?tab=api`) }}
                    style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:1, textTransform:'uppercase', padding:'6px 14px', border:'1px solid var(--line)', color:'var(--text-dim)', borderRadius:4, cursor:'pointer' }}
                  >🔑 API Key</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name) }}
                    style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:1, textTransform:'uppercase', padding:'6px 14px', border:'1px solid var(--line)', color:'var(--danger)', borderRadius:4, cursor:'pointer' }}
                  >🗑 Delete</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
