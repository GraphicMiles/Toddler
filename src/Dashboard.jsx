import React, { useState, useEffect, useRef } from 'react'
import { auth, db } from './firebase'
import { collection, query, where, getDocs, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore'
import { uploadDatasetToCloudinary } from './cloud'
import { toast } from 'react-hot-toast'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const vibrate = (s = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style: s }).catch(() => {})
}

// ─── SVG Icon Component ──────────────────────────────────────────

const ICONS = {
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
  upload: <><path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
  close: <><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  menu: <><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  refresh: <><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
  globe: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
  download: <><path d="M12 3v12M12 15l-4-4M12 15l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M4 19h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  star: <><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/></>,
  key: <><circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M11 12l9-9M17 6l3 3M14 9l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
  market: <><path d="M3 9l1.5-5h15L21 9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M9 13a3 3 0 006 0" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
  chevron: <><polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
}

function I({ name, size = 16, color = 'currentColor', style = {} }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color, flexShrink: 0, ...style }}>{ICONS[name]}</svg>
}


// ─── Dashboard ───────────────────────────────────────────────────

export default function Dashboard() {
  const [tab, setTab] = useState('zoo')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 839px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    handler(mq)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Load projects
  useEffect(() => {
    if (!auth.currentUser) { setProjectsLoading(false); return }
    const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
    getDocs(q).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setProjects(data)
    }).catch(() => {}).finally(() => setProjectsLoading(false))
  }, [])

  // Load devices
  useEffect(() => {
    if (!auth.currentUser) { setDevicesLoading(false); return }
    const q = query(collection(db, 'users', auth.currentUser.uid, 'devices'))
    getDocs(q).then(snap => {
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }).catch(() => {}).finally(() => setDevicesLoading(false))
  }, [])

  const refreshProjects = () => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
    getDocs(q).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setProjects(data)
    }).catch(() => {})
  }

  const nav = [
    { id: 'zoo', icon: 'zoo', label: 'Model Zoo' },
    { id: 'sandbox', icon: 'sandbox', label: 'Sandbox' },
    { id: 'apis', icon: 'api', label: 'APIs' },
    { id: 'devices', icon: 'device', label: 'Devices' },
  ]

  const currentLabel = nav.find(n => n.id === tab)?.label || ''

  const sidebarContent = (
    <>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <I name="logo" size={18} color="var(--lime)" />
        <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 14 }}>TODDLER</span>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <I name="close" size={18} />
          </button>
        )}
      </div>
      <nav style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {nav.map(item => (
          <div key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false) }} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
            borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: tab === item.id ? 500 : 400,
            color: tab === item.id ? 'var(--text)' : 'var(--text-dim)',
            background: tab === item.id ? 'rgba(198,255,51,0.08)' : 'transparent',
            borderLeft: `2px solid ${tab === item.id ? 'var(--lime)' : 'transparent'}`,
            transition: 'all 0.15s',
          }}>
            <I name={item.icon} size={16} color={tab === item.id ? 'var(--lime)' : 'var(--text-faint)'} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div style={{ padding: '10px 6px', borderTop: '1px solid var(--line)' }}>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)', padding: '4px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {auth.currentUser?.email}
        </div>
        <div onClick={() => auth.signOut()} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
          color: 'var(--text-faint)', fontSize: 11, cursor: 'pointer', borderRadius: 5, transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}>
          <I name="signout" size={14} /> Sign out
        </div>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      {isMobile ? (
        <aside style={{
          width: 216, background: 'var(--surface)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', flexShrink: 0,
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.2s ease',
        }}>
          {sidebarContent}
        </aside>
      ) : (
        <aside style={{ width: 216, background: 'var(--surface)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {sidebarContent}
        </aside>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <I name="menu" size={20} />
              </button>
            )}
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14 }}>{currentLabel}</span>
          </div>
          {tab === 'zoo' && devices.length > 0 && (
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)' }}>
              fit checked against {devices[0]?.name || 'device'} / {devices[0]?.ramGb || '?'}GB
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'zoo' && <ZooTab projects={projects} devices={devices} isMobile={isMobile} />}
          {tab === 'sandbox' && <SandboxTab projects={projects} isMobile={isMobile} />}
          {tab === 'apis' && <ApisTab projects={projects} isMobile={isMobile} />}
          {tab === 'devices' && <DevicesTab devices={devices} setDevices={setDevices} isMobile={isMobile} />}
        </div>
      </div>
    </div>
  )
}


