import React, { useState, useEffect, useRef } from 'react'
import { auth, db } from './firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { toast } from 'react-hot-toast'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const API = import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com'

const vibrate = (s = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style: s }).catch(() => {})
}

// ─── SVG Icons ───────────────────────────────────────────────────

function I({ name, size = 16 }) {
  const p = {
    logo: <><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><polyline points="2,8 2,2 8,2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="16,22 22,22 22,16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
    zoo: <><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    sandbox: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    queue: <><line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="6" x2="3.01" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="3.01" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="3.01" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
    signout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.5" fill="none"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    unlink: <><path d="M18.84 12.25l1.72-1.71a4.29 4.29 0 00-6.07-6.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M5.16 11.75l-1.72 1.71a4.29 4.29 0 006.07 6.07l1.72-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/><line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    check: <><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polyline points="12 5 19 12 12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/><polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    key: <><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>{p[name]}</svg>
}

const S = { bg: '#14130F', surface: '#1D1B16', surface2: '#26231C', line: '#38352B', text: '#F2EFE6', dim: '#A8A296', faint: '#6E695C', lime: '#C6FF33', purple: '#7D39EB', danger: '#FF5C3E' }

// ═══════════════════════════════════════════════════════════════
// MOBILE APP — Android flow
// ═══════════════════════════════════════════════════════════════

export default function MobileApp() {
  const [view, setView] = useState('loading') // loading | auth | pair | training | dashboard
  const [authMode, setAuthMode] = useState('login')
  const [paired, setPaired] = useState(false)
  const [trainingJob, setTrainingJob] = useState(null)
  const [projects, setProjects] = useState([])
  const [devices, setDevices] = useState([])

  // Check auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (!user) { setView('auth'); return }
      // Check if device is paired
      const q = query(collection(db, 'users', user.uid, 'devices'))
      getDocs(q).then(snap => {
        const devs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setDevices(devs)
        if (devs.length > 0) {
          setPaired(true)
          setView('dashboard')
          loadProjects(user.uid)
        } else {
          setView('pair')
        }
      }).catch(() => setView('pair'))
    })
    return unsub
  }, [])

  const loadProjects = (uid) => {
    const q = query(collection(db, 'projects'), where('ownerUid', '==', uid))
    getDocs(q).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setProjects(data)
      // Check for active training job
      const active = data.find(p => ['queued', 'training'].includes(p.status))
      if (active) { setTrainingJob(active); setView('training') }
    }).catch(() => {})
  }

  const handleUnpair = async () => {
    if (!window.confirm('Unpair this device? You will be locked out.')) return
    try {
      const user = auth.currentUser
      for (const d of devices) {
        await deleteDoc(doc(db, 'users', user.uid, 'devices', d.id))
      }
      await auth.signOut()
      setDevices([])
      setPaired(false)
      setView('auth')
      toast.success('Device unpaired')
      vibrate(ImpactStyle.Heavy)
    } catch { toast.error('Failed') }
  }

  const handleLogout = async () => {
    await auth.signOut()
    setView('auth')
  }

  if (view === 'loading') return <LoadingScreen />
  if (view === 'auth') return <AuthScreen mode={authMode} setMode={setAuthMode} onSuccess={() => {}} />
  if (view === 'pair') return <PairScreen onPaired={() => { setPaired(true); setView('dashboard'); loadProjects(auth.currentUser.uid) }} />
  if (view === 'training') return <TrainingScreen job={trainingJob} onDone={() => { setView('dashboard'); loadProjects(auth.currentUser.uid) }} />
  return <DashboardScreen projects={projects} devices={devices} onUnpair={handleUnpair} onLogout={handleLogout} onRefresh={() => loadProjects(auth.currentUser.uid)} />
}


// ─── Loading ─────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${S.line}`, borderTopColor: S.lime, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}


// ─── Auth ────────────────────────────────────────────────────────

