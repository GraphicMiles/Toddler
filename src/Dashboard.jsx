import React, { useState, useEffect } from 'react'
import { auth, db } from './firebase'
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { toast } from 'react-hot-toast'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const vibrate = (s = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style: s }).catch(() => {})
}

export default function Dashboard() {
  const [tab, setTab] = useState('zoo')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'var(--surface)', borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s',
      }}
        className="sidebar-desktop-visible"
      >
        {/* Logo */}
        <div style={{ padding: 20, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'white' }}
            onClick={() => { setTab('zoo'); setSidebarOpen(false) }}>
            <span style={{ width: 18, height: 18, border: '2px solid var(--lime)', display: 'inline-block', position: 'relative' }}>
              <span style={{ position: 'absolute', top: -2, left: -2, width: 5, height: 5, borderTop: '2px solid var(--lime)', borderLeft: '2px solid var(--lime)' }} />
              <span style={{ position: 'absolute', bottom: -2, right: -2, width: 5, height: 5, borderBottom: '2px solid var(--lime)', borderRight: '2px solid var(--lime)' }} />
            </span>
            TODDLER
          </span>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }} className="sidebar-close-btn">✕</button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: 12 }}>
          {[
            { id: 'zoo', icon: '🔍', label: 'Model Zoo' },
            { id: 'sandbox', icon: '💬', label: 'Sandbox' },
            { id: 'apis', icon: '🔑', label: 'APIs' },
            { id: 'devices', icon: '📱', label: 'Unpair Device' },
          ].map(item => (
            <div key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 4, cursor: 'pointer', marginBottom: 2,
                background: tab === item.id ? 'rgba(198,255,51,0.08)' : 'transparent',
                color: tab === item.id ? 'var(--lime)' : 'var(--text-dim)',
              }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ fontSize: 13 }}>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {auth.currentUser?.email}
          </div>
          <button onClick={() => auth.signOut()}
            style={{ width: '100%', padding: 8, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-faint)', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 'var(--sidebar-width, 0px)' }}>
        {/* Top bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20 }} className="sidebar-hamburger">☰</button>
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 16 }}>
            {tab === 'zoo' ? 'Model Zoo' : tab === 'sandbox' ? 'Sandbox' : tab === 'apis' ? 'APIs' : 'Unpair Device'}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'zoo' && <ZooTab />}
          {tab === 'sandbox' && <SandboxTab />}
          {tab === 'apis' && <ApisTab />}
          {tab === 'devices' && <DevicesTab />}
        </div>
      </div>

      <style>{`
        @media (min-width: 840px) {
          .sidebar-desktop-visible { transform: translateX(0) !important; position: sticky !important; }
          .sidebar-close-btn { display: none; }
          .sidebar-hamburger { display: none; }
        }
      `}</style>
    </div>
  )
}


// ─── MODEL ZOO TAB ────────────────────────────────────────────────

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

  const badge = (runsOn) => {
    if (!runsOn) return '💻☁️'
    const icons = []
    if (runsOn.includes('mobile')) icons.push('📱')
    if (runsOn.includes('desktop')) icons.push('💻')
    if (runsOn.includes('cloud')) icons.push('☁️')
    return icons.join(' ')
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['all', 'llm', 'vision'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
              padding: '6px 14px', borderRadius: 100, cursor: 'pointer',
              background: filter === f ? 'rgba(198,255,51,0.08)' : 'transparent',
              border: `1px solid ${filter === f ? 'var(--lime)' : 'var(--line)'}`,
              color: filter === f ? 'var(--lime)' : 'var(--text-faint)',
            }}>
            {f === 'all' ? 'All' : f.toUpperCase()}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--line)', borderTopColor: 'var(--lime)', borderRadius: '50%' }} className="animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          <p>No models found.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(m => (
          <div key={m.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: 20, borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600 }}>{m.name}</h3>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, padding: '2px 6px', background: 'rgba(198,255,51,0.1)', color: 'var(--lime)', borderRadius: 4 }}>{badge(m.runsOn)}</span>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)', marginBottom: 8 }}>
              {m.task === 'chat' ? 'Chat LLM' : m.task} · {m.sizeMb}MB · {m.minRamGb || 2}GB RAM
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 12 }}>
              {m.description || `A ${m.task} model for on-device use.`}
            </p>
            <div style={{ display: 'flex', gap: 12, fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)' }}>
              {m.license && <span>📄 {m.license}</span>}
              {m.trainingModes && <span>🎯 {m.trainingModes.join(' + ')}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


// ─── SANDBOX TAB ─────────────────────────────────────────────────

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
      if (!apiUrl) throw new Error('VITE_API_URL not set')
      const token = await auth.currentUser?.getIdToken()
      const formData = new FormData()
      formData.append('project_id', selectedId)
      formData.append('text', text)
      const res = await fetch(`${apiUrl}/chat`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'bot', text: data.response || 'No response.', sources: data.sources || [] }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: `Error: ${err.message}`, error: true }])
    } finally { setSending(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 24, height: 24, border: '2px solid var(--line)', borderTopColor: 'var(--lime)', borderRadius: '50%' }} className="animate-spin" /></div>

  const trained = projects.filter(p => p.status === 'trained')

  if (trained.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
      <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>No trained models yet. Train a model from the Zoo to use the sandbox.</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)' }}>
      {/* Model picker */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {trained.map(p => (
          <button key={p.id} onClick={() => { setSelectedId(p.id); setMessages([]) }}
            style={{
              padding: '6px 12px', borderRadius: 100, whiteSpace: 'nowrap',
              fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
              background: selectedId === p.id ? 'rgba(198,255,51,0.1)' : 'transparent',
              border: `1px solid ${selectedId === p.id ? 'var(--lime)' : 'var(--line)'}`,
              color: selectedId === p.id ? 'var(--lime)' : 'var(--text-faint)',
              cursor: 'pointer',
            }}>
            {p.name}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Ask <strong style={{ color: 'var(--text)' }}>{selected?.name}</strong> anything.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 16, maxWidth: '80%', marginLeft: msg.role === 'user' ? 'auto' : 0 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, color: msg.role === 'user' ? 'var(--text-dim)' : 'var(--purple)', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              {msg.role === 'user' ? 'USER' : 'TODDLER'}
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.7,
              background: msg.role === 'user' ? 'var(--surface-2)' : 'transparent',
              border: msg.role === 'user' ? '1px solid var(--line)' : 'none',
              borderLeft: msg.role === 'bot' ? '2px solid var(--purple)' : 'none',
              padding: msg.role === 'user' ? '12px 16px' : '0 0 0 14px',
              color: msg.error ? 'var(--danger)' : msg.role === 'user' ? 'var(--text)' : 'var(--text-dim)',
            }}>
              {msg.text}
            </div>
            {msg.sources?.length > 0 && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(198,255,51,0.04)', border: '1px solid rgba(198,255,51,0.12)', borderRadius: 4 }}>
                {msg.sources.map((s, j) => (
                  <div key={j} style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--lime)' }}>
                    📎 {s.source || s} {s.score ? `· ${Math.round(s.score * 100)}%` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." disabled={sending}
          style={{ flex: 1, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 4, color: 'var(--text)', fontSize: 14, outline: 'none' }} />
        <button type="submit" disabled={sending || !input.trim()}
          style={{ padding: '10px 16px', background: (!sending && input.trim()) ? 'var(--lime)' : 'var(--line)', color: '#14130F', border: 'none', borderRadius: 4, fontFamily: "'IBM Plex Mono'", fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          Send ▲
        </button>
      </form>
    </div>
  )
}


// ─── APIs TAB ────────────────────────────────────────────────────

function ApisTab() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
    getDocs(q).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProjects(data)
      const trained = data.find(p => p.status === 'trained' && p.api_key)
      if (trained) setSelectedId(trained.id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const selected = projects.find(p => p.id === selectedId)

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Copied!')
      vibrate()
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 24, height: 24, border: '2px solid var(--line)', borderTopColor: 'var(--lime)', borderRadius: '50%' }} className="animate-spin" /></div>

  const withKeys = projects.filter(p => p.api_key)

  if (withKeys.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🔑</div>
      <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>No API keys yet. Train a model to get your first API key.</p>
    </div>
  )

  const curlSnippet = `curl -X POST ${import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'}/predict \\
  -H "X-API-Key: ${selected?.api_key || 'YOUR_KEY'}" \\
  -F "project_id=${selected?.id || 'PROJECT_ID'}" \\
  -F "text=your text here"`

  const pySnippet = `import requests

response = requests.post(
    "${import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'}/predict",
    headers={"X-API-Key": "${selected?.api_key || 'YOUR_KEY'}"},
    data={"project_id": "${selected?.id || 'PROJECT_ID'}", "text": "your text here"}
)
print(response.json())`

  const jsSnippet = `const formData = new FormData();
formData.append("project_id", "${selected?.id || 'PROJECT_ID'}");
formData.append("text", "your text here");

const res = await fetch("${import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'}/predict", {
  method: "POST",
  headers: { "X-API-Key": "${selected?.api_key || 'YOUR_KEY'}" },
  body: formData
});
const data = await res.json();
console.log(data);`

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      {/* Project picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {withKeys.map(p => (
          <button key={p.id} onClick={() => setSelectedId(p.id)}
            style={{
              padding: '6px 14px', borderRadius: 100,
              fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
              background: selectedId === p.id ? 'rgba(198,255,51,0.1)' : 'transparent',
              border: `1px solid ${selectedId === p.id ? 'var(--lime)' : 'var(--line)'}`,
              color: selectedId === p.id ? 'var(--lime)' : 'var(--text-faint)',
              cursor: 'pointer',
            }}>
            {p.name}
          </button>
        ))}
      </div>

      {selected && (
        <>
          {/* API Key */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: 20, borderRadius: 4, marginBottom: 24 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 }}>API Key</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <code style={{ flex: 1, fontFamily: "'IBM Plex Mono'", fontSize: 13, color: 'var(--lime)', background: 'var(--bg)', padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.api_key || 'No key generated yet'}
              </code>
              {selected.api_key && (
                <button onClick={() => handleCopy(selected.api_key)}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>
              Send <code style={{ color: 'var(--lime)' }}>X-API-Key: {selected.api_key || 'tdlr_live_...'}</code> to authenticate requests.
            </p>
          </div>

          {/* Code Snippets */}
          {[
            { label: 'cURL', code: curlSnippet },
            { label: 'Python', code: pySnippet },
            { label: 'JavaScript', code: jsSnippet },
          ].map(snippet => (
            <div key={snippet.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: 'var(--text-dim)' }}>{snippet.label}</span>
                <button onClick={() => handleCopy(snippet.code)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontFamily: "'IBM Plex Mono'", fontSize: 10, cursor: 'pointer' }}>
                  Copy
                </button>
              </div>
              <pre style={{ padding: 16, margin: 0, fontFamily: "'IBM Plex Mono'", fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {snippet.code}
              </pre>
            </div>
          ))}
        </>
      )}
    </div>
  )
}


// ─── DEVICES TAB (Unpair) ────────────────────────────────────────

function DevicesTab() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(collection(db, 'users', auth.currentUser.uid, 'devices'))
    getDocs(q).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setDevices(data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleUnpair = async (deviceId) => {
    if (!window.confirm('Unpair this device? It will need a new pairing code to reconnect.')) return
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'devices', deviceId))
      setDevices(prev => prev.filter(d => d.id !== deviceId))
      toast.success('Device unpaired.')
      vibrate(ImpactStyle.Heavy)
    } catch { toast.error('Failed to unpair.') }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 24, height: 24, border: '2px solid var(--line)', borderTopColor: 'var(--lime)', borderRadius: '50%' }} className="animate-spin" /></div>

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>Manage devices connected to your account. Unpairing removes the device's access.</p>

      {devices.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, background: 'var(--surface-2)', border: '1px dashed var(--line)', borderRadius: 4 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📱</div>
          <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>No devices paired yet.</p>
          <p style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 4 }}>Install the Toddler app on your phone to get started.</p>
        </div>
      )}

      {devices.map(d => (
        <div key={d.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: 16, borderRadius: 4, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 24 }}>{d.platform === 'android' ? '📱' : '💻'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name || d.platform || 'Unknown Device'}</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--text-faint)' }}>
              {d.platform} · {d.ramGb || '?'}GB RAM · {d.status || 'offline'}
            </div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.status === 'online' ? 'var(--lime)' : 'var(--text-faint)', boxShadow: d.status === 'online' ? '0 0 8px rgba(198,255,51,0.4)' : 'none' }} />
          <button onClick={() => handleUnpair(d.id)}
            style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
            Unpair
          </button>
        </div>
      ))}
    </div>
  )
}
