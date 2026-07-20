import React, { useState, useEffect } from 'react'
import { auth, db } from './firebase'
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore'
import { toast } from 'react-hot-toast'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const vibrate = (s = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style: s }).catch(() => {})
}

const API = import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'

// ─── SVG Icon ────────────────────────────────────────────────────

function I({ name, size = 16 }) {
  const p = {
    logo: <><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><polyline points="2,8 2,2 8,2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="16,22 22,22 22,16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
    zoo: <><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    sandbox: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    api: <><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    device: <><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><line x1="12" y1="18" x2="12" y2="18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
    signout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.5" fill="none"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    check: <><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    unlink: <><path d="M18.84 12.25l1.72-1.71a4.29 4.29 0 00-6.07-6.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M5.16 11.75l-1.72 1.71a4.29 4.29 0 006.07 6.07l1.72-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/><line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polyline points="12 5 19 12 12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    refresh: <><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    menu: <><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>{p[name]}</svg>
}


// ─── Shared Styles ───────────────────────────────────────────────

const S = {
  bg: '#14130F', surface: '#1D1B16', surface2: '#26231C', surface3: '#2E2A20',
  line: '#38352B', text: '#F2EFE6', dim: '#A8A296', faint: '#6E695C',
  lime: '#C6FF33', purple: '#7D39EB', danger: '#FF5C3E',
}


// ─── Dashboard ───────────────────────────────────────────────────

export default function Dashboard() {
  const [tab, setTab] = useState('zoo')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [projects, setProjects] = useState([])
  const [devices, setDevices] = useState([])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 839px)')
    const h = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', h)
    h(mq)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    if (!auth.currentUser) return
    getDocs(query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid)))
      .then(s => { const d = s.docs.map(x => ({ id: x.id, ...x.data() })); d.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); setProjects(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!auth.currentUser) return
    getDocs(query(collection(db, 'users', auth.currentUser.uid, 'devices')))
      .then(s => setDevices(s.docs.map(x => ({ id: x.id, ...x.data() }))))
      .catch(() => {})
  }, [])

  const nav = [
    { id: 'zoo', icon: 'zoo', label: 'Model Zoo' },
    { id: 'sandbox', icon: 'sandbox', label: 'Sandbox' },
    { id: 'apis', icon: 'api', label: 'APIs' },
    { id: 'devices', icon: 'device', label: 'Devices' },
  ]

  const sidebarEl = (
    <>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${S.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <I name="logo" size={18} />
        <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 14, color: S.text }}>TODDLER</span>
        {isMobile && <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: S.faint, cursor: 'pointer', padding: 4 }}><I name="close" size={18} /></button>}
      </div>
      <nav style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {nav.map(item => (
          <div key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false) }} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
            borderRadius: 6, cursor: 'pointer', fontSize: 12,
            color: tab === item.id ? S.text : S.dim,
            background: tab === item.id ? 'rgba(198,255,51,0.08)' : 'transparent',
            borderLeft: `2px solid ${tab === item.id ? S.lime : 'transparent'}`,
            fontWeight: tab === item.id ? 500 : 400, transition: 'all 0.15s',
          }}>
            <I name={item.icon} size={16} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div style={{ padding: '10px 6px', borderTop: `1px solid ${S.line}` }}>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint, padding: '4px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{auth.currentUser?.email}</div>
        <div onClick={() => auth.signOut()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', color: S.faint, fontSize: 11, cursor: 'pointer', borderRadius: 5 }}>{<I name="signout" size={14} />} Sign out</div>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: S.bg, color: S.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
      {isMobile && sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={() => setSidebarOpen(false)} />}
      <aside style={{
        width: 216, background: S.surface, borderRight: `1px solid ${S.line}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        ...(isMobile ? { position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.2s ease' } : {}),
      }}>
        {sidebarEl}
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.line}`, background: S.surface, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: S.dim, cursor: 'pointer', padding: 4 }}><I name="menu" size={20} /></button>}
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14 }}>{nav.find(n => n.id === tab)?.label}</span>
          </div>
          {tab === 'zoo' && devices.length > 0 && <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint }}>fit checked against {devices[0]?.name} / {devices[0]?.ramGb}GB</span>}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'zoo' && <ZooTab devices={devices} />}
          {tab === 'sandbox' && <SandboxTab projects={projects} />}
          {tab === 'apis' && <ApisTab projects={projects} />}
          {tab === 'devices' && <DevicesTab devices={devices} setDevices={setDevices} />}
        </div>
      </div>
    </div>
  )
}


