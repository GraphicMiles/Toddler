import React from 'react'
import { Download, Cpu, HardDrive, MemoryStick, CheckCircle2, Play, Send, Code2, ChevronRight, Smartphone, Zap, Loader2, Menu, X, Plus, Trash2, FolderOpen, Unlink } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { auth, db } from './firebase'
import { signOut } from 'firebase/auth'
import { collection, query, where, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore'
import { toast } from 'react-hot-toast'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import Onboarding from './Onboarding'

function Sidebar({ currentProject, onDeleteProject, onClose, isMobile }) {
  const handleUnpair = async () => {
    if (!window.confirm('Unpair this device? You will be locked out and need a new pairing code to reconnect.')) return;
    try {
      await auth.signOut();
      if (isMobile) onClose?.();
    } catch (_e) {
      toast.error('Failed to unpair');
    }
  };

  return (
    <aside className="td-sidebar td-sidebar-drawer flex flex-col h-full bg-[var(--surface-2)] w-64 border-r border-[var(--line)]">
      <div className="p-6 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)]">
        <div>
          <h2 className="text-xl font-display font-bold text-white">Toddler Worker</h2>
          <div className="text-[var(--accent-lime)] text-[10px] font-mono mt-1 flex items-center gap-2 tracking-widest uppercase">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-lime)] animate-pulse"></div> Online
          </div>
        </div>
        {isMobile && <button className="btn-ghost !p-2" onClick={onClose}><X size={20}/></button>}
      </div>

      <div className="p-6 border-b border-[var(--line)]">
        <div className="text-[10px] font-mono text-[var(--text-faint)] mb-3 uppercase tracking-wider">User Profile</div>
        <div className="font-bold text-sm text-[var(--text)] truncate">{auth.currentUser?.email || 'Worker Node'}</div>
        <button className="btn w-full mt-4 !border-[var(--danger)] !text-[var(--danger)] bg-transparent hover:!bg-[var(--danger)] hover:!text-white flex justify-center items-center gap-2 text-xs" onClick={handleUnpair}>
          <Unlink size={14} /> Unpair Device
        </button>
      </div>

      <div className="p-6 flex-grow">
        <div className="text-[10px] font-mono text-[var(--text-faint)] mb-4 uppercase tracking-wider">Project Settings</div>
        {currentProject ? (
          <div>
            <div className="font-bold text-sm text-[var(--text)] mb-4 truncate">{currentProject.name}</div>
            <button className="btn-ghost w-full !text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)]/10 flex justify-center items-center gap-2 text-xs" onClick={() => { onDeleteProject(currentProject.id); onClose?.(); }}>
              <Trash2 size={14} /> Delete Project
            </button>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-dim)] italic">No active project.</div>
        )}
      </div>
    </aside>
  );
}

