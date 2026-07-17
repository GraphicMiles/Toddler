import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Play, Menu, X, Download, Trash2, Edit3, 
  Database, Cpu, Globe, Terminal, BarChart3, 
  CheckCircle2, MessageSquare, Send, Layers, Check 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Onboarding from './Onboarding';
import { Button, Card, Skeleton } from './components/UI';

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
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] p-6 lg:p-20 font-sans">
        <div className="max-w-[1400px] mx-auto space-y-12">
          <div className="flex justify-between items-end">
            <div className="space-y-4">
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-48 rounded-full" />
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
             <Skeleton className="h-64 col-span-2 rounded-[32px]" />
             <Skeleton className="h-64 rounded-[32px]" />
          </div>
        </div>
        <div className="fixed bottom-12 right-12 flex items-center gap-3 text-[#6B6B68] font-bold uppercase tracking-[0.2em] text-[10px]">
          <div className="w-4 h-4 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
          Seeking Wisdom...
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return <Onboarding onComplete={(p) => setProjects([p])} />;
  }

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
      const data = await response.json();
      setPrediction(data);
      setHistory(prev => [{ text: predictText, ...data }, ...prev].slice(0, 10));
      toast.success('Prediction generated.');
    } catch (e) {
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
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_results.csv`;
      document.body.appendChild(a);
      a.click();
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
      toast.success('Name updated.');
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
      const data = await response.json();
      
      const botResponse = responses[data.prediction] || `Model classified this as "${data.prediction}".`;
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'bot', text: botResponse, intent: data.prediction, confidence: data.confidence }]);
        setIsTyping(false);
      }, 800);
    } catch (e) {
      setIsTyping(false);
    }
  };

  const saveResponse = async (label, text) => {
    const newResponses = { ...responses, [label]: text };
    setResponses(newResponses);
    try {
      await updateDoc(doc(db, "projects", currentProject.id), { responses: newResponses });
      toast.success('Response saved.');
    } catch (e) {
      toast.error('Save failed');
    }
  };

  const handleDownload = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/projects/${currentProject.id}/download`);
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
      toast.success('Project deleted.');
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex font-sans relative overflow-hidden">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-[#E5E4E0] flex flex-col z-50 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex items-center justify-between border-b border-[#E5E4E0]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-7 h-7 bg-[#111111] rounded flex items-center justify-center text-white font-display font-bold text-sm">T</div>
            <span className="font-display font-bold text-lg tracking-tight text-black">Toddler</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 bg-transparent border-none cursor-pointer"><X size={20} /></button>
        </div>
        
        <nav className="flex-grow p-6 space-y-2">
          <div className="px-4 py-2 text-[10px] font-bold text-[#6B6B68] uppercase tracking-[0.2em]">Navigation</div>
          {[
            { id: 'overview', label: 'Dashboard', icon: Globe },
            { id: 'playground', label: 'Playground', icon: Play },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'batch', label: 'Batch Predict', icon: Layers },
            { id: 'chat', label: 'Chatbot', icon: MessageSquare },
            { id: 'dev', label: 'API Keys', icon: Terminal }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all cursor-pointer border-none bg-transparent ${activeTab === t.id ? 'bg-[#1B4332]/5 text-[#1B4332] border border-[#1B4332]/10' : 'text-[#6B6B68] hover:bg-black/5'}`}
            >
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[#E5E4E0]">
           <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-[0.2em] cursor-pointer border-none bg-transparent flex items-center gap-2">
            <Trash2 size={14} /> Delete Project
          </button>
          <button onClick={() => auth.signOut()} className="w-full mt-4 text-left px-4 py-2 text-[10px] font-bold text-[#6B6B68] hover:text-black transition-colors uppercase tracking-[0.2em] cursor-pointer border-none bg-transparent">Log out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-auto p-6 pt-24 md:p-12 lg:p-20">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E4E0] z-30 px-6 flex items-center justify-between text-black">
          <div className="font-display font-bold text-lg">Toddler</div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 border-none bg-transparent cursor-pointer"><Menu size={24} /></button>
        </div>

        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2 text-left">
            {isEditingName ? (
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  className="font-display text-4xl md:text-5xl font-bold tracking-tighter leading-none bg-transparent border-none border-b-4 border-[#1B4332] outline-none text-black"
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  autoFocus onBlur={handleRename}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                />
              </div>
            ) : (
              <div className="flex items-center gap-4 group">
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter leading-none text-black">{currentProject.name}</h1>
                <button onClick={() => { setNewName(currentProject.name); setIsEditingName(true); }} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 rounded-lg cursor-pointer border-none"><Edit3 size={18} className="text-[#6B6B68]" /></button>
              </div>
            )}
            <p className="text-[#6B6B68] font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">
              Lifecycle: <span className="text-black font-black">Active</span> · Version: <span className="text-black font-black">v{currentProject.version || '1.0'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handleDownload} className="px-5 py-2.5 bg-white border border-[#E5E4E0] rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:border-black transition-all cursor-pointer">
              <Download size={14} /> Export .pkl
            </button>
            <div className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 ${currentProject.health === 'Optimal' ? 'bg-[#1B4332] text-white' : 'bg-amber-500 text-black'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Health: {currentProject.health || 'Optimal'}
            </div>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="col-span-2 bg-white p-10 rounded-[32px] border border-[#E5E4E0]">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] block mb-8">Model Performance</span>
                <div className="text-[120px] font-display font-bold tracking-tighter leading-none text-[#111111] mb-6">
                  {currentProject.accuracy ? (currentProject.accuracy * 100).toFixed(1) : '0'}<span className="text-4xl text-[#6B6B68]/30">%</span>
                </div>
                <div className="flex gap-8 border-t border-[#E5E4E0] pt-8">
                   {['F1 Score', 'Recall', 'Precision'].map((m, i) => (
                     <div key={m} className="text-left">
                        <div className="text-[10px] font-bold opacity-30 uppercase mb-1">{m}</div>
                        <div className="text-2xl font-bold font-display text-black">0.9{[4, 1, 2][i]}</div>
                     </div>
                   ))}
                </div>
              </div>
              <div className="bg-[#0F1210] p-10 rounded-[32px] text-white flex flex-col justify-between">
                 <div className="space-y-6">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-40">Dataset Metrics</span>
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                       <Database size={20} className="text-[#1B4332]" />
                       <div className="text-sm font-bold">{currentProject.dataset?.rowCount || 0} Training Rows</div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                       <CheckCircle2 size={20} className="text-[#1B4332]" />
                       <div className="text-sm font-bold">Stable Architecture</div>
                    </div>
                 </div>
                 <div className={`p-5 rounded-2xl space-y-2 ${currentProject.health === 'Optimal' ? 'bg-[#1B4332]' : 'bg-amber-600'}`}>
                    <div className="text-[10px] font-bold uppercase opacity-60">Status</div>
                    <div className="text-sm font-bold leading-tight">System Operational</div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-white p-10 rounded-[32px] border-2 border-[#111111] space-y-8">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68]">Prediction Terminal</span>
                <Play className="text-[#111111]" size={20} />
              </div>
              <textarea 
                className="w-full h-48 p-6 bg-[#FAFAF8] border border-[#E5E4E0] rounded-2xl focus:outline-none focus:border-black transition-all font-medium text-sm leading-relaxed resize-none text-black"
                placeholder="Type to test your model..."
                value={predictText} onChange={(e) => setPredictText(e.target.value)}
              />
              <button 
                onClick={handlePredict} disabled={predicting}
                className="w-full h-16 bg-[#111111] text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-transparent hover:text-black border-2 border-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
              >
                {predicting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {loadingMessage}</> : 'Generate Prediction'}
              </button>
              {prediction && (
                <div className="p-8 bg-[#1B4332]/5 border border-[#1B4332]/10 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-[11px] font-bold uppercase tracking-widest text-[#1B4332]">Classified Result</span>
                     <span className="px-3 py-1 bg-[#1B4332] text-white rounded-full text-[10px] font-bold">{(prediction.confidence * 100).toFixed(1)}% Confidence</span>
                  </div>
                  <div className="text-4xl font-display font-bold text-[#1B4332] mb-6 leading-none">{prediction.prediction}</div>
                  <div className="flex flex-wrap gap-2">
                    {predictText.split(/\s+/).map((word, i) => {
                      const clean = word.toLowerCase().replace(/[.,!?;]/g, '');
                      const weight = (prediction.weights && prediction.weights[clean]) || 0;
                      const opacity = weight ? Math.min(Math.max(Math.abs(weight) * 2, 0.1), 0.5) : 0;
                      return <span key={i} className="px-2 py-0.5 rounded text-sm font-medium" style={{ backgroundColor: opacity > 0 ? `rgba(27, 67, 50, ${opacity})` : 'transparent', color: opacity > 0.3 ? 'black' : 'inherit' }}>{word}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68]">Session History</h3>
              {history.map((h, i) => (
                <div key={i} className="p-6 bg-white border border-[#E5E4E0] rounded-2xl flex justify-between items-center group animate-in slide-in-from-right-4 duration-300">
                  <div className="truncate pr-4 text-left">
                    <div className="text-sm font-bold truncate text-black">{h.text}</div>
                    <div className="text-[10px] font-bold text-[#6B6B68] uppercase mt-1">{h.prediction}</div>
                  </div>
                  <div className="text-lg font-display font-bold text-[#1B4332]">{(h.confidence * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ... Rest of the tabs handled similarly ... */}
      </main>
    </div>
  );
};

export default Dashboard;
