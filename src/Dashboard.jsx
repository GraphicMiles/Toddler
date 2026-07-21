import React, { useState, useEffect, useRef } from 'react'
import { auth, db } from './firebase'
import { collection, query, where, getDocs, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore'
import { toast } from 'react-hot-toast'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { startBYOC, stopBYOC } from './byoc'

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
    refresh: <><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    menu: <><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{flexShrink:0,display:'block'}}>{p[name]}</svg>
}

export default function Dashboard() {
  const [tab, setTab] = useState('zoo')
  const [open, setOpen] = useState(false)
  const [mob, setMob] = useState(false)
  const [projects, setProjects] = useState([])
  const [devices, setDevices] = useState([])
  const [trainModel, setTrainModel] = useState(null) // { id, name } or null

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 839px)')
    const h = e => setMob(e.matches)
    mq.addEventListener('change', h); h(mq)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    if (!auth.currentUser) return
    getDocs(query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid)))
      .then(s => { const d = s.docs.map(x => ({ id: x.id, ...x.data() })); d.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); setProjects(d) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!auth.currentUser) return
    getDocs(query(collection(db, 'users', auth.currentUser.uid, 'devices')))
      .then(s => setDevices(s.docs.map(x => ({ id: x.id, ...x.data() })))).catch(() => {})
  }, [])

  // Start BYOC worker on Android only — web is control tower, never trains
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      startBYOC()
      return () => stopBYOC()
    }
  }, [])

  const nav = [
    { id: 'zoo', icon: 'zoo', label: 'Model Zoo' },
    { id: 'sandbox', icon: 'sandbox', label: 'Sandbox' },
    { id: 'apis', icon: 'api', label: 'APIs' },
    { id: 'devices', icon: 'device', label: 'Devices' },
  ]

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dash-app { display:flex; height:100vh; background:#14130F; color:#F2EFE6; font-family:'Inter',sans-serif; overflow:hidden; }
        .dash-side { width:216px; background:#1D1B16; border-right:1px solid #38352B; display:flex; flex-direction:column; flex-shrink:0; }
        .dash-main { flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden; }
        .dash-content { flex:1; overflow:auto; }
        .dash-topbar { padding:10px 16px; border-bottom:1px solid #38352B; background:#1D1B16; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .dash-nav-item { display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:6px; font-size:12px; color:#A8A296; cursor:pointer; border-left:2px solid transparent; transition:all 0.15s; }
        .dash-nav-item:hover { background:rgba(255,255,255,0.03); color:#F2EFE6; }
        .dash-nav-item.on { background:rgba(198,255,51,0.08); color:#F2EFE6; border-left-color:#C6FF33; font-weight:500; }
        .dash-chip { font-family:'IBM Plex Mono',monospace; font-size:10px; padding:4px 10px; border-radius:5px; cursor:pointer; border:1px solid transparent; color:#6E695C; background:transparent; transition:all 0.15s; display:inline-block; }
        .dash-chip:hover { color:#F2EFE6; }
        .dash-chip.on { background:#2E2A20; border-color:#38352B; color:#F2EFE6; }
        .dash-card { background:#1D1B16; border:1px solid #38352B; padding:16px; border-radius:8px; display:flex; flex-direction:column; gap:6px; transition:border-color 0.15s,transform 0.15s; }
        .dash-card:hover { border-color:#6E695C; transform:translateY(-1px); }
        .dash-grid { display:grid; gap:10px; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); }
        .dash-device-card { background:#1D1B16; border:1px solid #38352B; padding:12px; border-radius:8px; display:flex; align-items:center; gap:12px; }
        .dash-code-card { background:#1D1B16; border:1px solid #38352B; border-radius:7px; overflow:hidden; margin-bottom:8px; }
        .dash-pair-box { border:1px solid #38352B; border-radius:6px; padding:18px; text-align:center; }
        .dash-input { flex:1; padding:8px 12px; background:#14130F; border:1px solid #38352B; border-radius:6px; color:#F2EFE6; font-size:12px; font-family:'Inter',sans-serif; outline:none; }
        .dash-input::placeholder { color:#6E695C; }
        .dash-send-btn { padding:8px 10px; background:#26231C; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; }
        .dash-msg-user { margin-left:auto; max-width:80%; margin-bottom:14px; }
        .dash-msg-user .lbl { font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#6E695C; text-align:right; margin-bottom:3px; }
        .dash-msg-user .body { background:#1D1B16; border:1px solid #38352B; padding:9px 12px; border-radius:7px; font-size:13px; line-height:1.6; color:#F2EFE6; }
        .dash-msg-bot { max-width:88%; margin-bottom:14px; }
        .dash-msg-bot .lbl { font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#6E695C; margin-bottom:3px; }
        .dash-msg-bot .body { border-left:2px solid #38352B; padding:0 0 0 12px; font-size:13px; line-height:1.6; color:#A8A296; }
        @media (max-width:839px) { .dash-side { position:fixed; top:0; bottom:0; left:0; z-index:100; transform:translateX(-100%); transition:transform 0.2s ease; } .dash-side.open { transform:translateX(0); } }
      `}</style>
      <div className="dash-app">
        {mob && open && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:90}} onClick={() => setOpen(false)} />}
        <aside className={`dash-side${open ? ' open' : ''}`}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #38352B',display:'flex',alignItems:'center',gap:8}}>
            <I name="logo" size={18} />
            <span style={{fontFamily:"'Space Grotesk'",fontWeight:700,fontSize:14,color:'#F2EFE6'}}>TODDLER</span>
            {mob && <button onClick={() => setOpen(false)} style={{marginLeft:'auto',background:'none',border:'none',color:'#6E695C',cursor:'pointer',padding:4}}><I name="close" size={18} /></button>}
          </div>
          <nav style={{flex:1,padding:'10px 6px',display:'flex',flexDirection:'column',gap:1}}>
            {nav.map(item => (
              <div key={item.id} className={`dash-nav-item${tab===item.id?' on':''}`} onClick={() => { setTab(item.id); setOpen(false) }}>
                <I name={item.icon} size={16} /><span>{item.label}</span>
              </div>
            ))}
          </nav>
          <div style={{padding:'10px 6px',borderTop:'1px solid #38352B'}}>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:'#6E695C',padding:'4px 10px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{auth.currentUser?.email}</div>
            <div onClick={() => auth.signOut()} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',color:'#6E695C',fontSize:11,cursor:'pointer',borderRadius:5}}>
              <I name="signout" size={14} /> Sign out
            </div>
          </div>
        </aside>
        <div className="dash-main">
          <div className="dash-topbar">
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {mob && <button onClick={() => setOpen(true)} style={{background:'none',border:'none',color:'#A8A296',cursor:'pointer',padding:4}}><I name="menu" size={20} /></button>}
              <span style={{fontFamily:"'Space Grotesk'",fontWeight:600,fontSize:14,color:'#F2EFE6'}}>{nav.find(n=>n.id===tab)?.label}</span>
            </div>
            {tab==='zoo' && devices.length>0 && <span style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:'#6E695C'}}>fit: {devices[0]?.name} / {devices[0]?.ramGb}GB</span>}
          </div>
          <div className="dash-content">
            {trainModel ? <TrainWizard model={trainModel} onClose={() => setTrainModel(null)} /> : (
              <>
                {tab==='zoo' && <ZooTab devices={devices} onTrain={m => setTrainModel(m)} />}
                {tab==='sandbox' && <SandboxTab projects={projects} />}
                {tab==='apis' && <ApisTab projects={projects} />}
                {tab==='devices' && <DevicesTab devices={devices} setDevices={setDevices} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ZooTab({ devices, onTrain }) {
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
  const maxRam = devices.reduce((mx, d) => Math.max(mx, d.ramGb || 0), 0)

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}><div style={{width:20,height:20,border:'2px solid #38352B',borderTopColor:'#C6FF33',borderRadius:'50%',animation:'spin 1s linear infinite'}} /></div>
  if (error) return <div style={{textAlign:'center',padding:64,maxWidth:300,margin:'0 auto'}}><div style={{fontFamily:"'Space Grotesk'",fontWeight:600,fontSize:15,color:'#F2EFE6',marginBottom:6}}>Failed to load</div><div style={{fontSize:12,color:'#6E695C'}}>{error}</div></div>
  if (filtered.length===0) return <div style={{textAlign:'center',padding:64,maxWidth:300,margin:'0 auto'}}><div style={{fontFamily:"'Space Grotesk'",fontWeight:600,fontSize:15,color:'#F2EFE6',marginBottom:6}}>No models</div><div style={{fontSize:12,color:'#6E695C'}}>No models match this filter.</div></div>

  return (
    <div style={{padding:16}}>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        {[{id:'all',label:'All models'},{id:'llm',label:'Language'},{id:'vision',label:'Vision'}].map(f => (
          <span key={f.id} className={`dash-chip${filter===f.id?' on':''}`} onClick={() => setFilter(f.id)}>{f.label}</span>
        ))}
      </div>
      <div className="dash-grid">
        {filtered.map(m => {
          const ok = maxRam > 0 ? (m.minRamGb||2) <= maxRam : false
          return (
            <div key={m.id} className="dash-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                <h4 style={{fontFamily:"'Space Grotesk'",fontSize:14,fontWeight:600,color:'#F2EFE6',margin:0}}>{m.name}</h4>
                <span style={{fontFamily:"'IBM Plex Mono'",fontSize:9,letterSpacing:1,textTransform:'uppercase',padding:'3px 9px',borderRadius:20,whiteSpace:'nowrap',flexShrink:0,background:ok?'rgba(198,255,51,0.10)':'#26231C',color:ok?'#C6FF33':'#6E695C',border:`1px solid ${ok?'rgba(198,255,51,0.3)':'#38352B'}`}}>{ok?'✓ Fits':`Needs ${m.minRamGb||2}GB`}</span>
              </div>
              <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:'#6E695C'}}>{m.task==='chat'?'LLM':m.task} / {m.sizeMb} MB / {m.minRamGb||2} GB RAM</div>
              <div style={{fontSize:12,color:'#A8A296',lineHeight:1.5}}>{m.description || `${m.name} for on-device use.`}</div>
              <button onClick={() => onTrain?.({ id: m.id, name: m.name })} style={{marginTop:'auto',fontFamily:"'IBM Plex Mono'",fontSize:9,letterSpacing:1,textTransform:'uppercase',fontWeight:600,padding:'8px 12px',borderRadius:6,cursor:'pointer',width:'100%',background:'transparent',border:'1px solid #38352B',color:'#A8A296',transition:'all 0.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#6E695C';e.currentTarget.style.color='#F2EFE6'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#38352B';e.currentTarget.style.color='#A8A296'}}>Train this model</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SandboxTab({ projects }) {
  const [sel, setSel] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [inp, setInp] = useState('')
  const [busy, setBusy] = useState(false)
  const trained = projects.filter(p => p.status === 'trained')
  const selected = projects.find(p => p.id === sel)

  useEffect(() => { if (trained.length > 0 && !sel) setSel(trained[0].id) }, [trained.length])

  const send = async (e) => {
    e?.preventDefault()
    const text = inp.trim(); if (!text || busy || !selected) return
    setInp(''); setMsgs(p => [...p, { role: 'user', text }]); setBusy(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const fd = new FormData(); fd.append('project_id', sel); fd.append('text', text)
      const res = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `HTTP ${res.status}`) }
      const data = await res.json()
      setMsgs(p => [...p, { role: 'bot', text: data.response || 'No response.', sources: data.sources || [] }])
    } catch (err) { setMsgs(p => [...p, { role: 'bot', text: err.message, error: true }]) }
    finally { setBusy(false) }
  }

  if (trained.length === 0) return <div style={{textAlign:'center',padding:64,maxWidth:300,margin:'0 auto'}}><div style={{fontFamily:"'Space Grotesk'",fontWeight:600,fontSize:15,color:'#F2EFE6',marginBottom:6}}>No trained models</div><div style={{fontSize:12,color:'#6E695C'}}>Train a model from the Zoo to use the sandbox.</div></div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'10px 16px',borderBottom:'1px solid #38352B',background:'#1D1B16',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <span style={{fontFamily:"'Space Grotesk'",fontWeight:600,fontSize:14,color:'#F2EFE6'}}>Sandbox</span>
        <span style={{fontFamily:"'IBM Plex Mono'",fontSize:9,letterSpacing:1,textTransform:'uppercase',padding:'3px 9px',borderRadius:20,background:'#26231C',color:'#6E695C',border:'1px solid #38352B'}}>Retrieval preview</span>
      </div>
      <div style={{padding:'6px 14px',borderBottom:'1px solid #38352B',background:'#1D1B16',display:'flex',gap:6,overflowX:'auto',flexShrink:0}}>
        {trained.map(p => <span key={p.id} className={`dash-chip${sel===p.id?' on':''}`} onClick={() => { setSel(p.id); setMsgs([]) }} style={{whiteSpace:'nowrap'}}>{p.name}</span>)}
      </div>
      <div style={{flex:1,overflow:'auto',padding:16}}>
        {msgs.length===0 && <div style={{textAlign:'center',padding:'48px 0'}}><p style={{color:'#6E695C',fontSize:12}}>Ask <span style={{color:'#F2EFE6'}}>{selected?.name}</span> a question.</p></div>}
        {msgs.map((m,i) => (
          <div key={i} className={m.role==='user'?'dash-msg-user':'dash-msg-bot'}>
            <div className="lbl">{m.role==='user'?'You':'Toddler'}</div>
            <div className="body" style={m.error?{color:'#FF5C3E'}:{}}>{m.text}</div>
            {m.sources?.length>0 && <div style={{marginTop:6,paddingLeft:12,fontFamily:"'IBM Plex Mono'",fontSize:10,color:'#6E695C'}}>{m.sources.map((s,j)=><div key={j}>{s.source||s}{s.chunkIndex!==undefined?` (chunk ${s.chunkIndex})`:''}</div>)}</div>}
          </div>
        ))}
      </div>
      <form onSubmit={send} style={{display:'flex',gap:6,padding:10,borderTop:'1px solid #38352B',background:'#1D1B16',flexShrink:0}}>
        <input className="dash-input" value={inp} onChange={e=>setInp(e.target.value)} placeholder="Ask something..." disabled={busy} />
        <button className="dash-send-btn" type="submit" disabled={busy||!inp.trim()} style={{opacity:(!busy&&inp.trim())?1:0.5}}><I name="send" size={14} /></button>
      </form>
    </div>
  )
}

function ApisTab({ projects }) {
  const [sel, setSel] = useState(null)
  const [copied, setCopied] = useState(null)
  const withKeys = projects.filter(p => p.api_key)
  const selected = projects.find(p => p.id === sel)

  useEffect(() => { if (withKeys.length > 0 && !sel) setSel(withKeys[0].id) }, [withKeys.length])
  const cp = (t, l) => { navigator.clipboard.writeText(t).then(() => { setCopied(l); toast.success('Copied'); setTimeout(() => setCopied(null), 2000) }).catch(() => {}) }

  if (withKeys.length === 0) return <div style={{textAlign:'center',padding:64,maxWidth:300,margin:'0 auto'}}><div style={{fontFamily:"'Space Grotesk'",fontWeight:600,fontSize:15,color:'#F2EFE6',marginBottom:6}}>No API keys</div><div style={{fontSize:12,color:'#6E695C'}}>Train a model to generate an API key.</div></div>

  const curl = `curl -X POST ${API}/predict \\\n  -H "X-API-Key: ${selected?.api_key||'KEY'}" \\\n  -F "project_id=${selected?.id||'ID'}" \\\n  -F "text=your text"`
  const py = `import requests\nres = requests.post(\n    "${API}/predict",\n    headers={"X-API-Key": "${selected?.api_key||'KEY'}"},\n    data={"project_id": "${selected?.id||'ID'}", "text": "your text"}\n)\nprint(res.json())`

  return (
    <div style={{padding:16,maxWidth:520}}>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        {withKeys.map(p => <span key={p.id} className={`dash-chip${sel===p.id?' on':''}`} onClick={() => setSel(p.id)}>{p.name}</span>)}
      </div>
      {selected && (<>
        <div style={{background:'#1D1B16',border:'1px solid #38352B',padding:14,borderRadius:8,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:'#6E695C'}}>API key</span>
            <span style={{fontFamily:"'IBM Plex Mono'",fontSize:9,color:'#6E695C',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><I name="refresh" size={11} /> Regenerate</span>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <code style={{flex:1,fontFamily:"'IBM Plex Mono'",fontSize:12,background:'#14130F',padding:'8px 10px',border:'1px solid #38352B',borderRadius:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#F2EFE6',display:'block'}}>{selected.api_key||'No key yet'}</code>
            <div onClick={() => selected.api_key&&cp(selected.api_key,'key')} style={{padding:5,background:'transparent',border:'1px solid #38352B',borderRadius:5,cursor:'pointer',display:'flex',alignItems:'center',color:'#6E695C'}}><I name={copied==='key'?'check':'copy'} size={14} /></div>
          </div>
        </div>
        {[{l:'cURL',c:curl},{l:'Python',c:py}].map(s => (
          <div key={s.l} className="dash-code-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 14px',borderBottom:'1px solid #38352B'}}>
              <span style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:'#A8A296'}}>{s.l}</span>
              <span onClick={() => cp(s.c,s.l)} style={{cursor:'pointer',color:'#6E695C',display:'flex'}}><I name={copied===s.l?'check':'copy'} size={12} /></span>
            </div>
            <pre style={{padding:12,margin:0,fontFamily:"'IBM Plex Mono'",fontSize:11,color:'#A8A296',lineHeight:1.6,overflow:'auto',whiteSpace:'pre-wrap',background:'#14130F'}}>{s.c}</pre>
          </div>
        ))}
      </>)}
    </div>
  )
}

function DevicesTab({ devices, setDevices }) {
  const code = auth.currentUser?.uid?.substring(0,6).toUpperCase()||'------'
  const unpair = async id => {
    if (!window.confirm('Unpair this device?')) return
    try { await deleteDoc(doc(db,'users',auth.currentUser.uid,'devices',id)); setDevices(p=>p.filter(d=>d.id!==id)); toast.success('Device unpaired'); vibrate(ImpactStyle.Heavy) } catch { toast.error('Failed') }
  }

  return (
    <div style={{padding:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <span style={{fontFamily:"'Space Grotesk'",fontWeight:600,fontSize:14,color:'#F2EFE6'}}>Devices</span>
        <button style={{fontFamily:"'IBM Plex Mono'",fontSize:9,letterSpacing:1,textTransform:'uppercase',fontWeight:600,padding:'7px 12px',borderRadius:6,cursor:'pointer',background:'#C6FF33',color:'#14130F',border:'none'}}>Pair a device</button>
      </div>
      {devices.length===0 ? (
        <div style={{display:'flex',gap:24,flexWrap:'wrap',alignItems:'start'}}>
          <div style={{maxWidth:280}}>
            <div style={{fontFamily:"'Space Grotesk'",fontWeight:600,fontSize:15,color:'#F2EFE6',marginBottom:6}}>No devices</div>
            <div style={{fontSize:12,color:'#6E695C',lineHeight:1.6}}>Install the Toddler app on your phone and enter this code to pair.</div>
          </div>
          <div className="dash-pair-box">
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'#6E695C',marginBottom:10}}>Your pairing code</div>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:28,letterSpacing:10,color:'#F2EFE6',paddingLeft:10}}>{code}</div>
          </div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8,maxWidth:420}}>
          {devices.map(d => (
            <div key={d.id} className="dash-device-card">
              <div style={{width:32,height:32,background:'#26231C',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><I name="device" size={16} /></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:500,fontSize:12,color:'#F2EFE6',marginBottom:1}}>{d.name||d.platform||'Device'}</div>
                <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:'#6E695C'}}>{d.platform||'unknown'} / {d.ramGb||'?'} GB / {d.status||'offline'}</div>
              </div>
              <div style={{width:6,height:6,borderRadius:'50%',flexShrink:0,background:d.status==='online'?'#C6FF33':'#6E695C',boxShadow:d.status==='online'?'0 0 6px rgba(198,255,51,0.4)':'none'}} />
              <div onClick={() => unpair(d.id)} style={{padding:5,background:'transparent',border:'1px solid #38352B',borderRadius:5,cursor:'pointer',display:'flex',alignItems:'center',flexShrink:0,color:'#6E695C'}}><I name="unlink" size={12} /></div>
            </div>
          ))}
          <div style={{marginTop:12}}>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:'#6E695C',marginBottom:8}}>Pair another device</div>
            <div className="dash-pair-box" style={{maxWidth:260}}>
              <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'#6E695C',marginBottom:10}}>Your pairing code</div>
              <div style={{fontFamily:"'IBM Plex Mono'",fontSize:24,letterSpacing:8,color:'#F2EFE6',paddingLeft:8}}>{code}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TrainWizard({ model, onClose }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files)
    if (picked.length > 0) setFiles(picked)
  }

  const handleTrain = async () => {
    if (!name.trim()) { toast.error('Enter a model name'); return }
    if (files.length === 0) { toast.error('Upload at least one file'); return }
    setUploading(true)
    try {
      const { uploadDatasetToCloudinary } = await import('./cloud')
      const urls = []
      for (const f of files) {
        const url = await uploadDatasetToCloudinary(f)
        urls.push({ name: f.name, url, size: f.size })
      }
      const projectData = {
        ownerUid: auth.currentUser.uid,
        name: name,
        baseModelId: model.id,
        baseModelName: model.name,
        trainingMode: 'rag',
        status: 'queued',
        progress: 0,
        chunkCount: 0,
        fileCount: files.length,
        datasetFiles: urls,
        createdAt: new Date(),
        version: 1,
      }
      const docRef = await addDoc(collection(db, 'projects'), projectData)
      const token = await auth.currentUser?.getIdToken()
      const fd = new FormData()
      fd.append('project_id', docRef.id)
      fd.append('dataset_url', urls[0]?.url || '')
      fd.append('model_id', model.id)
      fd.append('training_mode', 'rag')
      fd.append('runner', 'auto')
      await fetch(`${API}/train`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd }).catch(() => {})
      setStep(4)
      toast.success('Training job queued')
    } catch (err) {
      toast.error(err.message || 'Failed to queue training')
    } finally { setUploading(false) }
  }

  const S = { bg: '#14130F', surface: '#1D1B16', surface2: '#26231C', line: '#38352B', text: '#F2EFE6', dim: '#A8A296', faint: '#6E695C', lime: '#C6FF33', purple: '#7D39EB' }
  const mono = { fontFamily: "'IBM Plex Mono', monospace" }
  const display = { fontFamily: "'Space Grotesk', sans-serif" }

  return (
    <div style={{ padding: 24, maxWidth: 500, margin: '0 auto' }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: S.faint, cursor: 'pointer', ...mono, fontSize: 11, marginBottom: 16, padding: 0 }}>{'\u2190 Back to Zoo'}</button>
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {[1, 2, 3].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? (i === step ? S.purple : S.lime) : S.line }} />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: S.surface2, border: `1px solid ${S.line}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', ...display, fontWeight: 700, fontSize: 14, color: S.lime }}>{(model.name || 'M').charAt(0)}</div>
        <div>
          <div style={{ ...display, fontWeight: 600, fontSize: 16, color: S.text }}>{model.name}</div>
          <div style={{ ...mono, fontSize: 10, color: S.faint }}>RAG training</div>
        </div>
      </div>

      {step === 1 && (
        <div>
          <div style={{ ...display, fontWeight: 600, fontSize: 20, color: S.text, marginBottom: 6 }}>Name your model</div>
          <div style={{ fontSize: 13, color: S.dim, marginBottom: 20 }}>Give it a name that describes what it does.</div>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name && setStep(2)} placeholder="e.g. Medical FAQ Bot" autoFocus style={{ width: '100%', padding: '12px 16px', background: S.surface2, border: 'none', borderBottom: `2px solid ${S.lime}`, color: S.text, fontSize: 18, ...display, fontWeight: 600, outline: 'none', marginBottom: 24 }} />
          <button onClick={() => name ? setStep(2) : toast.error('Enter a name')} style={{ width: '100%', padding: 12, background: name ? S.lime : S.line, color: S.bg, border: 'none', borderRadius: 6, ...mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, cursor: name ? 'pointer' : 'default' }}>Continue</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ ...display, fontWeight: 600, fontSize: 20, color: S.text, marginBottom: 6 }}>Upload your data</div>
          <div style={{ fontSize: 13, color: S.dim, marginBottom: 20 }}>The model reads these at inference time.</div>
          <div onClick={() => fileRef.current?.click()} style={{ border: `1.5px dashed ${S.line}`, borderRadius: 10, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}>
            <div style={{ ...mono, fontSize: 12, color: S.lime, marginBottom: 4 }}>{files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Drop files here or click'}</div>
            <div style={{ ...mono, fontSize: 10, color: S.faint }}>.txt .csv .md .json .pdf</div>
            <input ref={fileRef} type="file" multiple accept=".txt,.csv,.md,.json,.pdf" onChange={handleFiles} style={{ display: 'none' }} />
          </div>
          {files.length > 0 && files.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '8px 12px', background: S.surface, border: `1px solid ${S.line}`, borderRadius: 4, marginBottom: 4 }}>
              <span style={{ color: S.text }}>{f.name}</span>
              <span style={{ ...mono, fontSize: 10, color: S.faint }}>{(f.size / 1024).toFixed(1)} KB</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setStep(1)} style={{ padding: 12, background: 'transparent', border: `1px solid ${S.line}`, color: S.dim, ...mono, fontSize: 10, borderRadius: 6, cursor: 'pointer' }}>{'\u2190 Back'}</button>
            <button onClick={() => files.length > 0 ? setStep(3) : toast.error('Upload at least one file')} style={{ flex: 1, padding: 12, background: files.length > 0 ? S.lime : S.line, color: S.bg, border: 'none', borderRadius: 6, ...mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, cursor: files.length > 0 ? 'pointer' : 'default' }}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ ...display, fontWeight: 600, fontSize: 20, color: S.text, marginBottom: 16 }}>Ready to train</div>
          <div style={{ background: S.surface, border: `1px solid ${S.line}`, borderRadius: 6, padding: 14, marginBottom: 16 }}>
            {[['Model', model.name], ['Name', name], ['Files', files.length], ['Mode', 'RAG']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                <span style={{ color: S.dim }}>{k}</span>
                <span style={{ color: k === 'Mode' ? S.lime : S.text }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(2)} style={{ padding: 12, background: 'transparent', border: `1px solid ${S.line}`, color: S.dim, ...mono, fontSize: 10, borderRadius: 6, cursor: 'pointer' }}>{'\u2190 Back'}</button>
            <button onClick={handleTrain} disabled={uploading} style={{ flex: 1, padding: 12, background: uploading ? S.line : S.lime, color: S.bg, border: 'none', borderRadius: 6, ...mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, cursor: uploading ? 'default' : 'pointer' }}>{uploading ? 'Uploading...' : 'Queue Training'}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ ...display, fontWeight: 600, fontSize: 20, color: S.text, marginBottom: 6 }}>Job Queued</div>
          <div style={{ fontSize: 13, color: S.dim, marginBottom: 24 }}>Open the Toddler app on your phone to pick up the training job.</div>
          <button onClick={onClose} style={{ padding: '10px 20px', background: S.lime, color: S.bg, border: 'none', borderRadius: 6, ...mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>Back to Zoo</button>
        </div>
      )}
    </div>
  )
}