export default function MobileDashboard() {
  const [tab, setTab] = React.useState('zoo')
  const [catalog, setCatalog] = React.useState([])
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [testText, setTestText] = React.useState('')
  const [testing, setTesting] = React.useState(false)
  const [chatHistory, setChatHistory] = React.useState([])
  const [showOnboarding, setShowOnboarding] = React.useState(false)
  const [projectsLoading, setProjectsLoading] = React.useState(true)
  const [projects, setProjects] = React.useState([])
  const [activeProjectId, setActiveProjectId] = React.useState(null)
  const projectsRef = React.useRef([])
  const [authReady, setAuthReady] = React.useState(false)

  const vibrate = (style = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) Haptics.impact({ style }).catch(() => {})
  }

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(async user => {
      if (!user) { setAuthReady(true); return }
      
      if (Capacitor.isNativePlatform()) {
        try {
          let perm = await PushNotifications.checkPermissions();
          if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
          if (perm.receive === 'granted') {
            PushNotifications.addListener('registration', async (token) => {
              const ram = navigator.deviceMemory ? Math.round(navigator.deviceMemory) : 4;
              await setDoc(doc(db, "users", user.uid, "devices", Capacitor.getPlatform() + "_" + navigator.userAgent.replace(/\D/g,'').slice(0,6)), {
                platform: Capacitor.getPlatform(),
                status: 'online',
                ram_gb: ram,
                fcmToken: token.value,
                lastSeen: new Date()
              }, { merge: true });
            });
            await PushNotifications.register();
          }
        } catch(_e) {}
      }
      setAuthReady(true)
    })
    return unsub
  }, [])

  React.useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (apiUrl) fetch(`${apiUrl}/models`).then(r => r.ok ? r.json() : null).then(data => { if (data?.models) setCatalog(data.models) }).catch(()=>{})
  }, [])

  React.useEffect(() => {
    if (!authReady) return
    let cancelled = false
    let iv = null
    const fetchProjects = async () => {
      if (!auth.currentUser) return
      try {
        const q = query(collection(db, 'projects'), where('ownerUid', '==', auth.currentUser.uid))
        const snap = await getDocs(q)
        if (cancelled) return
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        projectsRef.current = data
        setProjects(data)
        if (data.length) setActiveProjectId(prev => prev && data.find(p => p.id === prev) ? prev : data[0].id);
        else setActiveProjectId(null);
        
        const anyTraining = data.some(p => ['queued','training','device_training','awaiting_device'].includes(p.status))
        if (iv) clearInterval(iv)
        iv = anyTraining ? setInterval(fetchProjects, 5000) : null
      } catch (_e) { } finally { if (!cancelled) setProjectsLoading(false) }
    }
    fetchProjects()
    return () => { cancelled = true; if (iv) clearInterval(iv) }
  }, [authReady])

  const handleOnboardingComplete = (p) => {
    setProjects(prev => [...prev, p])
    setActiveProjectId(p.id)
    setShowOnboarding(false)
    setTab('training')
    toast.success('Project created.')
    vibrate(ImpactStyle.Medium)
  }

  const handleDeleteProject = async (pid) => {
    if (!pid) return
    if (!window.confirm('Delete this project? This cannot be undone.')) return
    try {
      await deleteDoc(doc(db, 'projects', pid))
      const remaining = projects.filter(p => p.id !== pid)
      setProjects(remaining)
      setActiveProjectId(remaining[0]?.id || null)
      toast.success('Project deleted.')
      vibrate(ImpactStyle.Heavy)
    } catch { toast.error('Delete failed') }
  }

  const sendChat = async () => {
    const text = testText.trim()
    if (!text || testing) return
    const modelId = activeProjectId
    if (!modelId) return
    
    setTestText('')
    setTesting(true)
    const started = performance.now()
    setChatHistory(h => [...h, { role:'user', text }])
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const formData = new FormData();
      formData.append('project_id', modelId);
      formData.append('text', text);
      
      const response = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Backend inference proxy failed");
      const result = await response.json();
      
      setChatHistory(h => [...h, { role:'bot', text:`${result.prediction}  (${Math.round((result.confidence||0)*100)}%)`, modelName:'Remote Model', latency: Math.round(performance.now()-started) }])
    } catch (error) {
      setChatHistory(h => [...h, { role:'bot', text:`Error: ${error.message||error}`, error:true }])
    } finally { setTesting(false) }
  }

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const activeJobs = projects.filter(p => ['queued', 'training', 'device_training', 'awaiting_device'].includes(p.status));
  const finishedJobs = projects.filter(p => p.status === 'trained');

  const sidebarProps = { currentProject, onDeleteProject: handleDeleteProject, onClose: () => setSidebarOpen(false) };

  if (projectsLoading) {
    return (
      <div style={{minHeight: '100vh', backgroundColor: '#14130F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: '32px', height: '32px', border: '3px solid #C6FF33', borderTopColor: 'transparent', borderRadius: '50%'}} className="animate-spin"></div>
      </div>
    );
  }

  if (projects.length === 0 && !showOnboarding) {
    return (
      <div className="mobile-app td-split-layout">
        <div className="td-sidebar-desktop">
          <Sidebar {...sidebarProps} isMobile={false} />
        </div>
        {sidebarOpen && <>
          <div className="drawer-backdrop" onClick={()=>setSidebarOpen(false)}/>
          <Sidebar {...sidebarProps} isMobile={true} />
        </>}
        <main className="td-main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          <header className="dash-header p-6 flex flex-wrap justify-between items-center gap-4 bg-[var(--surface)] border-b border-[var(--line)]">
            <div className="md:hidden flex items-center gap-4 w-full">
              <button className="btn-ghost !px-2" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <h1 className="text-xl font-display font-bold flex-1">Toddler Control</h1>
            </div>
            <div className="hidden md:block">
              <h1 className="text-4xl font-display font-bold">Welcome to Toddler</h1>
            </div>
          </header>
          
          <div className="p-6 md:p-12 flex-grow overflow-y-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <p className="text-[var(--text-dim)]">Toddler trains AI models securely on your own hardware. The web app is just your control tower — connect a worker device or upload a dataset to get started.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 max-w-2xl">
              <div className="panel border border-[var(--line)] bg-[var(--surface-2)]">
                <h3 className="font-bold mb-2 text-[var(--accent-lime)]">1. Connect a Worker</h3>
                <p className="text-sm text-[var(--text-faint)] mb-4">Download the Toddler app on your phone or desktop to provide actual compute power.</p>
                <div className="flex gap-2 mb-4">
                  <a href="#" onClick={(e)=>{e.preventDefault(); alert("Android APK build coming in Phase 3!")}} className="btn-ghost flex-1 text-center border border-[var(--line)] py-2 text-xs font-mono no-underline hover:bg-[var(--line)]">📱 Android</a>
                  <a href="#" onClick={(e)=>{e.preventDefault(); alert("Desktop Agent coming in Phase 3!")}} className="btn-ghost flex-1 text-center border border-[var(--line)] py-2 text-xs font-mono no-underline hover:bg-[var(--line)]">💻 Mac/PC</a>
                </div>
                <div className="bg-[var(--bg)] p-4 border border-[var(--line)] text-center">
                  <div className="text-[10px] uppercase font-mono text-[var(--text-dim)] mb-1">Your Pairing Code</div>
                  <div className="text-2xl font-mono text-[var(--text)] tracking-widest">{auth.currentUser?.uid?.substring(0, 6).toUpperCase() || '749012'}</div>
                </div>
              </div>

              <div className="panel border border-[var(--line)] bg-[var(--surface-2)] flex flex-col">
                <h3 className="font-bold mb-2">2. Train a Model</h3>
                <p className="text-sm text-[var(--text-faint)] mb-6 flex-grow">Upload a CSV or image dataset. We'll add the job to your queue and push it to your connected devices.</p>
                <button className="btn btn-solid w-full" onClick={() => setShowOnboarding(true)}>
                  + Create Project
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="mobile-app td-split-layout">
        <div className="td-sidebar-desktop">
          <Sidebar {...sidebarProps} isMobile={false} />
        </div>
        <main className="td-main-content overflow-y-auto">
           <Onboarding onComplete={handleOnboardingComplete} />
        </main>
      </div>
    );
  }

  return (
    <div className="mobile-app flex flex-col h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      {sidebarOpen && <>
        <div className="fixed inset-0 bg-black/80 z-40" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 z-50 transform transition-transform duration-300">
          <Sidebar {...sidebarProps} isMobile={true} />
        </div>
      </>}

      <header className="p-4 flex items-center justify-between bg-[var(--surface)] shrink-0">
        <div className="flex items-center gap-4">
          <button className="text-[var(--text-dim)] hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-lg font-display font-bold leading-none">Toddler Worker</h1>
            <div className="text-[var(--accent-lime)] text-[10px] font-mono mt-1 tracking-widest flex items-center gap-2 uppercase">
               <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)] animate-pulse"></div> Online
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full border-y border-[var(--line)] bg-[var(--surface)] shrink-0">
        {['Zoo', 'Training', 'Sandbox'].map(t => (
          <button 
            key={t} 
            onClick={() => setTab(t.toLowerCase())} 
            className={`flex-1 py-3 text-center font-mono text-xs uppercase transition-colors ${tab === t.toLowerCase() ? 'border-b-2 border-[var(--accent-lime)] text-[var(--accent-lime)] bg-[var(--surface-2)]' : 'text-[var(--text-dim)] border-b-2 border-transparent hover:text-[var(--text)]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <main className="flex-grow overflow-y-auto p-4 md:p-6 relative">
        {tab === 'zoo' && (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-lg mx-auto">
            <div>
              <h2 className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-widest mb-4">Recommended for your device</h2>
              <div className="grid grid-cols-1 gap-4">
                {catalog.map(model => (
                  <div key={model.id} className="panel border border-[var(--line)] bg-[var(--surface-2)] p-5 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg">{model.name}</h3>
                    </div>
                    <div className="text-xs text-[var(--text-dim)] mb-4 capitalize">{model.task === 'chat' ? 'Chat LLM' : model.task}</div>
                    
                    <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-faint)] mb-4">
                      <span>{model.sizeMb} MB</span>
                      <span>•</span>
                      <span>~{model.minRamGb || 2} GB RAM req</span>
                    </div>
                    
                    <div className="text-[10px] font-mono text-[var(--accent-lime)] mb-5 flex items-center gap-2">
                      <CheckCircle2 size={12} /> Compatible with your device
                    </div>
                    
                    <button className="btn-ghost border border-[var(--line)] w-full text-xs font-mono uppercase hover:bg-[var(--line)] py-2" onClick={() => toast('Native downloads pending Phase 3')}>
                      Download
                    </button>
                  </div>
                ))}
                {catalog.length === 0 && <div className="text-sm text-[var(--text-faint)] italic">No models loaded.</div>}
              </div>
            </div>
          </div>
        )}

        {tab === 'training' && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-lg mx-auto">
            <div>
              <h2 className="text-[10px] font-mono text-[var(--accent-purple)] uppercase tracking-widest mb-4">Currently Training (Background)</h2>
              {activeJobs.length === 0 ? (
                <div className="text-sm text-[var(--text-faint)] italic panel bg-transparent border-dashed border-[var(--line)] text-center py-8">No active jobs in queue.</div>
              ) : (
                <div className="space-y-4">
                  {activeJobs.map(job => (
                    <div key={job.id} className="panel border border-[var(--accent-purple)] bg-[var(--surface-2)] p-5">
                      <h3 className="font-bold text-lg mb-1">{job.name}</h3>
                      <div className="text-xs text-[var(--text-dim)] mb-4 capitalize">{job.type} Model</div>
                      
                      <div className="w-full bg-[var(--bg)] h-2 rounded-full mb-3 overflow-hidden border border-[var(--line)]">
                        <div className="bg-[var(--accent-purple)] h-full transition-all duration-500" style={{ width: `${job.progress || 0}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-faint)] uppercase">
                        <span className="text-[var(--text)]">Progress: {job.progress || 0}%</span>
                        <button className="text-[var(--danger)] hover:underline" onClick={() => handleDeleteProject(job.id)}>Pause</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-widest mb-4">Finished on this device</h2>
              {finishedJobs.length === 0 ? (
                <div className="text-sm text-[var(--text-faint)] italic">No completed jobs yet.</div>
              ) : (
                <div className="space-y-4">
                  {finishedJobs.map(job => (
                    <div key={job.id} className="panel border border-[var(--line)] bg-[var(--surface-2)] p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm mb-1">{job.name}</h3>
                        <div className="text-xs text-[var(--text-dim)] capitalize">{job.type} • {((job.accuracy||0)*100).toFixed(0)}% Acc</div>
                      </div>
                      <button 
                        className="btn-ghost text-[var(--text)] text-[10px] font-mono border border-[var(--line)] px-3 py-2 hover:bg-[var(--line)] transition-colors uppercase tracking-wider"
                        onClick={() => { setActiveProjectId(job.id); setTab('sandbox'); }}
                      >
                        TEST ↗
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'sandbox' && (
          <div className="h-full flex flex-col animate-in fade-in duration-300 max-w-lg mx-auto">
            {currentProject && currentProject.status === 'trained' ? (
              <div className="flex-grow flex flex-col border border-[var(--line)] bg-[var(--surface-2)] relative">
                <div className="p-3 border-b border-[var(--line)] bg-[var(--surface)] text-[10px] font-mono uppercase tracking-widest flex justify-between items-center">
                  <span className="text-[var(--accent-lime)]">Active: {currentProject.name}</span>
                  <span className="text-[var(--text-dim)]">{currentProject.type}</span>
                </div>
                
                <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-[var(--bg)]">
                  {chatHistory.length === 0 && (
                    <div className="text-center text-[var(--text-faint)] text-sm mt-10">
                      Sandbox ready. Test your model's accuracy offline.
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-3 text-sm rounded-sm ${msg.role === 'user' ? 'bg-[var(--surface-2)] border border-[var(--line)] text-white' : 'bg-transparent text-[var(--text-dim)]'}`}>
                        {msg.role === 'bot' && <div className="text-[10px] font-mono text-[var(--text-faint)] mb-1 uppercase tracking-widest">TODDLER &gt;</div>}
                        {msg.role === 'user' && msg.imageSrc && <div className="text-[10px] font-mono text-[var(--accent-purple)] mb-2">(Uploaded Image)</div>}
                        {msg.text}
                      </div>
                      {msg.role === 'bot' && !msg.error && (
                        <div className="text-[10px] font-mono text-[var(--accent-lime)] mt-1 ml-2">Confidence: {(msg.confidence||0.98)*100}%</div>
                      )}
                    </div>
                  ))}
                  {testing && (
                    <div className="flex flex-col items-start mt-2">
                      <div className="p-3 text-sm text-[var(--text-faint)]">
                         <div className="text-[10px] font-mono uppercase tracking-widest mb-1">TODDLER &gt;</div>
                         <span className="animate-pulse">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-[var(--line)] bg-[var(--surface)]">
                  <form onSubmit={e => { e.preventDefault(); sendChat(); }} className="flex gap-2 items-center">
                    {currentProject.type === 'vision' ? (
                       <button type="button" className="btn-ghost !p-3 border border-[var(--line)] text-[var(--text-dim)] hover:text-white bg-[var(--bg)]" onClick={() => toast('Camera capture pending Phase 3')}>
                         📷
                       </button>
                    ) : null}
                    <input 
                      type="text" 
                      className="input-field flex-grow !m-0 !py-3 bg-[var(--bg)] border border-[var(--line)]" 
                      placeholder="Type a message..." 
                      value={testText}
                      onChange={e => setTestText(e.target.value)}
                      disabled={testing}
                    />
                    <button type="submit" className="btn btn-solid !px-4 !py-3 !m-0" disabled={testing || !testText.trim()}>
                      ▲
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="text-center text-[var(--text-faint)] text-sm mt-10">
                No trained model selected. Go to Training to select a finished job.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
