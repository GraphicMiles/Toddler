import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, Play, Menu, X, Download, Trash2, Edit3, 
  Database, Cpu, Globe, Terminal, BarChart3, 
  CheckCircle2, MessageSquare, Send, Layers, Check,
  AlertTriangle, History, Zap, Settings, Activity,
  ShieldCheck
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import Onboarding from './Onboarding';

/* --- Bulletproof UI Components (Internalized for Stability) --- */

const Button = ({ variant = 'primary', size = 'md', children, className = "", icon: Icon, loading = false, ...props }) => {
  const sizes = { sm: "px-4 py-2 text-[11px]", md: "px-6 py-3 text-[13px]", lg: "px-8 py-4 text-[15px]" };
  const variants = {
    primary: "bg-[var(--color-accent-green)] text-black hover:brightness-110 active:scale-[0.98]",
    secondary: "bg-[var(--color-accent-purple)] text-white hover:brightness-110 active:scale-[0.98]",
    outline: "bg-transparent border border-[var(--color-accent-green)] text-[var(--color-accent-green)] hover:bg-[var(--color-accent-green)]/10 active:scale-[0.98]",
    ghost: "bg-transparent text-[var(--color-text-muted)] hover:text-white active:scale-[0.98]"
  };
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-full font-bold uppercase tracking-widest transition-all cursor-pointer border-none ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading} {...props}>
      {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <>{children} {Icon && <Icon size={size === 'sm' ? 14 : 18} />}</>}
    </button>
  );
};

const Card = ({ variant = 'surface', children, className = "" }) => {
  const variants = {
    surface: "bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]",
    green: "bg-black border border-[var(--color-accent-green)] shadow-[0_0_30px_rgba(198,255,51,0.05)]",
    purple: "bg-black border border-[var(--color-accent-purple)] shadow-[0_0_30px_rgba(125,57,235,0.05)]"
  };
  return <div className={`p-8 rounded-[32px] ${variants[variant]} ${className}`}>{children}</div>;
};