// ─── Zoo ─────────────────────────────────────────────────────────

function ZooTab({ devices }) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}/models`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { if (data?.models) setModels(data.models) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = models.filter(m => {
    if (filter === 'llm') return m.task === 'chat'
    if (filter === 'vision') return m.task !== 'chat'
    return true
  })

  const maxRam = devices.reduce((max, d) => Math.max(max, d.ramGb || 0), 0)
  const fits = (m) => maxRam > 0 ? (m.minRamGb || 2) <= maxRam : false

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div style={{ width: 20, height: 20, border: `2px solid ${S.line}`, borderTopColor: S.lime, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: 64, maxWidth: 300, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: S.text, marginBottom: 6 }}>Failed to load models</div>
      <div style={{ fontSize: 12, color: S.faint }}>{error}</div>
    </div>
  )

  if (filtered.length === 0) return (
    <div style={{ textAlign: 'center', padding: 64, maxWidth: 300, margin: '0 auto' }}>
      <div style={{ width: 44, height: 44, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.surface2, borderRadius: 10, border: `1px solid ${S.line}` }}>
        <I name="zoo" size={20} />
      </div>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: S.text, marginBottom: 6 }}>No models yet</div>
      <div style={{ fontSize: 12, color: S.faint, lineHeight: 1.6, marginBottom: 18 }}>Browse the Zoo and pick something that fits your device.</div>
    </div>
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ id: 'all', label: 'All models' }, { id: 'llm', label: 'Language' }, { id: 'vision', label: 'Vision' }].map(f => (
          <span key={f.id} onClick={() => setFilter(f.id)} style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
            border: `1px solid ${filter === f.id ? S.line : 'transparent'}`,
            background: filter === f.id ? S.surface3 : 'transparent',
            color: filter === f.id ? S.text : S.faint, transition: 'all 0.15s',
          }}>{f.label}</span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {filtered.map(m => {
          const ok = fits(m)
          return (
            <div key={m.id} style={{
              background: S.surface, border: `1px solid ${S.line}`, padding: 16, borderRadius: 8,
              display: 'flex', flexDirection: 'column', gap: 6,
              transition: 'border-color 0.15s, transform 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = S.faint; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = S.line; e.currentTarget.style.transform = 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <h4 style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 600, color: S.text }}>{m.name}</h4>
                <span style={{
                  fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
                  padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
                  background: ok ? 'rgba(198,255,51,0.10)' : S.surface2,
                  color: ok ? S.lime : S.faint,
                  border: `1px solid ${ok ? 'rgba(198,255,51,0.3)' : S.line}`,
                }}>{ok ? '✓ Fits' : `Needs ${m.minRamGb || 2}GB`}</span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint }}>{m.task === 'chat' ? 'LLM' : m.task} / {m.sizeMb} MB / {m.minRamGb || 2} GB RAM</div>
              <div style={{ fontSize: 12, color: S.dim, lineHeight: 1.5 }}>{m.description || `${m.name} for on-device use.`}</div>
              <button style={{
                marginTop: 'auto', fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
                fontWeight: 600, padding: '8px 12px', borderRadius: 6, cursor: 'pointer', width: '100%',
                background: 'transparent', border: `1px solid ${S.line}`, color: S.dim, transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = S.faint; e.currentTarget.style.color = S.text }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = S.line; e.currentTarget.style.color = S.dim }}>
                Train this model
              </button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}


// ─── Sandbox ─────────────────────────────────────────────────────

function SandboxTab({ projects }) {
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const trained = projects.filter(p => p.status === 'trained')
  const selected = projects.find(p => p.id === selectedId)

  useEffect(() => { if (trained.length > 0 && !selectedId) setSelectedId(trained[0].id) }, [trained.length])

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending || !selected) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setSending(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const fd = new FormData()
      fd.append('project_id', selectedId)
      fd.append('text', text)
      const res = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `HTTP ${res.status}`) }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'bot', text: data.response || 'No response.', sources: data.sources || [] }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: err.message, error: true }])
    } finally { setSending(false) }
  }

  if (trained.length === 0) return (
    <div style={{ textAlign: 'center', padding: 64, maxWidth: 300, margin: '0 auto' }}>
      <div style={{ width: 44, height: 44, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.surface2, borderRadius: 10, border: `1px solid ${S.line}` }}>
        <I name="sandbox" size={20} />
      </div>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: S.text, marginBottom: 6 }}>No trained models</div>
      <div style={{ fontSize: 12, color: S.faint, lineHeight: 1.6 }}>Train a model from the Zoo to use the sandbox.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.line}`, background: S.surface, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14, color: S.text }}>Sandbox</span>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, background: S.surface2, color: S.faint, border: `1px solid ${S.line}` }}>Retrieval preview</span>
      </div>
      <div style={{ padding: '6px 14px', borderBottom: `1px solid ${S.line}`, background: S.surface, display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
        {trained.map(p => (
          <span key={p.id} onClick={() => { setSelectedId(p.id); setMessages([]) }} style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', whiteSpace: 'nowrap',
            border: `1px solid ${selectedId === p.id ? S.line : 'transparent'}`,
            background: selectedId === p.id ? S.surface3 : 'transparent',
            color: selectedId === p.id ? S.text : S.faint, transition: 'all 0.15s',
          }}>{p.name}</span>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', padding: '48px 0' }}><p style={{ color: S.faint, fontSize: 12 }}>Ask <span style={{ color: S.text }}>{selected?.name}</span> a question.</p></div>}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 14, maxWidth: msg.role === 'user' ? '80%' : '88%', marginLeft: msg.role === 'user' ? 'auto' : 0 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: S.faint, marginBottom: 3, textAlign: msg.role === 'user' ? 'right' : 'left', display: 'flex', alignItems: 'center', gap: 6, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'user' ? 'You' : 'Toddler'}
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.6,
              background: msg.role === 'user' ? S.surface : 'transparent',
              border: msg.role === 'user' ? `1px solid ${S.line}` : 'none',
              borderLeft: msg.role === 'bot' ? `2px solid ${S.line}` : 'none',
              padding: msg.role === 'user' ? '9px 12px' : '0 0 0 12px',
              borderRadius: msg.role === 'user' ? 7 : 0,
              color: msg.error ? S.danger : msg.role === 'user' ? S.text : S.dim,
            }}>{msg.text}</div>
            {msg.sources?.length > 0 && <div style={{ marginTop: 6, paddingLeft: 12, fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint }}>{msg.sources.map((src, j) => <div key={j}>{src.source || src}{src.chunkIndex !== undefined ? ` (chunk ${src.chunkIndex})` : ''}</div>)}</div>}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 6, padding: 10, borderTop: `1px solid ${S.line}`, background: S.surface, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask something..." disabled={sending} style={{ flex: 1, padding: '8px 12px', background: S.bg, border: `1px solid ${S.line}`, borderRadius: 6, color: S.text, fontSize: 12, fontFamily: "'Inter'", outline: 'none' }} />
        <button type="submit" disabled={sending || !input.trim()} style={{ padding: '8px 10px', background: S.surface2, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: (!sending && input.trim()) ? 1 : 0.5 }}><I name="send" size={14} /></button>
      </form>
    </div>
  )
}


