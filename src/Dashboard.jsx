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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#14130F', color: '#F2EFE6', fontFamily: "'Inter', sans-serif" }}>
      {isMobile && sidebarOpen && <div className="fixed inset-0 z-[90]" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSidebarOpen(false)} />}
      <aside className={`flex flex-col flex-shrink-0 ${isMobile ? 'fixed inset-y-0 left-0 z-[100] transition-transform duration-200 ease-linear' : ''}`} style={{
        width: 216, background: '#1D1B16', borderRight: '1px solid #38352B',
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
      }}>
        <div className="flex items-center gap-2 p-4" style={{ borderBottom: '1px solid #38352B' }}>
          <I name="logo" size={18} />
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 14, color: '#F2EFE6' }}>TODDLER</span>
          {isMobile && <button className="ml-auto p-1" style={{ background: 'none', border: 'none', color: '#6E695C', cursor: 'pointer' }} onClick={() => setSidebarOpen(false)}><I name="close" size={18} /></button>}
        </div>
        <nav className="flex-1 flex flex-col gap-px p-2.5">
          {nav.map(item => (
            <div key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false) }} className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-all duration-150" style={{
              color: tab === item.id ? '#F2EFE6' : '#A8A296',
              background: tab === item.id ? 'rgba(198,255,51,0.08)' : 'transparent',
              borderLeft: `2px solid ${tab === item.id ? '#C6FF33' : 'transparent'}`,
              fontSize: 12, fontWeight: tab === item.id ? 500 : 400,
            }}>
              <I name={item.icon} size={16} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="p-2.5" style={{ borderTop: '1px solid #38352B' }}>
          <div className="px-2.5 py-1 truncate" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#6E695C' }}>{auth.currentUser?.email}</div>
          <div onClick={() => auth.signOut()} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded cursor-pointer" style={{ color: '#6E695C', fontSize: 11 }}>{<I name="signout" size={14} />} Sign out</div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between flex-shrink-0 px-4 py-2.5" style={{ borderBottom: '1px solid #38352B', background: '#1D1B16' }}>
          <div className="flex items-center gap-2.5">
            {isMobile && <button className="p-1" style={{ background: 'none', border: 'none', color: '#A8A296', cursor: 'pointer' }} onClick={() => setSidebarOpen(true)}><I name="menu" size={20} /></button>}
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14, color: '#F2EFE6' }}>{nav.find(n => n.id === tab)?.label}</span>
          </div>
          {tab === 'zoo' && devices.length > 0 && <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#6E695C' }}>fit: {devices[0]?.name} / {devices[0]?.ramGb}GB</span>}
        </div>
        <div className="flex-1 overflow-auto">
          {tab === 'zoo' && <ZooTab devices={devices} />}
          {tab === 'sandbox' && <SandboxTab projects={projects} />}
          {tab === 'apis' && <ApisTab projects={projects} />}
          {tab === 'devices' && <DevicesTab devices={devices} setDevices={setDevices} />}
        </div>
      </div>
    </div>
  )
}

