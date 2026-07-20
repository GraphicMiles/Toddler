import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'

export default function Zoo() {
  const navigate = useNavigate()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) { setLoading(false); return }
    fetch(`${apiUrl}/models`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.models) setModels(data.models)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'llm', label: 'LLM' },
    { id: 'vision', label: 'Vision' },
    { id: 'fits', label: 'Fits My Device' },
    { id: 'trending', label: 'Trending' },
  ]

  const filteredModels = models.filter(m => {
    if (filter === 'llm') return m.task === 'chat'
    if (filter === 'vision') return ['classification', 'detection'].includes(m.task)
    return true
  })

  const platformBadge = (runsOn) => {
    if (!runsOn) return '💻☁️'
    const icons = []
    if (runsOn.includes('mobile')) icons.push('📱')
    if (runsOn.includes('desktop')) icons.push('💻')
    if (runsOn.includes('cloud')) icons.push('☁️')
    return icons.join('')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:40 }} onClick={() => setSidebarOpen(false)} />}
      {sidebarOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50, pointerEvents:'none' }}>
          <div style={{ pointerEvents:'all' }}><Sidebar onClose={() => setSidebarOpen(false)} /></div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block"><Sidebar /></div>

      {/* Mobile header */}
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div className="md:hidden" style={{ padding:'12px 16px', borderBottom:'1px solid var(--line)', background:'var(--surface)', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>☰</button>
          <span style={{ fontFamily:"'Space Grotesk'", fontWeight:700, fontSize:16 }}>Model Zoo</span>
        </div>

        {/* Main content */}
        <div style={{ flex:1, overflowY:'auto', padding: '32px' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', flexWrap:'wrap', gap:16 }}>
              <div>
                <h1 style={{ fontFamily:"'Space Grotesk'", fontSize:32, fontWeight:700, marginBottom:8 }}>Model Zoo</h1>
                <p style={{ color:'var(--text-dim)', fontSize:14 }}>Open-source models filtered by what your device can handle.</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  fontFamily:"'IBM Plex Mono'", fontSize:11, letterSpacing:1, textTransform:'uppercase',
                  padding:'6px 14px', borderRadius:100, cursor:'pointer', transition:'all 0.15s',
                  background: filter === f.id ? 'rgba(198,255,51,0.08)' : 'transparent',
                  border: `1px solid ${filter === f.id ? 'var(--lime)' : 'var(--line)'}`,
                  color: filter === f.id ? 'var(--lime)' : 'var(--text-faint)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:'center', padding:60 }}>
              <div style={{ width:32, height:32, border:'3px solid var(--line)', borderTopColor:'var(--lime)', borderRadius:'50%' }} className="animate-spin" />
            </div>
          )}

          {/* Empty */}
          {!loading && filteredModels.length === 0 && (
            <div style={{ textAlign:'center', padding:60, color:'var(--text-faint)' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
              <p style={{ fontSize:14 }}>No models found. {filter !== 'all' ? 'Try a different filter.' : 'Check back soon.'}</p>
            </div>
          )}

          {/* Model Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
            {filteredModels.map(model => (
              <div
                key={model.id}
                onClick={() => navigate(`/zoo/${model.id}`)}
                style={{
                  background:'var(--surface-2)', border:'1px solid var(--line)',
                  padding:24, borderRadius:4, cursor:'pointer', transition:'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:4 }}>
                  <h3 style={{ fontFamily:"'Space Grotesk'", fontSize:18, fontWeight:600 }}>{model.name}</h3>
                  <span style={{
                    fontFamily:"'IBM Plex Mono'", fontSize:10, padding:'3px 8px', borderRadius:4,
                    background:'rgba(198,255,51,0.1)', color:'var(--lime)',
                  }}>{platformBadge(model.runsOn)}</span>
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:11, color:'var(--text-faint)', marginBottom:10 }}>
                  {model.task === 'chat' ? 'Chat LLM' : model.task} · {model.params ? `${(model.params / 1e6).toFixed(0)}M params` : ''} · {model.sizeMb}MB · {model.license || 'Open'}
                </div>
                <div style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.6, marginBottom:12 }}>
                  {model.description || `A ${model.task} model. Runs on devices with ${model.minRamGb || 2}GB+ RAM.`}
                </div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12 }}>
                  <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--text-faint)', display:'flex', alignItems:'center', gap:4 }}>
                    ⚡ {model.minRamGb || 2}GB RAM
                  </span>
                  <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--text-faint)', display:'flex', alignItems:'center', gap:4 }}>
                    📦 {model.sizeMb}MB
                  </span>
                  {model.trainingModes && (
                    <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, color:'var(--text-faint)', display:'flex', alignItems:'center', gap:4 }}>
                      🎯 {model.trainingModes.join(' + ')}
                    </span>
                  )}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={{
                    flex:1, textAlign:'center',
                    fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:2, textTransform:'uppercase',
                    padding:'8px 16px', background:'var(--lime)', color:'#14130F', fontWeight:600, borderRadius:4,
                  }}>Train</span>
                  <span style={{
                    fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:1, textTransform:'uppercase',
                    padding:'8px 16px', background:'transparent', border:'1px solid var(--line)', color:'var(--text-dim)', borderRadius:4,
                  }}>Demo</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