// ─── APIs ────────────────────────────────────────────────────────

function ApisTab({ projects }) {
  const [selectedId, setSelectedId] = useState(null)
  const [copied, setCopied] = useState(null)

  const withKeys = projects.filter(p => p.api_key)
  const selected = projects.find(p => p.id === selectedId)

  useEffect(() => { if (withKeys.length > 0 && !selectedId) setSelectedId(withKeys[0].id) }, [withKeys.length])

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); toast.success('Copied'); setTimeout(() => setCopied(null), 2000) }).catch(() => {})
  }

  if (withKeys.length === 0) return (
    <div style={{ textAlign: 'center', padding: 64, maxWidth: 300, margin: '0 auto' }}>
      <div style={{ width: 44, height: 44, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.surface2, borderRadius: 10, border: `1px solid ${S.line}` }}><I name="api" size={20} /></div>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: S.text, marginBottom: 6 }}>No API keys</div>
      <div style={{ fontSize: 12, color: S.faint, lineHeight: 1.6 }}>Train a model to generate an API key.</div>
    </div>
  )

  const curlCode = `curl -X POST ${API}/predict \\\n  -H "X-API-Key: ${selected?.api_key || 'YOUR_KEY'}" \\\n  -F "project_id=${selected?.id || 'PROJECT_ID'}" \\\n  -F "text=your text here"`
  const pyCode = `import requests\n\nres = requests.post(\n    "${API}/predict",\n    headers={"X-API-Key": "${selected?.api_key || 'YOUR_KEY'}"},\n    data={"project_id": "${selected?.id || 'PROJECT_ID'}", "text": "your text here"}\n)\nprint(res.json())`

  return (
    <div style={{ padding: 16, maxWidth: 520 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {withKeys.map(p => <span key={p.id} onClick={() => setSelectedId(p.id)} style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${selectedId === p.id ? S.line : 'transparent'}`, background: selectedId === p.id ? S.surface3 : 'transparent', color: selectedId === p.id ? S.text : S.faint }}>{p.name}</span>)}
      </div>
      {selected && (<>
        <div style={{ background: S.surface, border: `1px solid ${S.line}`, padding: 14, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint }}>API key</span>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: S.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><I name="refresh" size={11} /> Regenerate</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontFamily: "'IBM Plex Mono'", fontSize: 12, background: S.bg, padding: '8px 10px', border: `1px solid ${S.line}`, borderRadius: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: S.text }}>{selected.api_key || 'No key yet'}</code>
            <div onClick={() => selected.api_key && handleCopy(selected.api_key, 'key')} style={{ padding: 5, background: 'transparent', border: `1px solid ${S.line}`, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', color: S.faint }}><I name={copied === 'key' ? 'check' : 'copy'} size={14} /></div>
          </div>
        </div>
        {[{ label: 'cURL', code: curlCode }, { label: 'Python', code: pyCode }].map(s => (
          <div key={s.label} style={{ background: S.surface, border: `1px solid ${S.line}`, borderRadius: 7, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${S.line}` }}>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.dim }}>{s.label}</span>
              <span onClick={() => handleCopy(s.code, s.label)} style={{ cursor: 'pointer', color: S.faint, display: 'flex' }}><I name={copied === s.label ? 'check' : 'copy'} size={12} /></span>
            </div>
            <pre style={{ padding: 12, margin: 0, fontFamily: "'IBM Plex Mono'", fontSize: 11, color: S.dim, lineHeight: 1.6, overflow: 'auto', whiteSpace: 'pre-wrap', background: S.bg }}>{s.code}</pre>
          </div>
        ))}
      </>)}
    </div>
  )
}