function AuthScreen({ mode, setMode, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      onSuccess()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: S.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <I name="logo" size={32} />
          <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 20, marginTop: 12, color: S.text }}>TODDLER</div>
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 22, color: S.text, marginBottom: 6, textAlign: 'center' }}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>
        <p style={{ color: S.dim, fontSize: 13, marginBottom: 28, textAlign: 'center' }}>
          {mode === 'login' ? 'Welcome back.' : 'No credit card required.'}
        </p>

        {/* Error */}
        {error && <div style={{ width: '100%', marginBottom: 16, padding: 10, background: 'rgba(255,92,62,0.1)', border: `1px solid ${S.danger}`, borderRadius: 6, color: S.danger, fontSize: 12, fontFamily: "'IBM Plex Mono'", textAlign: 'center' }}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleAuth} style={{ width: '100%' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={{ width: '100%', padding: '11px 14px', background: S.surface2, border: `1px solid ${S.line}`, borderRadius: 6, color: S.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: '11px 14px', background: S.surface2, border: `1px solid ${S.line}`, borderRadius: 6, color: S.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: S.lime, color: S.bg, border: 'none', borderRadius: 6, fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: S.faint }}>
            {mode === 'login' ? <>New? <span style={{ color: S.lime, cursor: 'pointer' }} onClick={() => setMode('signup')}>Sign up</span></> : <>Have an account? <span style={{ color: S.lime, cursor: 'pointer' }} onClick={() => setMode('login')}>Log in</span></>}
          </span>
        </div>
      </div>
    </div>
  )
}


// ─── Pair Screen ─────────────────────────────────────────────────