function ZooTab({ devices }) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}/models`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
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

  if (loading) return <div className="flex items-center justify-center p-16"><div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #38352B', borderTopColor: '#C6FF33' }} /></div>

  if (error) return <div className="text-center p-16 max-w-xs mx-auto"><div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: '#F2EFE6', marginBottom: 6 }}>Failed to load</div><div style={{ fontSize: 12, color: '#6E695C' }}>{error}</div></div>

  if (filtered.length === 0) return <div className="text-center p-16 max-w-xs mx-auto"><div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: '#F2EFE6', marginBottom: 6 }}>No models</div><div style={{ fontSize: 12, color: '#6E695C' }}>No models match this filter.</div></div>

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[{ id: 'all', label: 'All models' }, { id: 'llm', label: 'Language' }, { id: 'vision', label: 'Vision' }].map(f => (
          <span key={f.id} onClick={() => setFilter(f.id)} className="px-2.5 py-1 rounded cursor-pointer transition-all duration-150" style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10,
            border: `1px solid ${filter === f.id ? '#38352B' : 'transparent'}`,
            background: filter === f.id ? '#2E2A20' : 'transparent',
            color: filter === f.id ? '#F2EFE6' : '#6E695C',
          }}>{f.label}</span>
        ))}
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {filtered.map(m => {
          const ok = maxRam > 0 ? (m.minRamGb || 2) <= maxRam : false
          return (
            <div key={m.id} className="flex flex-col gap-1.5 p-4 rounded-lg transition-all duration-150 hover:-translate-y-px" style={{ background: '#1D1B16', border: '1px solid #38352B' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#6E695C'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#38352B'}>
              <div className="flex items-center justify-between gap-2">
                <h4 style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 600, color: '#F2EFE6' }}>{m.name}</h4>
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full" style={{
                  fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap',
                  background: ok ? 'rgba(198,255,51,0.10)' : '#26231C',
                  color: ok ? '#C6FF33' : '#6E695C',
                  border: `1px solid ${ok ? 'rgba(198,255,51,0.3)' : '#38352B'}`,
                }}>{ok ? '✓ Fits' : `Needs ${m.minRamGb || 2}GB`}</span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#6E695C' }}>{m.task === 'chat' ? 'LLM' : m.task} / {m.sizeMb} MB / {m.minRamGb || 2} GB RAM</div>
              <div style={{ fontSize: 12, color: '#A8A296', lineHeight: 1.5 }}>{m.description || `${m.name} for on-device use.`}</div>
              <button className="mt-auto w-full px-3 py-2 rounded cursor-pointer transition-all duration-150" style={{
                fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600,
                background: 'transparent', border: '1px solid #38352B', color: '#A8A296',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6E695C'; e.currentTarget.style.color = '#F2EFE6' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#38352B'; e.currentTarget.style.color = '#A8A296' }}>
                Train this model
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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

  if (trained.length === 0) return <div className="text-center p-16 max-w-xs mx-auto"><div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: '#F2EFE6', marginBottom: 6 }}>No trained models</div><div style={{ fontSize: 12, color: '#6E695C' }}>Train a model from the Zoo to use the sandbox.</div></div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #38352B', background: '#1D1B16' }}>
        <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14, color: '#F2EFE6' }}>Sandbox</span>
        <span className="px-2 py-0.5 rounded-full" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', background: '#26231C', color: '#6E695C', border: '1px solid #38352B' }}>Retrieval preview</span>
      </div>
      <div className="flex gap-1.5 px-3.5 py-1.5 overflow-x-auto flex-shrink-0" style={{ borderBottom: '1px solid #38352B', background: '#1D1B16' }}>
        {trained.map(p => (
          <span key={p.id} onClick={() => { setSelectedId(p.id); setMessages([]) }} className="px-2.5 py-1 rounded cursor-pointer whitespace-nowrap transition-all duration-150" style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10,
            border: `1px solid ${selectedId === p.id ? '#38352B' : 'transparent'}`,
            background: selectedId === p.id ? '#2E2A20' : 'transparent',
            color: selectedId === p.id ? '#F2EFE6' : '#6E695C',
          }}>{p.name}</span>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 && <div className="text-center py-12"><p style={{ color: '#6E695C', fontSize: 12 }}>Ask <span style={{ color: '#F2EFE6' }}>{selected?.name}</span> a question.</p></div>}
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3.5 ${msg.role === 'user' ? 'ml-auto' : ''}`} style={{ maxWidth: msg.role === 'user' ? '80%' : '88%' }}>
            <div className={`flex items-center gap-1.5 mb-0.5 ${msg.role === 'user' ? 'justify-end' : ''}`} style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6E695C' }}>
              {msg.role === 'user' ? 'You' : 'Toddler'}
            </div>
            <div className="text-sm leading-relaxed" style={{
              background: msg.role === 'user' ? '#1D1B16' : 'transparent',
              border: msg.role === 'user' ? '1px solid #38352B' : 'none',
              borderLeft: msg.role === 'bot' ? '2px solid #38352B' : 'none',
              padding: msg.role === 'user' ? '9px 12px' : '0 0 0 12px',
              borderRadius: msg.role === 'user' ? 7 : 0,
              color: msg.error ? '#FF5C3E' : msg.role === 'user' ? '#F2EFE6' : '#A8A296',
            }}>{msg.text}</div>
            {msg.sources?.length > 0 && <div className="mt-1.5 pl-3" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#6E695C' }}>{msg.sources.map((src, j) => <div key={j}>{src.source || src}{src.chunkIndex !== undefined ? ` (chunk ${src.chunkIndex})` : ''}</div>)}</div>}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-1.5 p-2.5 flex-shrink-0" style={{ borderTop: '1px solid #38352B', background: '#1D1B16' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask something..." disabled={sending} className="flex-1 px-3 py-2 rounded text-xs outline-none" style={{ background: '#14130F', border: '1px solid #38352B', color: '#F2EFE6', fontFamily: "'Inter'" }} />
        <button type="submit" disabled={sending || !input.trim()} className="px-2.5 py-2 rounded flex items-center" style={{ background: '#26231C', border: 'none', cursor: 'pointer', opacity: (!sending && input.trim()) ? 1 : 0.5 }}><I name="send" size={14} /></button>
      </form>
    </div>
  )
}