// ─── Devices ─────────────────────────────────────────────────────

function DevicesTab({ devices, setDevices }) {
  const pairingCode = auth.currentUser?.uid?.substring(0, 6).toUpperCase() || '------'

  const handleUnpair = async (deviceId) => {
    if (!window.confirm('Unpair this device?')) return
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'devices', deviceId))
      setDevices(prev => prev.filter(d => d.id !== deviceId))
      toast.success('Device unpaired')
      vibrate(ImpactStyle.Heavy)
    } catch { toast.error('Failed to unpair') }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14, color: S.text }}>Devices</span>
        <button style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, padding: '7px 12px', borderRadius: 6, cursor: 'pointer', background: S.lime, color: S.bg, border: 'none' }}>Pair a device</button>
      </div>
      {devices.length === 0 ? (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'start' }}>
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: S.text, marginBottom: 6 }}>No devices</div>
            <div style={{ fontSize: 12, color: S.faint, lineHeight: 1.6 }}>Install the Toddler app on your phone and enter this code to pair.</div>
          </div>
          <div style={{ border: `1px solid ${S.line}`, borderRadius: 6, padding: 18, textAlign: 'center' }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: S.faint, marginBottom: 10 }}>Your pairing code</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 28, letterSpacing: 10, color: S.text, paddingLeft: 10 }}>{pairingCode}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
          {devices.map(d => (
            <div key={d.id} style={{ background: S.surface, border: `1px solid ${S.line}`, padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, background: S.surface2, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I name="device" size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 12, color: S.text, marginBottom: 1 }}>{d.name || d.platform || 'Device'}</div>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint }}>{d.platform || 'unknown'} / {d.ramGb || '?'} GB / {d.status || 'offline'}</div>
              </div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: d.status === 'online' ? S.lime : S.faint, boxShadow: d.status === 'online' ? '0 0 6px rgba(198,255,51,0.4)' : 'none' }} />
              <div onClick={() => handleUnpair(d.id)} style={{ padding: 5, background: 'transparent', border: `1px solid ${S.line}`, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, color: S.faint }}><I name="unlink" size={12} /></div>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint, marginBottom: 8 }}>Pair another device</div>
            <div style={{ border: `1px solid ${S.line}`, borderRadius: 6, padding: 18, textAlign: 'center', maxWidth: 260 }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: S.faint, marginBottom: 10 }}>Your pairing code</div>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 24, letterSpacing: 8, color: S.text, paddingLeft: 8 }}>{pairingCode}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