function PairScreen({ onPaired }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const refs = useRef([])

  const handleChange = (i, val) => {
    if (val.length > 1) val = val.slice(-1)
    const next = [...digits]
    next[i] = val.toUpperCase()
    setDigits(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const code = digits.join('')
  const canSubmit = code.length === 6

  const handlePair = async () => {
    if (!canSubmit || loading) return
    setLoading(true)
    setError('')
    try {
      const token = await auth.currentUser?.getIdToken()
      const fd = new FormData()
      fd.append('code', code)
      fd.append('platform', Capacitor.getPlatform() || 'android')
      fd.append('name', `${Capacitor.getPlatform() || 'Android'} device`)
      fd.append('ram_gb', String(navigator.deviceMemory ? Math.round(navigator.deviceMemory) : 4))
      const res = await fetch(`${API}/devices/pair`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Invalid code') }
      toast.success('Device paired')
      vibrate(ImpactStyle.Heavy)
      onPaired()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: S.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
        <I name="logo" size={28} />
        <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 20, marginTop: 16, marginBottom: 8 }}>Pair this device</h1>
        <p style={{ color: S.dim, fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>Enter the 6-digit code from your web dashboard to connect.</p>

        {error && <div style={{ marginBottom: 16, padding: 10, background: 'rgba(255,92,62,0.1)', border: `1px solid ${S.danger}`, borderRadius: 6, color: S.danger, fontSize: 12, fontFamily: "'IBM Plex Mono'" }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {digits.map((d, i) => (
            <input key={i} ref={el => refs.current[i] = el} type="text" maxLength={1} value={d}
              onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
              style={{ width: 40, height: 48, textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontSize: 20, background: S.surface2, border: `1px solid ${d ? S.lime : S.line}`, borderRadius: 6, color: S.text, outline: 'none' }} />
          ))}
        </div>

        <button onClick={handlePair} disabled={!canSubmit || loading} style={{ width: '100%', padding: 12, background: canSubmit ? S.lime : S.line, color: S.bg, border: 'none', borderRadius: 6, fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, cursor: canSubmit ? 'pointer' : 'default' }}>
          {loading ? 'Pairing...' : 'Pair Device'}
        </button>

        <div style={{ marginTop: 12, fontFamily: "'IBM Plex Mono'", fontSize: 9, color: S.faint }}>
          This device will register as a worker
        </div>
      </div>
    </div>
  )
}


// ─── Training Screen ─────────────────────────────────────────────

function TrainingScreen({ job, onDone }) {
  const [progress, setProgress] = useState(job?.progress || 0)
  const [status, setStatus] = useState(job?.status || 'queued')

  // Poll for progress
  useEffect(() => {
    if (!job) return
    const iv = setInterval(async () => {
      try {
        const snap = await getDoc(doc(db, 'projects', job.id))
        if (snap.exists()) {
          const data = snap.data()
          setProgress(data.progress || 0)
          setStatus(data.status)
          if (data.status === 'trained') {
            clearInterval(iv)
            vibrate(ImpactStyle.Heavy)
          }
        }
      } catch {}
    }, 3000)
    return () => clearInterval(iv)
  }, [job])

  if (!job) return null

  const done = status === 'trained'

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: S.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
        {!done ? (
          <>
            <div style={{ width: 64, height: 64, border: `3px solid ${S.line}`, borderTopColor: S.purple, borderRadius: '50%', animation: 'spin 1.5s linear infinite', margin: '0 auto 20px' }} />
            <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Training</h1>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: S.purple, marginBottom: 20 }}>{job.baseModelName || 'Model'}</div>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 36, color: S.text, marginBottom: 8 }}>{progress}%</div>
            <div style={{ width: '100%', height: 6, background: S.surface2, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: S.purple, borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint }}>
              {progress < 30 ? 'Downloading dataset...' : progress < 60 ? 'Chunking documents...' : progress < 90 ? 'Building index...' : 'Finalizing...'}
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 64, height: 64, background: 'rgba(198,255,51,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <I name="check" size={28} />
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Model trained</h1>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: S.lime, marginBottom: 8 }}>{job.name}</div>
            <div style={{ fontSize: 13, color: S.dim, marginBottom: 28 }}>{job.chunkCount || 0} chunks indexed</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onDone} style={{ flex: 1, padding: 12, background: S.lime, color: S.bg, border: 'none', borderRadius: 6, fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>
                Sandbox
              </button>
              <button onClick={onDone} style={{ flex: 1, padding: 12, background: 'transparent', color: S.dim, border: `1px solid ${S.line}`, borderRadius: 6, fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
                Export
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}


// ─── Dashboard ───────────────────────────────────────────────────

function DashboardScreen({ projects, devices, onUnpair, onLogout, onRefresh }) {
  const [tab, setTab] = useState('zoo')

  const tabs = [
    { id: 'zoo', icon: 'zoo', label: 'Zoo' },
    { id: 'queues', icon: 'queue', label: 'Queues' },
    { id: 'sandbox', icon: 'sandbox', label: 'Sandbox' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: S.bg, color: S.text, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: S.surface, borderBottom: `1px solid ${S.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I name="logo" size={16} />
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 14 }}>TODDLER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.lime, boxShadow: '0 0 6px rgba(198,255,51,0.4)' }} />
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: S.lime }}>Online</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'zoo' && <ZooScreen devices={devices} onRefresh={onRefresh} />}
        {tab === 'queues' && <QueuesScreen projects={projects} />}
        {tab === 'sandbox' && <SandboxScreen projects={projects} />}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', borderTop: `1px solid ${S.line}`, background: S.surface, flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, textAlign: 'center', padding: '10px 4px 8px', background: 'none', border: 'none',
            fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
            color: tab === t.id ? S.lime : S.faint,
            borderTop: `2px solid ${tab === t.id ? S.lime : 'transparent'}`,
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}><I name={t.icon} size={18} /></span>
            {t.label}
          </button>
        ))}
        {/* Unpair */}
        <button onClick={onUnpair} style={{
          flex: 1, textAlign: 'center', padding: '10px 4px 8px', background: 'none', border: 'none',
          fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
          color: S.faint, borderTop: '2px solid transparent', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}><I name="unlink" size={18} /></span>
          Unpair
        </button>
        {/* Logout */}
        <button onClick={onLogout} style={{
          flex: 1, textAlign: 'center', padding: '10px 4px 8px', background: 'none', border: 'none',
          fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
          color: S.faint, borderTop: '2px solid transparent', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}><I name="signout" size={18} /></span>
          Logout
        </button>
      </div>
    </div>
  )
}


// ─── Zoo Screen ──────────────────────────────────────────────────

function ZooScreen({ devices, onRefresh }) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch(`${API}/models`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.models) setModels(data.models) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = models.filter(m => {
    if (filter === 'trained') return false // TODO: filter by user's trained models
    if (filter === 'llm') return m.task === 'chat'
    if (filter === 'vision') return m.task !== 'chat'
    return true
  })

  const maxRam = devices.reduce((mx, d) => Math.max(mx, d.ramGb || 0), 0)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}><div style={{ width: 20, height: 20, border: `2px solid ${S.line}`, borderTopColor: S.lime, borderRadius: '50%', animation: 'spin 1s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ id: 'all', label: 'All' }, { id: 'llm', label: 'LLM' }, { id: 'vision', label: 'Vision' }].map(f => (
          <span key={f.id} onClick={() => setFilter(f.id)} style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
            border: `1px solid ${filter === f.id ? S.line : 'transparent'}`,
            background: filter === f.id ? S.surface2 : 'transparent',
            color: filter === f.id ? S.text : S.faint,
          }}>{f.label}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(m => {
          const fits = maxRam > 0 ? (m.minRamGb || 2) <= maxRam : false
          return (
            <div key={m.id} style={{ background: S.surface, border: `1px solid ${S.line}`, padding: 14, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center', opacity: fits ? 1 : 0.5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                  {fits && <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, padding: '2px 6px', borderRadius: 20, background: 'rgba(198,255,51,0.1)', color: S.lime, border: '1px solid rgba(198,255,51,0.3)' }}>Fits</span>}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint }}>{m.task === 'chat' ? 'LLM' : m.task} / {m.sizeMb}MB / {m.minRamGb || 2}GB</div>
              </div>
              <button style={{
                padding: '8px 12px', borderRadius: 6, fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600,
                background: fits ? 'transparent' : S.surface2, border: `1px solid ${fits ? S.line : S.surface2}`,
                color: fits ? S.dim : S.faint, cursor: fits ? 'pointer' : 'default', whiteSpace: 'nowrap',
              }}>
                {fits ? 'Train' : 'Cloud/Desktop'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ─── Queues Screen ───────────────────────────────────────────────

function QueuesScreen({ projects }) {
  const active = projects.filter(p => ['queued', 'training'].includes(p.status))
  const done = projects.filter(p => p.status === 'trained')

  return (
    <div style={{ padding: 16 }}>
      {active.length > 0 && (
        <>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: S.purple, marginBottom: 12 }}>Active</div>
          {active.map(j => (
            <div key={j.id} style={{ background: S.surface, border: `1px solid ${S.purple}`, padding: 14, borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14 }}>{j.name}</span>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: S.purple }}>{j.status}</span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint, marginBottom: 6 }}>{j.baseModelName} / {j.progress || 0}%</div>
              <div style={{ height: 4, background: S.surface2, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${j.progress || 0}%`, height: '100%', background: S.purple, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: S.faint, marginBottom: 12, marginTop: active.length ? 20 : 0 }}>Completed</div>
      {done.length === 0 && <div style={{ color: S.faint, fontSize: 13, textAlign: 'center', padding: 32 }}>No completed jobs yet.</div>}
      {done.map(j => (
        <div key={j.id} style={{ background: S.surface, border: `1px solid ${S.line}`, padding: 12, borderRadius: 8, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{j.name}</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: S.faint }}>{j.baseModelName} / {j.chunkCount || 0} chunks</div>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: S.lime }}>Done</span>
        </div>
      ))}
    </div>
  )
}


// ─── Sandbox Screen ──────────────────────────────────────────────

function SandboxScreen({ projects }) {
  const trained = projects.filter(p => p.status === 'trained')
  const [sel, setSel] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [inp, setInp] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = projects.find(p => p.id === sel)

  useEffect(() => { if (trained.length > 0 && !sel) setSel(trained[0].id) }, [trained.length])

  const send = async (e) => {
    e?.preventDefault()
    const text = inp.trim()
    if (!text || busy || !selected) return
    setInp('')
    setMsgs(p => [...p, { role: 'user', text }])
    setBusy(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const fd = new FormData()
      fd.append('project_id', sel)
      fd.append('text', text)
      const res = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `HTTP ${res.status}`) }
      const data = await res.json()
      setMsgs(p => [...p, { role: 'bot', text: data.response || 'No response.', sources: data.sources || [] }])
    } catch (err) {
      setMsgs(p => [...p, { role: 'bot', text: err.message, error: true }])
    } finally { setBusy(false) }
  }

  if (trained.length === 0) return (
    <div style={{ textAlign: 'center', padding: 48, maxWidth: 280, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: S.text, marginBottom: 6 }}>No trained models</div>
      <div style={{ fontSize: 12, color: S.faint }}>Train a model from the Zoo first.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Model picker */}
      <div style={{ padding: '8px 16px', borderBottom: `1px solid ${S.line}`, background: S.surface, display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
        {trained.map(p => (
          <span key={p.id} onClick={() => { setSel(p.id); setMsgs([]) }} style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', whiteSpace: 'nowrap',
            border: `1px solid ${sel === p.id ? S.line : 'transparent'}`,
            background: sel === p.id ? S.surface2 : 'transparent',
            color: sel === p.id ? S.text : S.faint,
          }}>{p.name}</span>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        {msgs.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0' }}><p style={{ color: S.faint, fontSize: 12 }}>Ask <span style={{ color: S.text }}>{selected?.name}</span> something.</p></div>}
        {msgs.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, maxWidth: '85%', marginLeft: m.role === 'user' ? 'auto' : 0 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: S.faint, marginBottom: 2, textAlign: m.role === 'user' ? 'right' : 'left' }}>
              {m.role === 'user' ? 'You' : 'Toddler'}
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.5,
              background: m.role === 'user' ? S.surface : 'transparent',
              border: m.role === 'user' ? `1px solid ${S.line}` : 'none',
              borderLeft: m.role === 'bot' ? `2px solid ${S.line}` : 'none',
              padding: m.role === 'user' ? '8px 12px' : '0 0 0 10px',
              borderRadius: m.role === 'user' ? 6 : 0,
              color: m.error ? S.danger : m.role === 'user' ? S.text : S.dim,
            }}>{m.text}</div>
            {m.sources?.length > 0 && (
              <div style={{ marginTop: 4, paddingLeft: 10 }}>
                {m.sources.map((s, j) => <div key={j} style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: S.faint }}>{s.source || s}{s.chunkIndex !== undefined ? ` (chunk ${s.chunkIndex})` : ''}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ display: 'flex', gap: 6, padding: 10, borderTop: `1px solid ${S.line}`, background: S.surface, flexShrink: 0 }}>
        <input value={inp} onChange={e => setInp(e.target.value)} placeholder="Ask something..." disabled={busy}
          style={{ flex: 1, padding: '8px 12px', background: S.bg, border: `1px solid ${S.line}`, borderRadius: 6, color: S.text, fontSize: 12, outline: 'none' }} />
        <button type="submit" disabled={busy || !inp.trim()} style={{
          padding: '8px 10px', background: S.surface2, border: 'none', borderRadius: 6, cursor: 'pointer',
          display: 'flex', alignItems: 'center', opacity: (!busy && inp.trim()) ? 1 : 0.5,
        }}><I name="send" size={14} /></button>
      </form>
    </div>
  )
}