const Badge = ({ children, variant = "neutral" }) => {
  const variants = {
    neutral: "bg-white/5 border-white/10 text-[var(--color-text-muted)]",
    green: "bg-[var(--color-accent-green)]/10 border-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]",
    purple: "bg-[var(--color-accent-purple)]/10 border-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]"
  };
  return <span className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-widest ${variants[variant]}`}>{children}</span>;
};

const Skeleton = ({ className = "" }) => <div className={`bg-white/5 animate-pulse rounded-xl ${className}`} />;

/* --- Main Dashboard Logic --- */

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [predictText, setPredictText] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [responses, setResponses] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, "projects"), where("ownerUid", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setProjects(data);
        if (data[0]?.responses) setResponses(data[0].responses);
      } catch (e) { console.error(e); } 
      finally { setTimeout(() => setLoading(false), 800); }
    };
    fetchProjects();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[var(--color-bg-base)] p-8 lg:p-20 font-sans flex flex-col justify-center">
       <div className="max-w-[1200px] mx-auto w-full space-y-12">
          <div className="flex justify-between items-end"><div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-4 w-48" /></div><Skeleton className="h-10 w-48 rounded-full" /></div>
          <div className="grid lg:grid-cols-3 gap-8"><Skeleton className="h-72 col-span-2 rounded-[32px]" /><Skeleton className="h-72 rounded-[32px]" /></div>
          <Skeleton className="h-96 rounded-[32px]" />
       </div>
       <div className="fixed bottom-12 right-12 flex items-center gap-3 text-white/20 font-bold uppercase tracking-[0.3em] text-[10px]">
          <div className="w-4 h-4 border-2 border-[var(--color-accent-green)] border-t-transparent rounded-full animate-spin" />
          Seeking Wisdom...
       </div>
    </div>
  );

  if (projects.length === 0) return <Onboarding onComplete={(p) => setProjects([p])} />;

  const currentProject = projects[0];

  const handlePredict = async () => {
    if (!predictText || !currentProject) return;
    setPredicting(true); setPrediction(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append('project_id', currentProject.id);
      formData.append('text', predictText);
      const response = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData });
      const data = await response.json();
      const processed = { prediction: data.prediction || 'Unknown', confidence: data.confidence || 0, weights: data.weights || {} };
      setPrediction(processed);
      setHistory(prev => [processed, ...prev].slice(0, 10));
      toast.success('Inference Complete');
    } catch (e) { toast.error('Engine error'); } 
    finally { setPredicting(false); }
  };

  const handleDownload = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/projects/${currentProject.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `model_${currentProject.id}.pkl`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
      toast.success('Artifact Exported');
    } catch (e) { toast.error('Export failed'); }
  };

  const saveResponse = async (label, text) => {
    const newResponses = { ...responses, [label]: text };
    setResponses(newResponses);
    try {
      await updateDoc(doc(db, "projects", currentProject.id), { responses: newResponses });
      toast.success('Logic Memorized');
    } catch (e) { toast.error('Memory failed'); }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex font-sans relative overflow-hidden text-white">
      <Toaster />
      
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-[#08090C] border-r border-white/5 flex flex-col z-50 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5 h-[72px]">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-8 h-8 bg-[var(--color-accent-green)] rounded flex items-center justify-center text-black font-black transition-transform group-hover:rotate-12">T</div>
            <span className="font-display font-bold text-lg tracking-tighter">Toddler</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 bg-transparent border-none text-white"><X size={20} /></button>
        </div>
        <nav className="flex-grow p-5 space-y-2">
          {[
            { id: 'overview', label: 'Dashboard', icon: Activity },
            { id: 'playground', label: 'Playground', icon: Play },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'chat', label: 'Chatbot', icon: MessageSquare },
            { id: 'dev', label: 'API Keys', icon: Terminal }
          ].map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-[13px] flex items-center gap-3 transition-all border-none bg-transparent uppercase tracking-widest ${activeTab === t.id ? 'bg-[var(--color-accent-green)] text-black shadow-[0_0_20px_rgba(198,255,51,0.2)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/5">
          <button onClick={() => auth.signOut()} className="w-full text-left px-4 py-2 text-[10px] font-bold text-white/20 hover:text-white uppercase tracking-widest border-none bg-transparent">Log out</button>
        </div>
      </aside>

      <main className="flex-grow overflow-auto p-8 lg:p-20 relative bg-[var(--color-bg-base)]">
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#08090C]/80 backdrop-blur-md border-b border-white/5 z-30 px-6 flex items-center justify-between">
          <div className="font-display font-bold text-lg tracking-tighter">Toddler</div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 bg-transparent border-none text-white"><Menu size={24} /></button>
        </div>

        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 fade-in-up">
          <div className="space-y-4 text-left">
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter leading-none">{currentProject.name}</h1>
            <div className="flex gap-3"><Badge variant="purple">Stable Protocol</Badge><Badge variant="neutral">v{currentProject.version || '1.0'}</Badge></div>
          </div>
          <div className="flex items-center gap-4">
             <Button variant="outline" size="sm" onClick={handleDownload} icon={Download}>Export .pkl</Button>
             <div className="px-4 py-2 bg-[var(--color-accent-green)] text-black rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(198,255,51,0.2)]">
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" /> Engine: Optimal
             </div>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-8 fade-in-up">
            <div className="grid lg:grid-cols-3 gap-8">
              <Card variant="green" className="col-span-2 !bg-[#0D0F14]">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/30 block mb-8 text-left">Classification Accuracy</span>
                <div className="text-8xl md:text-[120px] font-display font-bold tracking-tighter leading-none text-white flex items-baseline">
                  {currentProject.accuracy ? (currentProject.accuracy * 100).toFixed(1) : '0'}<span className="text-4xl text-[var(--color-accent-green)] ml-4 opacity-40">%</span>
                </div>
              </Card>
              <Card variant="purple" className="!bg-[#0D0F14] flex flex-col justify-between">
                 <div className="space-y-6 text-left">
                    <span className="text-[11px] font-bold uppercase tracking-[0.25em] opacity-30">Metadata</span>
                    <div className="flex items-center gap-4 p-5 bg-white/[0.03] rounded-2xl border border-white/5">
                       <Database size={20} className="text-[var(--color-accent-purple)]" />
                       <div className="text-sm font-bold">{currentProject.dataset?.rowCount || 0} rows trained</div>
                    </div>
                 </div>
                 <div className="p-5 bg-[var(--color-accent-purple)] rounded-2xl text-left glow-purple mt-8">
                    <div className="text-[10px] font-bold uppercase opacity-60">Status</div>
                    <div className="text-sm font-bold">Inference Online</div>
                 </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="grid lg:grid-cols-2 gap-12 fade-in-up">
            <Card className="!bg-[#0D0F14] !border-2 !border-[var(--color-accent-purple)] glow-purple text-left h-fit">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/30 block mb-8">Logic Terminal</span>
              <textarea 
                className="w-full h-48 p-6 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-[var(--color-accent-purple)] transition-all font-medium text-white placeholder:text-white/10 mb-8"
                placeholder="Paste payload to predict..." value={predictText} onChange={(e) => setPredictText(e.target.value)}
              />
              <Button onClick={handlePredict} loading={predicting} className="w-full h-16" variant="secondary">Run Engine</Button>
              {prediction && (
                <div className="mt-8 p-8 bg-[var(--color-accent-purple)]/10 border border-[var(--color-accent-purple)]/20 rounded-[32px] animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="text-5xl font-display font-bold text-[var(--color-accent-purple)] mb-4">{prediction.prediction}</div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-40">Confidence: {(prediction.confidence * 100).toFixed(1)}%</div>
                </div>
              )}
            </Card>
            <div className="space-y-8 text-left">
               <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/30 px-4">Session Stream</h3>
               {history.map((h, i) => (
                 <Card key={i} className="!p-6 !bg-[#0D0F14] flex justify-between items-center border-white/5 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="truncate pr-8"><div className="text-sm font-bold text-white truncate">{h.text}</div><div className="text-[10px] font-bold text-[var(--color-accent-green)] uppercase mt-2">{h.prediction}</div></div>
                    <div className="text-xl font-display font-bold text-[var(--color-accent-purple)]">{(h.confidence * 100).toFixed(0)}%</div>
                 </Card>
               ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