function ApisTab({ projects }) {
  const [selectedId, setSelectedId] = useState(null)
  const [copied, setCopied] = useState(null)
  const withKeys = projects.filter(p => p.api_key)
  const selected = projects.find(p => p.id === selectedId)

  useEffect(() => { if (withKeys.length > 0 && !selectedId) setSelectedId(withKeys[0].id) }, [withKeys.length])

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); toast.success('Copied'); setTimeout(() => setCopied(null), 2000) }).catch(() => {})
  }

  if (withKeys.length === 0) return <div className="text-center p-16 max-w-xs mx-auto"><div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: '#F2EFE6', marginBottom: 6 }}>No API keys</div><div style={{ fontSize: 12, color: '#6E695C' }}>Train a model to generate an API key.</div></div>

  const curlCode = `curl -X POST ${API}/predict \\\n  -H "X-API-Key: ${selected?.api_key || 'YOUR_KEY'}" \\\n  -F "project_id=${selected?.id || 'PROJECT_ID'}" \\\n  -F "text=your text here"`
  const pyCode = `import requests\n\nres = requests.post(\n    "${API}/predict",\n    headers={"X-API-Key": "${selected?.api_key || 'YOUR_KEY'}"},\n    data={"project_id": "${selected?.id || 'PROJECT_ID'}", "text": "your text here"}\n)\nprint(res.json())`

  return (
    <div className="p-4 max-w-lg">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {withKeys.map(p => <span key={p.id} onClick={() => setSelectedId(p.id)} className="px-2.5 py-1 rounded cursor-pointer transition-all duration-150" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, border: `1px solid ${selectedId === p.id ? '#38352B' : 'transparent'}`, background: selectedId === p.id ? '#2E2A20' : 'transparent', color: selectedId === p.id ? '#F2EFE6' : '#6E695C' }}>{p.name}</span>)}
      </div>
      {selected && (<>
        <div className="p-3.5 rounded-lg mb-3" style={{ background: '#1D1B16', border: '1px solid #38352B' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#6E695C' }}>API key</span>
            <span className="flex items-center gap-1 cursor-pointer" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: '#6E695C' }}><I name="refresh" size={11} /> Regenerate</span>
          </div>
          <div className="flex gap-2 items-center">
            <code className="flex-1 px-2.5 py-2 rounded truncate" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, background: '#14130F', border: '1px solid #38352B', color: '#F2EFE6' }}>{selected.api_key || 'No key yet'}</code>
            <div onClick={() => selected.api_key && handleCopy(selected.api_key, 'key')} className="p-1.5 rounded flex items-center cursor-pointer" style={{ border: '1px solid #38352B', color: '#6E695C' }}><I name={copied === 'key' ? 'check' : 'copy'} size={14} /></div>
          </div>
        </div>
        {[{ label: 'cURL', code: curlCode }, { label: 'Python', code: pyCode }].map(s => (
          <div key={s.label} className="rounded-lg overflow-hidden mb-2" style={{ background: '#1D1B16', border: '1px solid #38352B' }}>
            <div className="flex items-center justify-between px-3.5 py-2" style={{ borderBottom: '1px solid #38352B' }}>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#A8A296' }}>{s.label}</span>
              <span onClick={() => handleCopy(s.code, s.label)} className="cursor-pointer flex" style={{ color: '#6E695C' }}><I name={copied === s.label ? 'check' : 'copy'} size={12} /></span>
            </div>
            <pre className="p-3 m-0 overflow-auto" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: '#A8A296', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#14130F' }}>{s.code}</pre>
          </div>
        ))}
      </>)}
    </div>
  )
}

