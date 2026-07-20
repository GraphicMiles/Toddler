import React, { useState, useEffect } from 'react'
import { auth, db } from './firebase'
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore'
import { toast } from 'react-hot-toast'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const vibrate = (s = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style: s }).catch(() => {})
}

// ─── Icons (SVG, no emojis) ──────────────────────────────────────

const Icon = ({ name, size = 18, color = 'currentColor' }) => {
  const paths = {
    zoo: <><rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none"/></>,
    chat: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
    key: <><rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><circle cx="12" cy="16" r="1.5" fill={color}/><path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="1.5" fill="none"/></>,
    phone: <><rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><line x1="12" y1="18" x2="12" y2="18.01" stroke={color} strokeWidth="2" strokeLinecap="round"/></>,
    menu: <><line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth="1.5" fill="none"/></>,
    check: <><polyline points="20 6 9 17 4 12" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={color} strokeWidth="1.5" fill="none"/><polyline points="16 17 21 12 16 7" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    search: <><circle cx="11" cy="11" r="8" stroke={color} strokeWidth="1.5" fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    unlink: <><path d="M18.84 12.25l1.72-1.71a4.29 4.29 0 00-6.07-6.07l-1.72 1.71" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M5.16 11.75l-1.72 1.71a4.29 4.29 0 006.07 6.07l1.72-1.71" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/><line x1="2" y1="2" x2="22" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    empty: <><rect x="2" y="3" width="20" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><line x1="2" y1="9" x2="22" y2="9" stroke={color} strokeWidth="1.5"/><line x1="8" y1="3" x2="8" y2="9" stroke={color} strokeWidth="1.5"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke={color} strokeWidth="1.5" fill="none"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">{paths[name]}</svg>
}

const LogoMark = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="2" stroke="var(--lime)" strokeWidth="2" fill="none"/>
    <polyline points="2,8 2,2 8,2" stroke="var(--lime)" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <polyline points="16,22 22,22 22,16" stroke="var(--lime)" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
)


// ─── Styles ──────────────────────────────────────────────────────

const s = {
  // Layout
  app: { display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif", overflow: 'hidden' },
  sidebar: { width: 240, background: 'var(--surface)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  content: { flex: 1, overflow: 'auto' },

  // Sidebar
  sidebarHeader: { padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 },
  logoText: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: -0.5 },
  sidebarNav: { flex: 1, padding: '12px 8px', overflow: 'auto' },
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
    borderRadius: 6, cursor: 'pointer', marginBottom: 1, transition: 'all 0.15s',
    background: active ? 'rgba(198,255,51,0.06)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-dim)',
    borderLeft: active ? '2px solid var(--lime)' : '2px solid transparent',
  }),
  navLabel: { fontSize: 13, fontWeight: 500 },
  sidebarFooter: { padding: '12px 8px', borderTop: '1px solid var(--line)' },
  userEmail: { fontSize: 11, color: 'var(--text-faint)', padding: '4px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace" },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', marginTop: 4, background: 'transparent', border: 'none', color: 'var(--text-faint)', fontFamily: "'Inter', sans-serif", fontSize: 12, cursor: 'pointer', borderRadius: 6, transition: 'all 0.15s' },

  // Top bar
  topBar: { padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  topTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: 'var(--text)' },
  hamburger: { background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 },

  // Common
  emptyState: { textAlign: 'center', padding: '80px 24px', maxWidth: 360, margin: '0 auto' },
  emptyIcon: { width: 48, height: 48, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)' },
  emptyTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 6, color: 'var(--text)' },
  emptyDesc: { fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.6 },
  spinner: { width: 20, height: 20, border: '2px solid var(--line)', borderTopColor: 'var(--lime)', borderRadius: '50%', margin: '0 auto' },
}

// ─── Dashboard ───────────────────────────────────────────────────

