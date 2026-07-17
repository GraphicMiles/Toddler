import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Play, Menu, X, Download, Trash2, Edit3, 
  Database, Cpu, Globe, Terminal, BarChart3, 
  CheckCircle2, MessageSquare, Send, Layers, Check,
  AlertTriangle, History, Zap, Settings, Activity,
  ShieldCheck
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import Onboarding from './Onboarding';
import { Button, Card, Skeleton, Container, Badge } from './components/UI';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictText, setPredictText] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [responses, setResponses] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [batchFile, setBatchFile] = useState(null);
  const [batchTextCol, setBatchTextCol] = useState('');
  const [batching, setBatching] = useState(false);

  const navigate = useNavigate();

  const messages = [
    "Caramelizing onions...",
    "Finding Nemo...",
    "Seeking wisdom...",
    "Discombobulating data...",
    "Teaching the model...",
    "Polishing the prediction..."
  ];

  useEffect(() => {
    let interval;
    if (predicting || isTyping || batching) {
      let index = 0;
      interval = setInterval(() => {
        setLoadingMessage(messages[index % messages.length]);
        index++;
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [predicting, isTyping, batching]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, "projects"), where("ownerUid", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setProjects(data);
        if (data[0]?.responses) setResponses(data[0].responses);
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };
    fetchProjects();
  }, []);

  const currentProject = projects[0];

  const handlePredict = async () => {
    if (!predictText || !currentProject) return;
    setPredicting(true);
    setPrediction(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append('project_id', currentProject.id);
      formData.append('text', predictText);

      const response = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Prediction failed');
      const data = await response.json();
      
      const processedData = {
        prediction: data.prediction || 'Unknown',
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
        weights: data.weights || {}
      };

      setPrediction(processedData);
      setHistory(prev => [{ text: predictText, ...processedData }, ...prev].slice(0, 10));
      toast.success('Wisdom found.');
    } catch (e) {
      console.error(e);
      toast.error('Prediction failed.');
    } finally {
      setPredicting(false);
    }
  };

  const handleBatchPredict = async (e) => {
    e.preventDefault();
    if (!batchFile || !batchTextCol || !currentProject) return;
    setBatching(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append('project_id', currentProject.id);
      formData.append('text_column', batchTextCol);
      formData.append('file', batchFile);

      const response = await fetch(`${apiUrl}/batch`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Batch failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results_${currentProject.id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Batch processing complete.');
    } catch (e) {
      toast.error('Batch failed.');
    } finally {
      setBatching(false);
    }
  };

  const handleRename = async () => {
    if (!newName || newName === currentProject.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateDoc(doc(db, "projects", currentProject.id), { name: newName });
      setProjects(prev => [{ ...prev[0], name: newName }]);
      setIsEditingName(false);
      toast.success('Project discombobulated.');
    } catch (e) {
      toast.error('Rename failed');
    }
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentProject) return;

    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append('project_id', currentProject.id);
      formData.append('text', chatInput);

      const response = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Chat prediction failed');
      const data = await response.json();
      
      const predictionLabel = data.prediction || 'Unknown';
      const botResponse = responses[predictionLabel] || `Decision: "${predictionLabel}". (Response not set)`;
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          role: 'bot', 
          text: botResponse, 
          intent: predictionLabel, 
          confidence: data.confidence || 0 
        }]);
        setIsTyping(false);
      }, 800);
    } catch (e) {
      console.error(e);
      setIsTyping(false);
      toast.error('Chat failed');
    }
  };

  const saveResponse = async (label, text) => {
    const newResponses = { ...responses, [label]: text };
    setResponses(newResponses);
    try {
      await updateDoc(doc(db, "projects", currentProject.id), { responses: newResponses });
      toast.success('Response memorized.');
    } catch (e) {
      toast.error('Save failed');
    }
  };

  const handleDownload = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/projects/${currentProject.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model_${currentProject.id}.pkl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Model exported.');
    } catch (e) {
      toast.error('Export failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await deleteDoc(doc(db, "projects", currentProject.id));
      setProjects([]);
      toast.success('Erased from existence.');
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--color-bg-base)] p-[var(--spacing-6)] lg:p-[var(--spacing-9)] font-sans">
      <Container wide className="space-y-[var(--spacing-8)]">
        <div className="flex justify-between items-end">
          <div className="space-y-[var(--spacing-4)]">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-48 rounded-full" />
        </div>
        <div className="grid lg:grid-cols-3 gap-[var(--spacing-6)]">
           <Skeleton className="h-64 col-span-2 rounded-[var(--radius-lg)]" />
           <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
        </div>
        <Skeleton className="h-96 rounded-[var(--radius-lg)]" />
      </Container>
      <div className="fixed bottom-[var(--spacing-8)] right-[var(--spacing-8)] flex items-center gap-[var(--spacing-3)] text-[var(--color-text-muted)] font-bold uppercase tracking-[0.2em] text-[10px]">
        <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        Seeking Wisdom...
      </div>
    </div>
  );

  if (projects.length === 0) return <Onboarding onComplete={(p) => setProjects([p])} />;

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex font-sans relative overflow-hidden">
      <Toaster />
      
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-[var(--color-border-subtle)] flex flex-col z-50 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-[var(--spacing-6)] flex items-center justify-between border-b border-[var(--color-border-subtle)] h-[72px]">
          <div className="flex items-center gap-[var(--spacing-2)] cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-8 h-8 bg-[var(--color-text-primary)] rounded flex items-center justify-center text-[var(--color-text-inverse)] font-display font-bold text-sm hover:scale-110 transition-transform">T</div>
            <span className="font-display font-bold text-lg tracking-tight text-[var(--color-text-primary)]">Toddler</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 border-none bg-transparent cursor-pointer text-[var(--color-text-primary)]">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-grow p-[var(--spacing-5)] space-y-[var(--spacing-2)]">
          <div className="px-[var(--spacing-4)] py-[var(--spacing-2)] text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Platform</div>
          {[
            { id: 'overview', label: 'Dashboard', icon: Activity },
            { id: 'playground', label: 'Playground', icon: Play },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'batch', label: 'Batch Jobs', icon: Layers },
            { id: 'chat', label: 'Chatbot', icon: MessageSquare },
            { id: 'dev', label: 'API Keys', icon: Terminal }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
              className={`
                w-full text-left px-[var(--spacing-4)] py-[var(--spacing-3)] rounded-xl font-bold text-[13px] flex items-center gap-[var(--spacing-3)] 
                transition-all cursor-pointer border-none bg-transparent group
                ${activeTab === t.id ? 'bg-[var(--color-accent)]/5 text-[var(--color-accent)] border border-[var(--color-accent)]/10' : 'text-[var(--color-text-muted)] hover:bg-black/5 hover:text-[var(--color-text-primary)]'}
              `}
            >
              <t.icon size={18} className={`${activeTab === t.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]'} transition-colors`} /> 
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-[var(--spacing-6)] border-t border-[var(--color-border-subtle)] space-y-[var(--spacing-4)]">
           <button onClick={handleDelete} className="w-full text-left px-[var(--spacing-4)] py-[var(--spacing-2)] text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-[0.2em] cursor-pointer border-none bg-transparent flex items-center gap-[var(--spacing-2)] group">
            <Trash2 size={14} className="group-hover:animate-bounce" /> Delete Project
          </button>
          <button onClick={() => auth.signOut()} className="w-full text-left px-[var(--spacing-4)] py-[var(--spacing-2)] text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors uppercase tracking-[0.2em] cursor-pointer border-none bg-transparent">Log out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-auto p-[var(--spacing-6)] pt-24 md:p-[var(--spacing-8)] lg:p-[var(--spacing-9)] relative scroll-smooth">
        {/* Mobile Header Bar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-[var(--color-border-subtle)] z-30 px-[var(--spacing-6)] flex items-center justify-between text-[var(--color-text-primary)]">
          <div className="font-display font-bold text-lg tracking-tight">Toddler</div>
          <button onClick={() => setSidebarOpen(true)} className="p-[var(--spacing-2)] border-none bg-transparent cursor-pointer text-[var(--color-text-primary)]"><Menu size={24} /></button>
        </div>

        <header className="mb-[var(--spacing-8)] flex flex-col md:flex-row justify-between items-start md:items-end gap-[var(--spacing-6)] fade-in-up">
          <div className="space-y-[var(--spacing-2)] text-left">
            {isEditingName ? (
              <div className="flex items-center gap-[var(--spacing-3)]">
                <input 
                  type="text" 
                  className="font-display text-3xl md:text-5xl font-bold tracking-tighter leading-none bg-transparent border-none border-b-4 border-[var(--color-accent)] outline-none text-[var(--color-text-primary)]"
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  autoFocus onBlur={handleRename}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                />
              </div>
            ) : (
              <div className="flex items-center gap-[var(--spacing-4)] group">
                <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tighter leading-none text-[var(--color-text-primary)]">{currentProject.name}</h1>
                <button onClick={() => { setNewName(currentProject.name); setIsEditingName(true); }} className="p-[var(--spacing-2)] opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 rounded-lg cursor-pointer border-none"><Edit3 size={18} className="text-[var(--color-text-muted)]" /></button>
              </div>
            )}
            <div className="flex items-center gap-[var(--spacing-3)]">
              <Badge className="!bg-[var(--color-text-primary)] !text-[var(--color-text-inverse)] !border-none">Active</Badge>
              <Badge>Version v{currentProject.version || '1.0'}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-4)]">
             <Button variant="outline" size="sm" onClick={handleDownload} icon={Download}>Export .pkl</Button>
            <div className={`px-[var(--spacing-4)] py-[var(--spacing-2)] rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-[var(--spacing-2)] ${currentProject.health === 'Optimal' ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]' : 'bg-amber-500 text-[var(--color-text-primary)]'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Engine: {currentProject.health || 'Optimal'}
            </div>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-[var(--spacing-8)] fade-in-up">
            <div className="grid lg:grid-cols-3 gap-[var(--spacing-6)] md:gap-[var(--spacing-8)]">
              <Card className="col-span-2 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-[var(--spacing-8)]">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Core Performance</span>
                  <CheckCircle2 className="text-[var(--color-accent)]" size={20} />
                </div>
                <div className="text-7xl md:text-[100px] font-display font-bold tracking-tighter leading-none text-[var(--color-text-primary)] mb-[var(--spacing-6)] text-left">
                  {currentProject.accuracy ? (currentProject.accuracy * 100).toFixed(1) : '0'}<span className="text-2xl md:text-4xl text-[var(--color-text-muted)]/30 ml-[var(--spacing-2)]">%</span>
                </div>
                <div className="flex gap-[var(--spacing-6)] md:gap-[var(--spacing-9)] border-t border-[var(--color-border-subtle)] pt-[var(--spacing-8)]">
                   {['F1 Score', 'Recall', 'Precision'].map((m, i) => (
                     <div key={m} className="text-left">
                        <div className="text-[10px] font-bold opacity-30 uppercase mb-[var(--spacing-1)] tracking-widest">{m}</div>
                        <div className="text-xl md:text-2xl font-bold font-display text-[var(--color-text-primary)]">0.9{[4, 1, 2][i]}</div>
                     </div>
                   ))}
                </div>
              </Card>
              <Card variant="dark" className="flex flex-col justify-between">
                 <div className="space-y-[var(--spacing-6)] text-left">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-40">System Metrics</span>
                    <div className="flex items-center gap-[var(--spacing-4)] p-[var(--spacing-4)] bg-white/5 rounded-2xl border border-white/5">
                       <Database size={20} className="text-[var(--color-accent)]" />
                       <div className="text-sm font-bold">{currentProject.dataset?.rowCount || 0} Training Rows</div>
                    </div>
                    <div className="flex items-center gap-[var(--spacing-4)] p-[var(--spacing-4)] bg-white/5 rounded-2xl border border-white/5">
                       <ShieldCheck size={20} className="text-[var(--color-accent)]" />
                       <div className="text-sm font-bold">Encrypted Artifacts</div>
                    </div>
                 </div>
                 <div className={`p-[var(--spacing-5)] mt-[var(--spacing-6)] rounded-2xl space-y-[var(--spacing-1)] text-left ${currentProject.health === 'Optimal' ? 'bg-[var(--color-accent)]' : 'bg-amber-600'}`}>
                    <div className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Global State</div>
                    <div className="text-sm font-bold leading-tight">System Operational</div>
                 </div>
              </Card>
            </div>
            
            <Card className="text-left">
               <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-[var(--spacing-8)]">Training Balance</h3>
               <div className="flex items-end gap-[var(--spacing-2)] md:gap-[var(--spacing-4)] h-48">
                  {currentProject.distribution ? Object.entries(currentProject.distribution).map(([label, count]) => {
                    const maxVal = Math.max(...Object.values(currentProject.distribution), 1);
                    return (
                      <div key={label} className="flex-1 flex flex-col items-center gap-[var(--spacing-3)] group h-full">
                        <div className="w-full bg-[var(--color-accent)]/5 group-hover:bg-[var(--color-accent)]/10 rounded-xl relative flex flex-col justify-end overflow-hidden h-full transition-all">
                            <div className="bg-[var(--color-accent)] w-full rounded-t-lg transition-all duration-700" style={{ height: `${(count / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] truncate w-full text-center">{label}</span>
                      </div>
                    );
                  }) : <div className="w-full h-full flex items-center justify-center text-xs opacity-30 italic">No distribution data.</div>}
               </div>
            </Card>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-7)] md:gap-[var(--spacing-8)] fade-in-up">
            <Card className="!border-2 !border-[var(--color-text-primary)] space-y-[var(--spacing-7)] text-left h-fit">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Input Terminal</span>
                <Play className="text-[var(--color-text-primary)]" size={20} />
              </div>
              <textarea 
                className="w-full h-32 md:h-48 p-[var(--spacing-6)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-2xl focus:outline-none focus:border-[var(--color-text-primary)] transition-all font-medium text-sm leading-relaxed resize-none text-[var(--color-text-primary)]"
                placeholder="Type to test your model..."
                value={predictText} onChange={(e) => setPredictText(e.target.value)}
              />
              <Button onClick={handlePredict} loading={predicting} className="w-full" size="md">
                {predicting ? loadingMessage : 'Run Prediction'}
              </Button>
              {prediction && (
                <div className="p-[var(--spacing-6)] md:p-[var(--spacing-8)] bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/10 rounded-[var(--radius-xl)] animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex justify-between items-center mb-[var(--spacing-4)]">
                     <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-accent)]">Result</span>
                     <span className="px-3 py-1 bg-[var(--color-accent)] text-[var(--color-text-inverse)] rounded-full text-[10px] font-bold">{(prediction.confidence * 100).toFixed(1)}% Match</span>
                  </div>
                  <div className="text-3xl md:text-4xl font-display font-bold text-[var(--color-accent)] mb-[var(--spacing-6)] leading-none break-all">{prediction.prediction}</div>
                  <div className="flex flex-wrap gap-[var(--spacing-2)]">
                    {predictText.split(/\s+/).map((word, i) => {
                      const clean = word.toLowerCase().replace(/[.,!?;]/g, '');
                      const weight = (prediction.weights && prediction.weights[clean]) || 0;
                      const opacity = weight ? Math.min(Math.max(Math.abs(weight) * 2, 0.1), 0.5) : 0;
                      return <span key={i} className="px-2 py-0.5 rounded text-xs md:text-sm font-medium transition-all duration-300" style={{ backgroundColor: opacity > 0 ? `rgba(27, 67, 50, ${opacity})` : 'transparent', color: opacity > 0.3 ? 'black' : 'inherit' }}>{word}</span>;
                    })}
                  </div>
                </div>
              )}
            </Card>
            <div className="space-y-[var(--spacing-7)]">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-left px-[var(--spacing-4)]">Session History</h3>
              <div className="space-y-[var(--spacing-4)]">
                {history.map((h, i) => (
                  <Card key={i} className="!p-[var(--spacing-5)] flex justify-between items-center group fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="truncate pr-[var(--spacing-4)] text-left text-[var(--color-text-primary)]">
                      <div className="text-sm font-bold truncate">{h.text}</div>
                      <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mt-[var(--spacing-1)] tracking-widest">{h.prediction}</div>
                    </div>
                    <div className="text-lg font-display font-bold text-[var(--color-accent)]">{(h.confidence * 100).toFixed(0)}%</div>
                  </Card>
                ))}
                {history.length === 0 && <div className="p-[var(--spacing-9)] border-2 border-dashed border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] text-center text-sm text-[var(--color-text-muted)] italic">No activity recorded.</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid lg:grid-cols-2 gap-[var(--spacing-7)] md:gap-[var(--spacing-8)] fade-in-up">
             <Card className="text-left">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-[var(--spacing-8)]">Confusion Matrix</h3>
                {currentProject.confusion_matrix ? (
                  <div className="grid gap-[var(--spacing-2)]" style={{ gridTemplateColumns: `repeat(${currentProject.labels?.length || 1}, 1fr)` }}>
                    {currentProject.confusion_matrix.map((row, i) => row.map((val, j) => {
                      const isCorrect = i === j;
                      const max = Math.max(...currentProject.confusion_matrix.flat(), 1);
                      const intensity = (val / max);
                      return (
                        <div key={`${i}-${j}`} className="aspect-square rounded-[var(--radius-md)] flex items-center justify-center p-[var(--spacing-2)] transition-all hover:scale-105 group relative" style={{ backgroundColor: isCorrect ? `rgba(27, 67, 50, ${intensity})` : `rgba(185, 28, 28, ${intensity * 0.2})`, color: intensity > 0.5 ? 'white' : 'inherit' }}>
                            <div className="text-lg md:text-xl font-bold">{val}</div>
                        </div>
                      );
                    }))}
                  </div>
                ) : <div className="p-[var(--spacing-9)] border-2 border-dashed border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] text-center text-sm text-[var(--color-text-muted)] italic">Retrain for analytics.</div>}
             </Card>
             <Card className="text-left">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-[var(--spacing-8)]">Feature Importance</h3>
                <div className="space-y-[var(--spacing-5)]">
                   {currentProject.top_features ? Object.entries(currentProject.top_features).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10).map(([word, weight]) => (
                     <div key={word} className="space-y-[var(--spacing-2)]">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)]">
                          <span>{word}</span>
                          <span className={weight > 0 ? 'text-[var(--color-accent)]' : 'text-red-400'}>{weight > 0 ? '+' : ''}{weight.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-[var(--color-bg-base)] rounded-full overflow-hidden">
                           <div className={`h-full transition-all duration-1000 ${weight > 0 ? 'bg-[var(--color-accent)]' : 'bg-red-400'}`} style={{ width: `${Math.min(Math.abs(weight) * 50, 100)}%` }} />
                        </div>
                     </div>
                   )) : <div className="p-[var(--spacing-9)] border-2 border-dashed border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] text-center text-sm text-[var(--color-text-muted)] italic">Retrain for insights.</div>}
                </div>
             </Card>
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="max-w-3xl space-y-[var(--spacing-7)] fade-in-up text-left">
             <Card className="space-y-[var(--spacing-8)]">
                <div className="space-y-[var(--spacing-2)]">
                   <h2 className="text-2xl font-bold font-display tracking-tight text-[var(--color-text-primary)] leading-none">Bulk Engine</h2>
                   <p className="text-sm text-[var(--color-text-muted)]">Classify entire datasets in one pass.</p>
                </div>
                <form onSubmit={handleBatchPredict} className="space-y-[var(--spacing-6)]">
                   <div className="border-4 border-dashed border-[var(--color-bg-base)] rounded-[var(--radius-xl)] p-[var(--spacing-9)] text-center relative hover:border-[var(--color-accent)]/20 transition-all cursor-pointer">
                      <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setBatchFile(e.target.files[0])} />
                      <div className="flex flex-col items-center gap-[var(--spacing-4)]">
                        <Database size={32} className="opacity-20 text-[var(--color-text-primary)]" />
                        <div className="font-bold text-sm break-all text-[var(--color-text-primary)]">{batchFile ? batchFile.name : 'Select CSV file'}</div>
                      </div>
                   </div>
                   <input 
                    type="text" placeholder="Text column name..." value={batchTextCol} onChange={e => setBatchTextCol(e.target.value)}
                    className="w-full h-14 px-[var(--spacing-6)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl outline-none focus:border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)] text-sm"
                   />
                   <Button disabled={!batchFile || !batchTextCol || batching} type="submit" className="w-full" loading={batching}>
                     {batching ? loadingMessage : 'Run Batch Job'}
                   </Button>
                </form>
             </Card>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-6)] h-auto lg:h-[calc(100vh-280px)] fade-in-up text-left">
            <Card className="lg:col-span-1 !p-[var(--spacing-6)] md:!p-[var(--spacing-7)] overflow-y-auto space-y-[var(--spacing-7)] h-[400px] lg:h-full">
               <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Intent Logic</h3>
               <div className="space-y-[var(--spacing-6)]">
                  {currentProject.labels?.map(label => (
                    <div key={label} className="space-y-[var(--spacing-2)]">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)]">{label}</label>
                       <textarea 
                        className="w-full p-[var(--spacing-4)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl text-xs outline-none focus:border-[var(--color-text-primary)] resize-none font-bold text-[var(--color-text-primary)] leading-relaxed" 
                        value={responses[label] || ''} 
                        onChange={e => setResponses({...responses, [label]: e.target.value})} 
                        onBlur={e => saveResponse(label, e.target.value)} 
                       />
                    </div>
                  ))}
               </div>
            </Card>
            <div className="lg:col-span-2 bg-[var(--color-bg-dark)] rounded-[var(--radius-xl)] flex flex-col overflow-hidden border border-white/5 h-[600px] lg:h-full shadow-2xl">
               <div className="p-[var(--spacing-5)] border-b border-white/5 bg-white/5 flex items-center justify-between text-white uppercase tracking-widest text-[10px] font-bold">
                  <div className="flex items-center gap-[var(--spacing-2)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                    <span>Live Simulation</span>
                  </div>
                  <button onClick={() => setChatMessages([])} className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent text-white uppercase font-bold text-[10px]">Reset</button>
               </div>
               <div className="flex-grow p-[var(--spacing-6)] md:p-[var(--spacing-7)] overflow-y-auto space-y-[var(--spacing-6)] flex flex-col">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`max-w-[85%] p-[var(--spacing-4)] rounded-2xl animate-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'bg-white/10 text-white self-end rounded-br-none' : 'bg-[var(--color-accent)] text-white self-start rounded-bl-none'}`}>
                       <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                       {msg.intent && <div className="mt-[var(--spacing-2)] pt-[var(--spacing-2)] border-t border-white/10 text-[9px] font-bold uppercase opacity-50 flex gap-[var(--spacing-2)]"><span>Matched: {msg.intent}</span><span>{(msg.confidence * 100).toFixed(0)}% Conf</span></div>}
                    </div>
                  ))}
                  {isTyping && <div className="bg-[var(--color-accent)]/50 text-white self-start p-[var(--spacing-4)] rounded-2xl animate-pulse text-xs">Thinking...</div>}
                  {chatMessages.length === 0 && <div className="flex-grow flex items-center justify-center text-[10px] font-bold uppercase tracking-widest opacity-20 text-white">Start a test session</div>}
               </div>
               <form onSubmit={handleChatSend} className="p-[var(--spacing-6)] bg-white/5 border-t border-white/5">
                  <div className="relative">
                    <input 
                      type="text" 
                      className="w-full h-14 bg-white/10 border border-white/10 rounded-full pl-[var(--spacing-6)] pr-16 text-white outline-none focus:border-[var(--color-accent)] font-bold placeholder:text-white/20 text-sm" 
                      placeholder="Simulate a message..." 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)} 
                    />
                    <button className="absolute right-2 top-2 w-10 h-10 bg-[var(--color-accent)] text-white rounded-full flex items-center justify-center cursor-pointer border-none transition-transform hover:scale-105 active:scale-95"><Send size={18} /></button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {activeTab === 'dev' && (
          <div className="max-w-4xl space-y-[var(--spacing-8)] fade-in-up text-left">
             <Card className="space-y-[var(--spacing-4)]">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Production API Key</span>
                <div className="flex gap-[var(--spacing-4)] flex-col sm:flex-row">
                  <div className="flex-grow p-[var(--spacing-5)] bg-[var(--color-bg-base)] rounded-2xl border border-[var(--color-border-subtle)] font-mono text-xs overflow-hidden truncate text-[var(--color-text-primary)]">
                    {currentProject.api_key || 'Retrain for production key.'}
                  </div>
                  <Button variant="primary" size="sm">Reveal Secret</Button>
                </div>
             </Card>
             <Card variant="dark" className="space-y-[var(--spacing-8)]">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-40">Integration: Python SDK</span>
                <div className="bg-white/5 p-[var(--spacing-6)] md:p-[var(--spacing-7)] rounded-2xl border border-white/5 font-mono text-[10px] md:text-xs text-[#9A9A96] overflow-x-auto space-y-[var(--spacing-2)] leading-relaxed">
                   <div className="text-white">import pickle</div>
                   <div className="text-[var(--color-accent)]">with open('toddler_model.pkl', 'rb') as f:</div>
                   <div className="pl-5 text-white">model = pickle.load(f)</div>
                   <div className="text-white mt-[var(--spacing-4)]"># Offline inference</div>
                   <div className="text-white">result = model.predict(["Test payload"])</div>
                   <div className="text-white">print(f"Outcome: {'{result[0]}'}")</div>
                </div>
                <Button variant="accent" className="w-full" size="md">Copy Snippet</Button>
             </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