function DevicesTab({ devices, setDevices }) {
  const pairingCode = auth.currentUser?.uid?.substring(0, 6).toUpperCase() || '------'
  const handleUnpair = async (deviceId) => {
    if (!window.confirm('Unpair this device?')) return
    try { await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'devices', deviceId)); setDevices(prev => prev.filter(d => d.id !== deviceId)); toast.success('Device unpaired'); vibrate(ImpactStyle.Heavy) } catch { toast.error('Failed to unpair') }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14, color: '#F2EFE6' }}>Devices</span>
        <button className="px-3 py-1.5 rounded cursor-pointer" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, background: '#C6FF33', color: '#14130F', border: 'none' }}>Pair a device</button>
      </div>
      {devices.length === 0 ? (
        <div className="flex flex-wrap gap-6 items-start">
          <div className="max-w-xs">
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: '#F2EFE6', marginBottom: 6 }}>No devices</div>
            <div style={{ fontSize: 12, color: '#6E695C', lineHeight: 1.6 }}>Install the Toddler app on your phone and enter this code to pair.</div>
          </div>
          <div className="p-4 rounded text-center" style={{ border: '1px solid #38352B' }}>
            <div className="mb-2.5" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#6E695C' }}>Your pairing code</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 28, letterSpacing: 10, color: '#F2EFE6', paddingLeft: 10 }}>{pairingCode}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-md">
          {devices.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#1D1B16', border: '1px solid #38352B' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#26231C' }}><I name="device" size={16} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs mb-px" style={{ color: '#F2EFE6' }}>{d.name || d.platform || 'Device'}</div>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#6E695C' }}>{d.platform || 'unknown'} / {d.ramGb || '?'} GB / {d.status || 'offline'}</div>
              </div>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.status === 'online' ? '#C6FF33' : '#6E695C', boxShadow: d.status === 'online' ? '0 0 6px rgba(198,255,51,0.4)' : 'none' }} />
              <div onClick={() => handleUnpair(d.id)} className="p-1.5 rounded flex items-center flex-shrink-0 cursor-pointer" style={{ border: '1px solid #38352B', color: '#6E695C' }}><I name="unlink" size={12} /></div>
            </div>
          ))}
          <div className="mt-3">
            <div className="mb-2" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#6E695C' }}>Pair another device</div>
            <div className="p-4 rounded text-center max-w-xs" style={{ border: '1px solid #38352B' }}>
              <div className="mb-2.5" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#6E695C' }}>Your pairing code</div>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 24, letterSpacing: 8, color: '#F2EFE6', paddingLeft: 8 }}>{pairingCode}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