// ─── Zoo ─────────────────────────────────────────────────────────

function ZooTab({ projects, devices, isMobile }) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'
    if (!apiUrl) { setLoading(false); return }
    fetch(`${apiUrl}/models`).then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.models) setModels(data.models) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = models.filter(m => {
    if (filter === 'llm') return m.task === 'chat'
    if (filter === 'vision') return m.task !== 'chat'
    return true
  })

  // Check device fit
  const maxRam = devices.reduce((max, d) => Math.max(max, d.ramGb || 0), 0)
  const fits = (m) => (m.minRamGb || 2) <= maxRam

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><div style={{ width: 20, height: 20, border: '2px solid var(--line)', borderTopColor: 'var(--lime)', borderRadius: '50%', margin: '0 auto' }} className="animate-spin" /></div>

  return (
    <div style={{ padding: isMobile ? 16 : 20 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ id: 'all', label: 'All models' }, { id: 'llm', label: 'Language' }, { id: 'vision', label: 'Vision' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
            border: `1px solid ${filter === f.id ? 'var(--line)' : 'transparent'}`,
            background: filter === f.id ? 'var(--surface-3, var(--surface-2))' : 'transparent',
            color: filter === f.id ? 'var(--text)' : 'var(--text-faint)', transition: 'all 0.15s',
          }}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 20px', maxWidth: 300, margin: '0 auto' }}>
          <div style={{ width: 44, height: 44, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
            <I name="zoo" size={20} color="var(--text-faint)" />
          </div>
          <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No models yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6, marginBottom: 18 }}>Browse the Zoo and pick something that fits your device.</div>
          <button style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, padding: '10px 18px', borderRadius: 6, cursor: 'pointer', background: 'var(--lime)', color: '#14130F', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Browse the Zoo <I name="arrow" size={13} />
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {filtered.map(m => {
          const ok = fits(m)
          return (
            <div key={m.id} style={{
              background: 'var(--surface)', border: '1px solid var(--line)', padding: 16, borderRadius: 8,
              transition: 'border-color 0.15s, transform 0.15s', cursor: 'default', position: 'relative',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-faint)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <h4 style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {m.name}
                {ok ? (
                  <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, background: 'rgba(198,255,51,0.10)', color: 'var(--lime)', border: '1px solid rgba(198,255,51,0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <I name="check" size={9} /> Fits
                  </span>
                ) : (
                  <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-faint)', border: '1px solid var(--line)' }}>
                    Needs {m.minRamGb || 2}GB
                  </span>
                )}
              </h4>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)', marginBottom: 8 }}>
                {m.task === 'chat' ? 'LLM' : m.task} / {m.sizeMb} MB / needs {m.minRamGb || 2} GB
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 12 }}>
                {m.description || `${m.name} for on-device use.`}
              </div>
              <button style={{
                fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
                padding: '7px 12px', borderRadius: 6, cursor: 'pointer', width: '100%',
                background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-faint)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--text-dim)' }}>
                Train this model
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ─── Sandbox ─────────────────────────────────────────────────────

function SandboxTab({ projects, isMobile }) {
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const trained = projects.filter(p => p.status === 'trained')
  const selected = projects.find(p => p.id === selectedId)

  useEffect(() => {
    if (trained.length > 0 && !selectedId) setSelectedId(trained[0].id)
  }, [trained.length])

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending || !selected) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setSending(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'
      if (!apiUrl) throw new Error('API URL not configured')
      const token = await auth.currentUser?.getIdToken()
      const formData = new FormData()
      formData.append('project_id', selectedId)
      formData.append('text', text)
      const res = await fetch(`${apiUrl}/chat`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Request failed (${res.status})`) }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'bot', text: data.response || 'No response.', sources: data.sources || [] }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: err.message, error: true }])
    } finally { setSending(false) }
  }

  if (trained.length === 0) return (
    <div style={{ textAlign: 'center', padding: '64px 20px', maxWidth: 300, margin: '0 auto' }}>
      <div style={{ width: 44, height: 44, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
        <I name="sandbox" size={20} color="var(--text-faint)" />
      </div>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No trained models</div>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>Train a model from the Zoo to use the sandbox.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar with badge */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14 }}>Sandbox</span>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-faint)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <I name="lock" size={9} /> Retrieval preview
        </span>
      </div>

      {/* Model picker */}
      <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
        {trained.map(p => (
          <button key={p.id} onClick={() => { setSelectedId(p.id); setMessages([]) }} style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
            border: `1px solid ${selectedId === p.id ? 'var(--line)' : 'transparent'}`,
            background: selectedId === p.id ? 'var(--surface-3, var(--surface-2))' : 'transparent',
            color: selectedId === p.id ? 'var(--text)' : 'var(--text-faint)', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{p.name}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 14 : 18 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'var(--text-faint)', fontSize: 12 }}>Ask <span style={{ color: 'var(--text)' }}>{selected?.name}</span> a question.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 14, maxWidth: msg.role === 'user' ? '80%' : '88%', marginLeft: msg.role === 'user' ? 'auto' : 0 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 3, textAlign: msg.role === 'user' ? 'right' : 'left', display: 'flex', alignItems: 'center', gap: 6, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'user' ? 'You' : 'Toddler'}
              {msg.role === 'bot' && !msg.error && <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, padding: '1px 6px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-faint)', border: '1px solid var(--line)' }}>sources only</span>}
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.6,
              background: msg.role === 'user' ? 'var(--surface)' : 'transparent',
              border: msg.role === 'user' ? '1px solid var(--line)' : 'none',
              borderLeft: msg.role === 'bot' ? '2px solid var(--line)' : 'none',
              padding: msg.role === 'user' ? '9px 12px' : '0 0 0 12px',
              borderRadius: msg.role === 'user' ? 7 : 0,
              color: msg.error ? 'var(--danger)' : msg.role === 'user' ? 'var(--text)' : 'var(--text-dim)',
            }}>
              {msg.text}
            </div>
            {msg.sources?.length > 0 && (
              <div style={{ marginTop: 6, paddingLeft: msg.role === 'bot' ? 12 : 0, fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)' }}>
                {msg.sources.map((src, j) => <div key={j}>{j === 0 ? '' : ''}{src.source || src}{src.chunkIndex !== undefined ? ` (chunk ${src.chunkIndex})` : ''}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--line)', background: 'var(--surface)', flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask something..." disabled={sending}
          style={{ flex: 1, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: "'Inter'" }} />
        <button type="submit" disabled={sending || !input.trim()} style={{
          padding: '8px 10px', background: 'var(--surface-2)', border: 'none', borderRadius: 6, cursor: 'pointer',
          display: 'flex', alignItems: 'center', opacity: (!sending && input.trim()) ? 1 : 0.5, transition: 'opacity 0.15s',
        }}>
          <I name="send" size={14} color="var(--text-faint)" />
        </button>
      </form>
    </div>
  )
}


// ─── APIs ────────────────────────────────────────────────────────

function ApisTab({ projects, isMobile }) {
  const [selectedId, setSelectedId] = useState(null)
  const [copied, setCopied] = useState(null)

  const withKeys = projects.filter(p => p.api_key)
  const selected = projects.find(p => p.id === selectedId)

  useEffect(() => {
    if (withKeys.length > 0 && !selectedId) setSelectedId(withKeys[0].id)
  }, [withKeys.length])

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      toast.success('Copied')
      setTimeout(() => setCopied(null), 2000)
    }).catch(() => {})
  }

  if (withKeys.length === 0) return (
    <div style={{ textAlign: 'center', padding: '64px 20px', maxWidth: 300, margin: '0 auto' }}>
      <div style={{ width: 44, height: 44, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
        <I name="api" size={20} color="var(--text-faint)" />
      </div>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No API keys</div>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>Train a model to generate an API key.</div>
    </div>
  )

  const baseUrl = import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'
  const curlCode = `curl -X POST ${baseUrl}/predict \\\n  -H "X-API-Key: ${selected?.api_key || 'YOUR_KEY'}" \\\n  -F "project_id=${selected?.id || 'PROJECT_ID'}" \\\n  -F "text=your text here"`
  const pyCode = `import requests\n\nres = requests.post(\n    "${baseUrl}/predict",\n    headers={"X-API-Key": "${selected?.api_key || 'YOUR_KEY'}"},\n    data={"project_id": "${selected?.id || 'PROJECT_ID'}", "text": "your text here"}\n)\nprint(res.json())`

  return (
    <div style={{ padding: isMobile ? 16 : 20, maxWidth: 520 }}>
      {/* Project picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {withKeys.map(p => (
          <button key={p.id} onClick={() => setSelectedId(p.id)} style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
            border: `1px solid ${selectedId === p.id ? 'var(--line)' : 'transparent'}`,
            background: selectedId === p.id ? 'var(--surface-3, var(--surface-2))' : 'transparent',
            color: selectedId === p.id ? 'var(--text)' : 'var(--text-faint)', transition: 'all 0.15s',
          }}>{p.name}</button>
        ))}
      </div>

      {selected && (<>
        {/* API Key */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: 14, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)', letterSpacing: 0.5 }}>API key</span>
            <button onClick={() => {}} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-faint)', fontFamily: "'IBM Plex Mono'", fontSize: 9, padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}>
              <I name="refresh" size={11} /> Regenerate
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontFamily: "'IBM Plex Mono'", fontSize: 12, background: 'var(--bg)', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
              {selected.api_key || 'No key yet'}
            </code>
            <button onClick={() => selected.api_key && handleCopy(selected.api_key, 'key')} style={{ padding: 8, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-faint)' }}>
              <I name={copied === 'key' ? 'check' : 'copy'} size={14} />
            </button>
          </div>
        </div>

        {/* Code snippets */}
        {[{ label: 'cURL', code: curlCode }, { label: 'Python', code: pyCode }].map(snippet => (
          <div key={snippet.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-dim)' }}>{snippet.label}</span>
              <button onClick={() => handleCopy(snippet.code, snippet.label)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-faint)' }}>
                <I name={copied === snippet.label ? 'check' : 'copy'} size={12} />
              </button>
            </div>
            <pre style={{ padding: 12, margin: 0, fontFamily: "'IBM Plex Mono'", fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6, overflow: 'auto', whiteSpace: 'pre-wrap', background: 'var(--bg)' }}>{snippet.code}</pre>
          </div>
        ))}
      </>)}
    </div>
  )
}


// ─── Devices ─────────────────────────────────────────────────────

function DevicesTab({ devices, setDevices, isMobile }) {
  const [pairingCode] = useState(() => auth.currentUser?.uid?.substring(0, 6).toUpperCase() || '------')

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
    <div style={{ padding: isMobile ? 16 : 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14 }}>Devices</span>
        <button style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, padding: '7px 12px', borderRadius: 6, cursor: 'pointer', background: 'var(--lime)', color: '#14130F', border: 'none' }}>
          Pair a device
        </button>
      </div>

      {devices.length === 0 && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '48px 20px', maxWidth: 300, flex: 1, minWidth: 200 }}>
            <div style={{ width: 44, height: 44, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <I name="device" size={20} color="var(--text-faint)" />
            </div>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No devices</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6, marginBottom: 16 }}>Install the Toddler app and enter this code to pair.</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: 18, textAlign: 'center', alignSelf: 'center' }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>Your pairing code</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 28, letterSpacing: 10, color: 'var(--text)', paddingLeft: 10 }}>{pairingCode}</div>
          </div>
        </div>
      )}

      {devices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
          {devices.map(d => (
            <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <I name="device" size={16} color="var(--text-faint)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 1 }}>{d.name || d.platform || 'Device'}</div>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)' }}>{d.platform || 'unknown'} / {d.ramGb || '?'} GB / {d.status || 'offline'}</div>
              </div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: d.status === 'online' ? 'var(--lime)' : 'var(--text-faint)', boxShadow: d.status === 'online' ? '0 0 6px rgba(198,255,51,0.4)' : 'none' }} />
              <button onClick={() => handleUnpair(d.id)} style={{ padding: '5px 8px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--text-faint)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--text-faint)' }}>
                <I name="unlink" size={12} />
              </button>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>Pair another device</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: 18, textAlign: 'center', maxWidth: 280 }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>Your pairing code</div>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 24, letterSpacing: 8, color: 'var(--text)', paddingLeft: 8 }}>{pairingCode}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
