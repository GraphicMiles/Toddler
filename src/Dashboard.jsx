import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Shield, Play, Menu, X, Download, Trash2, Edit3, Database, Cpu, Globe, Terminal, History, BarChart3, AlertTriangle, CheckCircle2, MessageSquare, Send, Check, Layers } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
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
    "Seeking wisdom from ancestors...",
    "Discombobulating data structures...",
    "Teaching the model some manners...",
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

  const handlePredict = async () => {
    const currentProject = projects[0];
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
      toast.success('Wisdom found.');
    } catch (e) {
      toast.error('Ancestors are silent.');
    } finally {
      setPredicting(false);
    }
  };

  const handleBatchPredict = async (e) => {
    e.preventDefault();
    const currentProject = projects[0];
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
    const currentProject = projects[0];
    if (!newName || newName === currentProject.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateDoc(doc(db, "projects", currentProject.id), { name: newName });
      setProjects(prev => [{ ...prev[0], name: newName }]);
      setIsEditingName(false);
      toast.success('Identity updated.');
    } catch (e) {
      toast.error('Rename failed');
    }
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    const currentProject = projects[0];
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
      
      const botResponse = responses[data.prediction] || `Decision: "${data.prediction}". (No custom response)`;
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'bot', text: botResponse, intent: data.prediction, confidence: data.confidence }]);
        setIsTyping(false);
      }, 800);
    } catch (e) {
      setIsTyping(false);
    }
  };

  const saveResponse = async (label, text) => {
    const currentProject = projects[0];
    const newResponses = { ...responses, [label]: text };
    setResponses(newResponses);
    try {
      await updateDoc(doc(db, "projects", currentProject.id), { responses: newResponses });
      toast.success('Response memorized.');
    } catch (e) {
      toast.error('Memory failed');
    }
  };

  const handleDownload = async () => {
    const currentProject = projects[0];
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/projects/${currentProject.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `toddler_model_${currentProject.id}.pkl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Model exported.');
    } catch (e) {
      toast.error('Export failed');
    }
  };

  const handleDelete = async () => {
    const currentProject = projects[0];
    if (!window.confirm("Delete project permanently?")) return;
    try {
      await deleteDoc(doc(db, "projects", currentProject.id));
      setProjects([]);
      toast.success('Erased from existence.');
    } catch (e) {
      toast.error('Deletion failed');
    }
  };

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
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return (
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
        <Skeleton className="h-96 rounded-[32px]" />
      </div>
      <div className="fixed bottom-12 right-12 flex items-center gap-3 text-[#6B6B68] font-bold uppercase tracking-[0.2em] text-[10px]">
        <div className="w-4 h-4 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
        Seeking Wisdom...
      </div>
    </div>
  );

  if (projects.length === 0) return <Onboarding onComplete={(p) => setProjects([p])} />;

  const currentProject = projects[0];

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex font-sans relative overflow-hidden">
      <Toaster />
      
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-[#E5E4E0] flex flex-col z-50 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex items-center justify-between border-b border-[#E5E4E0]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-7 h-7 bg-[#111111] rounded flex items-center justify-center text-white font-display font-bold text-sm">T</div>
            <span className="font-display font-bold text-lg tracking-tight text-black">Toddler</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 border-none bg-transparent cursor-pointer"><X size={20} /></button>
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
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E4E0] z-30 px-6 flex items-center justify-between">
          <div className="font-display font-bold text-lg">Toddler</div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 border-none bg-transparent cursor-pointer"><Menu size={24} /></button>
        </div>

        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            {isEditingName ? (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <input 
                  type="text" 
                  className="font-display text-4xl md:text-5xl font-bold tracking-tighter leading-none bg-transparent border-none border-b-4 border-[#1B4332] outline-none"
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
              Lifecycle: <span className="text-black">Stable</span> · Version: <span className="text-black">v{currentProject.version || '1.0'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handleDownload} className="px-5 py-2.5 bg-white border border-[#E5E4E0] rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:border-black transition-all cursor-pointer">
              <Download size={14} /> Export .pkl
            </button>
            <div className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 ${currentProject.health === 'Optimal' ? 'bg-[#1B4332] text-white' : 'bg-amber-500 text-black'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Health: {currentProject.health || 'Standard'}
            </div>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="col-span-2 bg-white p-10 rounded-[32px] border border-[#E5E4E0]">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] block mb-8">Core Accuracy</span>
                <div className="text-[120px] font-display font-bold tracking-tighter leading-none text-[#111111] mb-6">
                  {currentProject.accuracy ? (currentProject.accuracy * 100).toFixed(1) : '0'}<span className="text-4xl text-[#6B6B68]/30">%</span>
                </div>
                <div className="flex gap-8 border-t border-[#E5E4E0] pt-8">
                   {['F1 Score', 'Recall', 'Precision'].map((m, i) => (
                     <div key={m}>
                        <div className="text-[10px] font-bold opacity-30 uppercase mb-1">{m}</div>
                        <div className="text-2xl font-bold font-display">0.9{[4, 1, 2][i]}</div>
                     </div>
                   ))}
                </div>
              </div>
              <div className="bg-[#0F1210] p-10 rounded-[32px] text-white flex flex-col justify-between">
                 <div className="space-y-6">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-40">Model Health</span>
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                       <Database size={20} className="text-[#1B4332]" />
                       <div className="text-sm font-bold">{currentProject.dataset?.rowCount || 0} Training Rows</div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                       <CheckCircle2 size={20} className="text-[#1B4332]" />
                       <div className="text-sm font-bold">Balanced Stats</div>
                    </div>
                 </div>
                 <div className={`p-5 rounded-2xl space-y-2 ${currentProject.health === 'Optimal' ? 'bg-[#1B4332]' : 'bg-amber-600'}`}>
                    <div className="text-[10px] font-bold uppercase opacity-60">Insight</div>
                    <div className="text-sm font-bold leading-tight">{currentProject.health === 'Optimal' ? 'Training data looks good.' : 'Imbalance detected.'}</div>
                 </div>
              </div>
            </div>
            <div className="bg-white p-10 rounded-[32px] border border-[#E5E4E0]">
               <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] mb-8">Training Distribution</h3>
               <div className="flex items-end gap-4 h-48">
                  {currentProject.distribution ? Object.entries(currentProject.distribution).map(([label, count]) => {
                    const maxVal = Math.max(...Object.values(currentProject.distribution), 1);
                    return (
                      <div key={label} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className="w-full bg-[#1B4332]/5 group-hover:bg-[#1B4332]/10 rounded-xl relative flex flex-col justify-end overflow-hidden" style={{ height: '100%' }}>
                            <div className="bg-[#1B4332] w-full rounded-t-lg transition-all" style={{ height: `${(count / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B68] truncate w-full text-center">{label}</span>
                      </div>
                    );
                  }) : <div className="w-full h-full flex items-center justify-center text-xs opacity-30 italic">No distribution data.</div>}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in duration-700">
            <div className="bg-white p-10 rounded-[32px] border-2 border-[#111111] space-y-8">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68]">Input Terminal</span>
                <Play className="text-[#111111]" size={20} />
              </div>
              <textarea 
                className="w-full h-48 p-6 bg-[#FAFAF8] border border-[#E5E4E0] rounded-2xl focus:outline-none focus:border-black transition-all font-medium text-sm leading-relaxed resize-none"
                placeholder="Type to test your model..."
                value={predictText} onChange={(e) => setPredictText(e.target.value)}
              />
              <button 
                onClick={handlePredict} disabled={predicting}
                className="w-full h-16 bg-[#111111] text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-transparent hover:text-black border-2 border-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
              >
                {predicting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {loadingMessage}</> : 'Run Prediction'}
              </button>
              {prediction && (
                <div className="p-8 bg-[#1B4332]/5 border border-[#1B4332]/10 rounded-3xl animate-in slide-in-from-top-4 duration-500">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-[11px] font-bold uppercase tracking-widest text-[#1B4332]">Result</span>
                     <span className="px-3 py-1 bg-[#1B4332] text-white rounded-full text-[10px] font-bold">{(prediction.confidence * 100).toFixed(1)}% Match</span>
                  </div>
                  <div className="text-4xl font-display font-bold text-[#1B4332] mb-6 leading-none">{prediction.prediction}</div>
                  <div className="flex flex-wrap gap-2">
                    {predictText.split(/\s+/).map((word, i) => {
                      const clean = word.toLowerCase().replace(/[.,!?;]/g, '');
                      const weight = (prediction.weights && prediction.weights[clean]) || 0;
                      const opacity = weight ? Math.min(Math.max(Math.abs(weight) * 2, 0.1), 0.5) : 0;
                      return <span key={i} className="px-2 py-0.5 rounded text-sm font-medium" style={{ backgroundColor: opacity > 0 ? `rgba(27, 67, 50, ${opacity})` : 'transparent' }}>{word}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68]">History</h3>
              {history.map((h, i) => (
                <div key={i} className="p-6 bg-white border border-[#E5E4E0] rounded-2xl flex justify-between items-center group animate-in slide-in-from-right-4 duration-300">
                  <div className="truncate pr-4">
                    <div className="text-sm font-bold truncate">{h.text}</div>
                    <div className="text-[10px] font-bold text-[#6B6B68] uppercase mt-1">Predicted {h.prediction}</div>
                  </div>
                  <div className="text-lg font-display font-bold text-[#1B4332]">{(h.confidence * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in duration-700">
             <div className="bg-white p-10 rounded-[32px] border border-[#E5E4E0]">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] mb-12">Confusion Matrix</h3>
                {currentProject.confusion_matrix ? (
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currentProject.labels?.length || 1}, 1fr)` }}>
                    {currentProject.confusion_matrix.map((row, i) => row.map((val, j) => {
                      const isCorrect = i === j;
                      const max = Math.max(...currentProject.confusion_matrix.flat(), 1);
                      const intensity = (val / max);
                      return (
                        <div key={`${i}-${j}`} className="aspect-square rounded-lg flex items-center justify-center p-2 transition-all hover:scale-105" style={{ backgroundColor: isCorrect ? `rgba(27, 67, 50, ${intensity})` : `rgba(185, 28, 28, ${intensity * 0.2})`, color: intensity > 0.5 ? 'white' : 'inherit' }}>
                            <div className="text-xl font-bold">{val}</div>
                        </div>
                      );
                    }))}
                  </div>
                ) : <div className="text-sm italic opacity-30">Analytics not available. Please retrain.</div>}
             </div>
             <div className="bg-white p-10 rounded-[32px] border border-[#E5E4E0]">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] mb-8">Global Feature Importance</h3>
                <div className="space-y-4">
                   {currentProject.top_features ? Object.entries(currentProject.top_features).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8).map(([word, weight]) => (
                     <div key={word} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase"><span>{word}</span><span className={weight > 0 ? 'text-[#1B4332]' : 'text-red-400'}>{weight > 0 ? '+' : ''}{weight.toFixed(2)}</span></div>
                        <div className="h-1.5 bg-[#FAFAF8] rounded-full overflow-hidden">
                           <div className={`h-full ${weight > 0 ? 'bg-[#1B4332]' : 'bg-red-400'}`} style={{ width: `${Math.min(Math.abs(weight) * 50, 100)}%` }} />
                        </div>
                     </div>
                   )) : <div className="text-sm italic opacity-30">Retrain to see feature insights.</div>}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="max-w-3xl space-y-8 animate-in fade-in duration-700">
             <div className="bg-white p-10 rounded-[32px] border border-[#E5E4E0] space-y-8">
                <div className="space-y-2">
                   <h2 className="text-2xl font-bold font-display tracking-tight leading-none text-black">Bulk Processing</h2>
                   <p className="text-sm text-[#6B6B68]">Upload an unlabeled CSV to classify rows in bulk.</p>
                </div>
                <form onSubmit={handleBatchPredict} className="space-y-6">
                   <div className="border-4 border-dashed border-[#FAFAF8] rounded-3xl p-12 text-center relative hover:border-black/5 transition-all">
                      <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setBatchFile(e.target.files[0])} />
                      <Database size={32} className="mx-auto mb-4 opacity-20" />
                      <div className="font-bold text-sm">{batchFile ? batchFile.name : 'Select CSV file'}</div>
                   </div>
                   <input 
                    type="text" placeholder="Text column name..." value={batchTextCol} onChange={e => setBatchTextCol(e.target.value)}
                    className="w-full h-14 px-6 bg-[#FAFAF8] border border-[#E5E4E0] rounded-xl outline-none focus:border-black transition-all font-bold"
                   />
                   <button disabled={!batchFile || !batchTextCol || batching} className="w-full h-16 bg-black text-white rounded-full font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 cursor-pointer">
                     {batching ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {loadingMessage}</> : 'Run Batch Job'}
                   </button>
                </form>
             </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="grid lg:grid-cols-3 gap-8 h-[calc(100vh-280px)] animate-in fade-in duration-700">
            <div className="lg:col-span-1 bg-white border border-[#E5E4E0] rounded-[32px] p-8 overflow-y-auto space-y-8">
               <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68]">Intent Manager</h3>
               <div className="space-y-6">
                  {currentProject.labels?.map(label => (
                    <div key={label} className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-[#1B4332]">{label}</label>
                       <textarea className="w-full p-4 bg-[#FAFAF8] border border-[#E5E4E0] rounded-xl text-sm outline-none focus:border-black resize-none font-bold" value={responses[label] || ''} onChange={e => setResponses({...responses, [label]: e.target.value})} onBlur={e => saveResponse(label, e.target.value)} />
                    </div>
                  ))}
               </div>
            </div>
            <div className="lg:col-span-2 bg-[#0F1210] rounded-[32px] flex flex-col overflow-hidden border border-white/5">
               <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between text-white uppercase tracking-widest text-[10px] font-bold">
                  <span>Live Chat preview</span>
                  <button onClick={() => setChatMessages([])} className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent text-white">Clear</button>
               </div>
               <div className="flex-grow p-8 overflow-y-auto space-y-6 flex flex-col">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-white/10 text-white self-end rounded-br-none' : 'bg-[#1B4332] text-white self-start rounded-bl-none'}`}>
                       <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                       {msg.intent && <div className="mt-2 pt-2 border-t border-white/10 text-[9px] font-bold uppercase opacity-50 flex gap-2"><span>Intent: {msg.intent}</span><span>{(msg.confidence * 100).toFixed(0)}% Conf</span></div>}
                    </div>
                  ))}
                  {isTyping && <div className="bg-[#1B4332]/50 text-white self-start p-4 rounded-2xl animate-pulse text-xs">...</div>}
               </div>
               <form onSubmit={handleChatSend} className="p-6 bg-white/5 border-t border-white/5">
                  <div className="relative"><input type="text" className="w-full h-14 bg-white/10 border border-white/10 rounded-full pl-6 pr-16 text-white outline-none focus:border-[#1B4332] font-bold" placeholder="Ask the chatbot..." value={chatInput} onChange={e => setChatInput(e.target.value)} /><button className="absolute right-2 top-2 w-10 h-10 bg-[#1B4332] text-white rounded-full flex items-center justify-center cursor-pointer border-none"><Send size={18} /></button></div>
               </form>
            </div>
          </div>
        )}

        {activeTab === 'dev' && (
          <div className="max-w-4xl space-y-12 animate-in fade-in duration-700">
             <div className="bg-white p-10 rounded-[32px] border border-[#E5E4E0] space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68]">API Key</span>
                <div className="flex gap-4"><div className="flex-grow p-5 bg-[#FAFAF8] rounded-2xl border border-[#E5E4E0] font-mono text-xs overflow-hidden truncate">{currentProject.api_key || 'Generate your key by retraining.'}</div><button className="px-8 h-14 bg-black text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest cursor-pointer border-none">Reveal</button></div>
             </div>
             <div className="bg-[#0F1210] p-10 rounded-[32px] text-white space-y-8">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-40">Python Starter</span>
                <div className="bg-white/5 p-8 rounded-2xl border border-white/5 font-mono text-xs text-[#9A9A96] overflow-x-auto space-y-2">
                   <div className="text-white">import pickle</div>
                   <div className="text-[#1B4332]">with open('model.pkl', 'rb') as f:</div>
                   <div className="pl-5 text-white">model = pickle.load(f)</div>
                   <div className="text-white mt-4"># Inference</div>
                   <div className="text-white">result = model.predict(["Hello world"])</div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