export default function Dashboard() {
  const [tab, setTab] = useState('zoo')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 839px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    handler(mq)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const nav = [
    { id: 'zoo', icon: 'zoo', label: 'Model Zoo' },
    { id: 'sandbox', icon: 'chat', label: 'Sandbox' },
    { id: 'apis', icon: 'key', label: 'APIs' },
    { id: 'devices', icon: 'phone', label: 'Devices' },
  ]

  const currentLabel = nav.find(n => n.id === tab)?.label || ''

  const sidebarContent = (
    <>
      <div style={s.sidebarHeader}>
        <LogoMark size={20} />
        <span style={s.logoText}>TODDLER</span>
        {isMobile && (
          <button style={{ ...s.closeBtn, marginLeft: 'auto' }} onClick={() => setSidebarOpen(false)}>
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      <nav style={s.sidebarNav}>
        {nav.map(item => (
          <div key={item.id} style={s.navItem(tab === item.id)} onClick={() => { setTab(item.id); setSidebarOpen(false) }}>
            <Icon name={item.icon} size={18} color={tab === item.id ? 'var(--lime)' : 'var(--text-faint)'} />
            <span style={s.navLabel}>{item.label}</span>
          </div>
        ))}
      </nav>
      <div style={s.sidebarFooter}>
        <div style={s.userEmail}>{auth.currentUser?.email}</div>
        <button style={s.logoutBtn}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
          onClick={() => auth.signOut()}>
          <Icon name="logout" size={15} />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div style={s.app}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop: static, mobile: drawer */}
      {isMobile ? (
        <aside style={{
          ...s.sidebar, position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease',
        }}>
          {sidebarContent}
        </aside>
      ) : (
        <aside style={s.sidebar}>
          {sidebarContent}
        </aside>
      )}

      {/* Main */}
      <div style={s.main}>
        {/* Top bar */}
        <div style={s.topBar}>
          {isMobile && (
            <button style={s.hamburger} onClick={() => setSidebarOpen(true)}>
              <Icon name="menu" size={20} />
            </button>
          )}
          <span style={s.topTitle}>{currentLabel}</span>
        </div>

        {/* Content */}
        <div style={s.content}>
          {tab === 'zoo' && <ZooTab />}
          {tab === 'sandbox' && <SandboxTab />}
          {tab === 'apis' && <ApisTab />}
          {tab === 'devices' && <DevicesTab />}
        </div>
      </div>
    </div>
  )
}


// ─── Zoo ─────────────────────────────────────────────────────────

function ZooTab() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) { setLoading(false); return }
    fetch(`${apiUrl}/models`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.models) setModels(data.models) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = models.filter(m => {
    if (filter === 'llm') return m.task === 'chat'
    if (filter === 'vision') return m.task !== 'chat'
    return true
  })

  const platformLabel = (runsOn) => {
    if (!runsOn) return 'Desktop, Cloud'
    const labels = []
    if (runsOn.includes('mobile')) labels.push('Mobile')
    if (runsOn.includes('desktop')) labels.push('Desktop')
    if (runsOn.includes('cloud')) labels.push('Cloud')
    return labels.join(', ')
  }

  return (
    <div style={{ padding: isMobile() ? 16 : 24 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All models' },
          { id: 'llm', label: 'Language' },
          { id: 'vision', label: 'Vision' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 0.5,
            padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
            background: filter === f.id ? 'var(--surface-2)' : 'transparent',
            border: `1px solid ${filter === f.id ? 'var(--line)' : 'transparent'}`,
            color: filter === f.id ? 'var(--text)' : 'var(--text-faint)',
            transition: 'all 0.15s',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60 }}><div style={s.spinner} /></div>}

      {!loading && filtered.length === 0 && (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><Icon name="search" size={20} color="var(--text-faint)" /></div>
          <div style={s.emptyTitle}>No models</div>
          <div style={s.emptyDesc}>No models match this filter.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map(m => (
          <div key={m.id} style={{
            background: 'var(--surface)', border: '1px solid var(--line)', padding: 20, borderRadius: 8,
            transition: 'border-color 0.15s', cursor: 'default',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-faint)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{m.name}</h3>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-faint)', flexShrink: 0, marginLeft: 8 }}>{m.task === 'chat' ? 'LLM' : m.task}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 12 }}>
              {m.description || `${m.name} for on-device use.`}
            </p>
            <div style={{ display: 'flex', gap: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text-faint)' }}>
              <span>{m.sizeMb} MB</span>
              <span>{m.minRamGb || 2} GB</span>
              <span>{platformLabel(m.runsOn)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


// ─── Sandbox ─────────────────────────────────────────────────────

function SandboxTab() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
    getDocs(q).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setProjects(data)
      const trained = data.find(p => p.status === 'trained')
      if (trained) setSelectedId(trained.id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const selected = projects.find(p => p.id === selectedId)

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending || !selected) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setSending(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      if (!apiUrl) throw new Error('API URL not configured')
      const token = await auth.currentUser?.getIdToken()
      const formData = new FormData()
      formData.append('project_id', selectedId)
      formData.append('text', text)
      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'bot', text: data.response || 'No response.', sources: data.sources || [] }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: err.message, error: true }])
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={s.spinner} /></div>

  const trained = projects.filter(p => p.status === 'trained')

  if (trained.length === 0) return (
    <div style={s.emptyState}>
      <div style={s.emptyIcon}><Icon name="chat" size={20} color="var(--text-faint)" /></div>
      <div style={s.emptyTitle}>No trained models</div>
      <div style={s.emptyDesc}>Train a model from the Zoo to use the sandbox.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Model picker */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
        {trained.map(p => (
          <button key={p.id} onClick={() => { setSelectedId(p.id); setMessages([]) }} style={{
            padding: '5px 12px', borderRadius: 6, whiteSpace: 'nowrap',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            background: selectedId === p.id ? 'var(--surface-2)' : 'transparent',
            border: `1px solid ${selectedId === p.id ? 'var(--line)' : 'transparent'}`,
            color: selectedId === p.id ? 'var(--text)' : 'var(--text-faint)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {p.name}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile() ? 16 : 24 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Ask <span style={{ color: 'var(--text)' }}>{selected?.name}</span> a question.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 16, maxWidth: '85%', marginLeft: msg.role === 'user' ? 'auto' : 0 }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
              marginBottom: 4, color: 'var(--text-faint)',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}>
              {msg.role === 'user' ? 'You' : 'Toddler'}
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.65,
              background: msg.role === 'user' ? 'var(--surface)' : 'transparent',
              border: msg.role === 'user' ? '1px solid var(--line)' : 'none',
              borderLeft: msg.role === 'bot' ? '2px solid var(--line)' : 'none',
              padding: msg.role === 'user' ? '10px 14px' : '0 0 0 14px',
              borderRadius: msg.role === 'user' ? 8 : 0,
              color: msg.error ? '#e57373' : 'var(--text)',
            }}>
              {msg.text}
            </div>
            {msg.sources?.length > 0 && (
              <div style={{ marginTop: 6, paddingLeft: msg.role === 'bot' ? 14 : 0 }}>
                {msg.sources.map((src, j) => (
                  <span key={j} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-faint)' }}>
                    {j > 0 && ' / '}
                    {src.source || src}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--line)', background: 'var(--surface)', flexShrink: 0 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask something..."
          disabled={sending}
          style={{
            flex: 1, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--line)',
            borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none',
            fontFamily: "'Inter', sans-serif",
          }}
        />
        <button type="submit" disabled={sending || !input.trim()} style={{
          padding: '10px 14px', border: 'none', borderRadius: 8, cursor: 'pointer',
          background: (!sending && input.trim()) ? 'var(--text)' : 'var(--surface-2)',
          color: (!sending && input.trim()) ? 'var(--bg)' : 'var(--text-faint)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          <Icon name="send" size={16} />
        </button>
      </form>
    </div>
  )
}


// ─── APIs ────────────────────────────────────────────────────────

function ApisTab() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
    getDocs(q).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProjects(data)
      const withKey = data.find(p => p.api_key)
      if (withKey) setSelectedId(withKey.id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const selected = projects.find(p => p.id === selectedId)

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      toast.success('Copied')
      setTimeout(() => setCopied(null), 2000)
    }).catch(() => toast.error('Copy failed'))
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={s.spinner} /></div>

  const withKeys = projects.filter(p => p.api_key)

  if (withKeys.length === 0) return (
    <div style={s.emptyState}>
      <div style={s.emptyIcon}><Icon name="key" size={20} color="var(--text-faint)" /></div>
      <div style={s.emptyTitle}>No API keys</div>
      <div style={s.emptyDesc}>Train a model to generate an API key.</div>
    </div>
  )

  const baseUrl = import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'
  const curlCode = `curl -X POST ${baseUrl}/predict \\\n  -H "X-API-Key: ${selected?.api_key || 'YOUR_KEY'}" \\\n  -F "project_id=${selected?.id || 'PROJECT_ID'}" \\\n  -F "text=your text here"`
  const pyCode = `import requests\n\nres = requests.post(\n    "${baseUrl}/predict",\n    headers={"X-API-Key": "${selected?.api_key || 'YOUR_KEY'}"},\n    data={"project_id": "${selected?.id || 'PROJECT_ID'}", "text": "your text here"}\n)\nprint(res.json())`
  const jsCode = `const form = new FormData();\nform.append("project_id", "${selected?.id || 'PROJECT_ID'}");\nform.append("text", "your text here");\n\nconst res = await fetch("${baseUrl}/predict", {\n  method: "POST",\n  headers: { "X-API-Key": "${selected?.api_key || 'YOUR_KEY'}" },\n  body: form\n});\nconsole.log(await res.json());`

  const snippets = [
    { label: 'cURL', code: curlCode },
    { label: 'Python', code: pyCode },
    { label: 'JavaScript', code: jsCode },
  ]

  return (
    <div style={{ padding: isMobile() ? 16 : 24, maxWidth: 680 }}>
      {/* Project picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {withKeys.map(p => (
          <button key={p.id} onClick={() => setSelectedId(p.id)} style={{
            padding: '5px 12px', borderRadius: 6,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            background: selectedId === p.id ? 'var(--surface-2)' : 'transparent',
            border: `1px solid ${selectedId === p.id ? 'var(--line)' : 'transparent'}`,
            color: selectedId === p.id ? 'var(--text)' : 'var(--text-faint)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {p.name}
          </button>
        ))}
      </div>

      {selected && (
        <>
          {/* API Key */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>API Key</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{
                flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'var(--text)',
                background: 'var(--bg)', padding: '10px 12px', border: '1px solid var(--line)',
                borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {selected.api_key || 'No key yet'}
              </code>
              {selected.api_key && (
                <button onClick={() => handleCopy(selected.api_key, 'key')} style={{
                  padding: '10px', background: 'var(--bg)', border: '1px solid var(--line)',
                  borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  color: 'var(--text-dim)', transition: 'all 0.15s',
                }}>
                  <Icon name={copied === 'key' ? 'check' : 'copy'} size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Code snippets */}
          {snippets.map(snippet => (
            <div key={snippet.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>{snippet.label}</span>
                <button onClick={() => handleCopy(snippet.code, snippet.label)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  display: 'flex', alignItems: 'center', color: 'var(--text-faint)',
                }}>
                  <Icon name={copied === snippet.label ? 'check' : 'copy'} size={14} />
                </button>
              </div>
              <pre style={{
                padding: 14, margin: 0, fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6,
                overflow: 'auto', whiteSpace: 'pre-wrap', background: 'var(--bg)',
              }}>
                {snippet.code}
              </pre>
            </div>
          ))}
        </>
      )}
    </div>
  )
}


// ─── Devices ─────────────────────────────────────────────────────

function DevicesTab() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'users', auth.currentUser.uid, 'devices'))
    getDocs(q).then(snap => {
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleUnpair = async (deviceId) => {
    if (!window.confirm('Unpair this device?')) return
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'devices', deviceId))
      setDevices(prev => prev.filter(d => d.id !== deviceId))
      toast.success('Device unpaired')
      vibrate(ImpactStyle.Heavy)
    } catch {
      toast.error('Failed to unpair')
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={s.spinner} /></div>

  return (
    <div style={{ padding: isMobile() ? 16 : 24, maxWidth: 560 }}>
      {devices.length === 0 && (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><Icon name="phone" size={20} color="var(--text-faint)" /></div>
          <div style={s.emptyTitle}>No devices</div>
          <div style={s.emptyDesc}>Install the Toddler app on your phone and sign in to pair it.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {devices.map(d => (
          <div key={d.id} style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            padding: 14, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, background: 'var(--surface-2)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name="phone" size={18} color="var(--text-faint)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{d.name || d.platform || 'Device'}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text-faint)' }}>
                {d.platform || 'unknown'} / {d.ramGb || '?'} GB / {d.status || 'offline'}
              </div>
            </div>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: d.status === 'online' ? 'var(--lime)' : 'var(--text-faint)',
            }} />
            <button onClick={() => handleUnpair(d.id)} style={{
              padding: '6px 10px', background: 'transparent', border: '1px solid var(--line)',
              color: 'var(--text-faint)', fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, letterSpacing: 0.5, cursor: 'pointer', borderRadius: 6,
              transition: 'all 0.15s', flexShrink: 0,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--text-faint)' }}>
              <Icon name="unlink" size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper for responsive padding
function isMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 840
}
