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

// ─── SVG Icons ───────────────────────────────────────────────────

function I({ name, size = 16 }) {
  const paths = {
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
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none">{paths[name]}</svg>
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
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    handler(mq)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
    getDocs(q).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setProjects(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'users', auth.currentUser.uid, 'devices'))
    getDocs(q).then(snap => {
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }).catch(() => {})
  }, [])

  const nav = [
    { id: 'zoo', icon: 'zoo', label: 'Model Zoo' },
    { id: 'sandbox', icon: 'sandbox', label: 'Sandbox' },
    { id: 'apis', icon: 'api', label: 'APIs' },
    { id: 'devices', icon: 'device', label: 'Devices' },
  ]

  const sidebar = (
    <>
      <div className="dash-sidebar-brand">
        <I name="logo" size={18} />
        <span>TODDLER</span>
        {isMobile && <button className="dash-close" style={{ marginLeft: 'auto' }} onClick={() => setSidebarOpen(false)}><I name="close" size={18} /></button>}
      </div>
      <nav>
        {nav.map(item => (
          <div key={item.id} className={`nav-item${tab === item.id ? ' active' : ''}`} onClick={() => { setTab(item.id); setSidebarOpen(false) }}>
            <I name={item.icon} size={16} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="dash-sidebar-foot">
        <div className="dash-sidebar-user">{auth.currentUser?.email}</div>
        <div className="dash-sidebar-signout" onClick={() => auth.signOut()}>
          <I name="signout" size={14} /> Sign out
        </div>
      </div>
    </>
  )

  const currentLabel = nav.find(n => n.id === tab)?.label || ''

  return (
    <div className="dash-app">
      {isMobile && sidebarOpen && <div className="dash-mobile-overlay" onClick={() => setSidebarOpen(false)} />}
      {isMobile ? (
        <aside className={`dash-sidebar dash-sidebar-mobile${sidebarOpen ? ' open' : ''}`}>
          {sidebar}
        </aside>
      ) : (
        <aside className="dash-sidebar">
          {sidebar}
        </aside>
      )}
      <div className="dash-main">
        <div className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && <button className="dash-hamburger" onClick={() => setSidebarOpen(true)}><I name="menu" size={20} /></button>}
            <span className="top-bar-title">{currentLabel}</span>
          </div>
          {tab === 'zoo' && devices.length > 0 && (
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)' }}>
              fit checked against {devices[0]?.name || 'device'} / {devices[0]?.ramGb || '?'}GB
            </span>
          )}
        </div>
        <div className="dash-content">
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

  useEffect(() => {
    fetch(`${API}/models`).then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.models) setModels(data.models) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = models.filter(m => {
    if (filter === 'llm') return m.task === 'chat'
    if (filter === 'vision') return m.task !== 'chat'
    return true
  })

  const maxRam = devices.reduce((max, d) => Math.max(max, d.ramGb || 0), 0)
  const fits = (m) => maxRam > 0 ? (m.minRamGb || 2) <= maxRam : false

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><div style={{ width: 20, height: 20, border: '2px solid var(--line)', borderTopColor: 'var(--lime)', borderRadius: '50%', margin: '0 auto' }} className="animate-spin" /></div>

  if (filtered.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon"><I name="zoo" size={20} /></div>
      <div className="empty-title">No models yet</div>
      <div className="empty-desc">Browse the Zoo and pick something that fits your device.</div>
      <button className="btn-dash btn-dash-lime">Browse the Zoo <I name="arrow" size={13} /></button>
    </div>
  )

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ id: 'all', label: 'All models' }, { id: 'llm', label: 'Language' }, { id: 'vision', label: 'Vision' }].map(f => (
          <span key={f.id} className={`chip${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {filtered.map(m => {
          const ok = fits(m)
          return (
            <div key={m.id} className="zoo-card">
              <h4>
                {m.name}
                {ok
                  ? <span className="badge badge-lime" style={{ marginLeft: 'auto' }}><I name="check" size={9} /> Fits</span>
                  : <span className="badge badge-faint" style={{ marginLeft: 'auto' }}>Needs {m.minRamGb || 2}GB</span>
                }
              </h4>
              <div className="meta">{m.task === 'chat' ? 'LLM' : m.task} / {m.sizeMb} MB / needs {m.minRamGb || 2} GB</div>
              <div className="desc">{m.description || `${m.name} for on-device use.`}</div>
              <button className="btn-dash btn-dash-outline btn-dash-sm btn-dash-block">Train this model</button>
            </div>
          )
        })}
      </div>
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
      const formData = new FormData()
      formData.append('project_id', selectedId)
      formData.append('text', text)
      const res = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `HTTP ${res.status}`) }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'bot', text: data.response || 'No response.', sources: data.sources || [] }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: err.message, error: true }])
    } finally { setSending(false) }
  }

  if (trained.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon"><I name="sandbox" size={20} /></div>
      <div className="empty-title">No trained models</div>
      <div className="empty-desc">Train a model from the Zoo to use the sandbox.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="top-bar">
        <span className="top-bar-title">Sandbox</span>
        <span className="badge badge-faint"><I name="lock" size={9} /> Retrieval preview</span>
      </div>
      <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', gap: 6, flexShrink: 0 }}>
        {trained.map(p => (
          <span key={p.id} className={`chip${selectedId === p.id ? ' active' : ''}`} onClick={() => { setSelectedId(p.id); setMessages([]) }}>{p.name}</span>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', padding: '48px 0' }}><p style={{ color: 'var(--text-faint)', fontSize: 12 }}>Ask <span style={{ color: 'var(--text)' }}>{selected?.name}</span> a question.</p></div>}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'msg-user' : 'msg-bot'}>
            <div className="msg-label">
              {msg.role === 'user' ? 'You' : <><span>Toddler</span>{!msg.error && <span className="badge badge-faint" style={{ padding: '1px 6px' }}>sources only</span>}</>}
            </div>
            <div className="msg-body" style={msg.error ? { color: 'var(--danger)' } : {}}>{msg.text}</div>
            {msg.sources?.length > 0 && <div className="sources">{msg.sources.map((src, j) => <div key={j}>{src.source || src}{src.chunkIndex !== undefined ? ` (chunk ${src.chunkIndex})` : ''}</div>)}</div>}
          </div>
        ))}
      </div>
      <form className="send-bar" onSubmit={handleSend}>
        <input className="send-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask something..." disabled={sending} />
        <button className="send-btn" type="submit" disabled={sending || !input.trim()}><I name="send" size={14} /></button>
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
    <div className="empty-state">
      <div className="empty-icon"><I name="api" size={20} /></div>
      <div className="empty-title">No API keys</div>
      <div className="empty-desc">Train a model to generate an API key.</div>
    </div>
  )

  const curlCode = `curl -X POST ${API}/predict \\\n  -H "X-API-Key: ${selected?.api_key || 'YOUR_KEY'}" \\\n  -F "project_id=${selected?.id || 'PROJECT_ID'}" \\\n  -F "text=your text here"`
  const pyCode = `import requests\n\nres = requests.post(\n    "${API}/predict",\n    headers={"X-API-Key": "${selected?.api_key || 'YOUR_KEY'}"},\n    data={"project_id": "${selected?.id || 'PROJECT_ID'}", "text": "your text here"}\n)\nprint(res.json())`

  return (
    <div style={{ padding: 20, maxWidth: 520 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {withKeys.map(p => <span key={p.id} className={`chip${selectedId === p.id ? ' active' : ''}`} onClick={() => setSelectedId(p.id)}>{p.name}</span>)}
      </div>
      {selected && (<>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: 14, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="field-label" style={{ margin: 0 }}>API key</span>
            <span className="btn-dash btn-dash-ghost btn-dash-sm btn-dash-danger-hover"><I name="refresh" size={11} /> Regenerate</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontFamily: "'IBM Plex Mono'", fontSize: 12, background: 'var(--bg)', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.api_key || 'No key yet'}</code>
            <div className="device-action" onClick={() => selected.api_key && handleCopy(selected.api_key, 'key')}><I name={copied === 'key' ? 'check' : 'copy'} size={14} /></div>
          </div>
        </div>
        {[{ label: 'cURL', code: curlCode }, { label: 'Python', code: pyCode }].map(s => (
          <div key={s.label} className="code-card">
            <div className="code-card-head"><span>{s.label}</span><I name={copied === s.label ? 'check' : 'copy'} size={12} onClick={() => handleCopy(s.code, s.label)} /></div>
            <pre className="code-block">{s.code}</pre>
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
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="top-bar-title">Devices</span>
        <button className="btn-dash btn-dash-lime btn-dash-sm">Pair a device</button>
      </div>
      {devices.length === 0 ? (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'start' }}>
          <div className="empty-state" style={{ textAlign: 'left', padding: '32px 0' }}>
            <div className="empty-title">No devices</div>
            <div className="empty-desc">Install the Toddler app and enter this code to pair.</div>
          </div>
          <div className="pairing-box">
            <div className="pl">Your pairing code</div>
            <div className="pc">{pairingCode}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
          {devices.map(d => (
            <div key={d.id} className="device-card">
              <div className="device-icon"><I name="device" size={16} /></div>
              <div className="device-info">
                <div className="device-name">{d.name || d.platform || 'Device'}</div>
                <div className="device-meta">{d.platform || 'unknown'} / {d.ramGb || '?'} GB / {d.status || 'offline'}</div>
              </div>
              <div className="device-dot" style={{ background: d.status === 'online' ? 'var(--lime)' : 'var(--text-faint)', boxShadow: d.status === 'online' ? '0 0 6px rgba(198,255,51,0.4)' : 'none' }} />
              <div className="device-action" onClick={() => handleUnpair(d.id)}><I name="unlink" size={12} /></div>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <div className="field-label" style={{ marginBottom: 8 }}>Pair another device</div>
            <div className="pairing-box" style={{ maxWidth: 260 }}>
              <div className="pl">Your pairing code</div>
              <div className="pc" style={{ fontSize: 24, letterSpacing: 8 }}>{pairingCode}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
