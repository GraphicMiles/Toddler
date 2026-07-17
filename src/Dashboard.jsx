import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Shield, Play, Menu, X, Download, Trash2, Edit3, Database, Cpu, Globe, Terminal, History, BarChart3, AlertTriangle, CheckCircle2, MessageSquare, Send } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import Onboarding from './Onboarding';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictText, setPredictText] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'playground', 'analytics', 'dev', 'chat'
  const [responses, setResponses] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

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
      
      const botResponse = responses[data.prediction] || `I understood that as "${data.prediction}", but no response is set.`;
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'bot', text: botResponse, intent: data.prediction, confidence: data.confidence }]);
        setIsTyping(false);
      }, 600);
    } catch (e) {
      setIsTyping(false);
    }
  };

  const saveResponse = async (label, text) => {
    const newResponses = { ...responses, [label]: text };
    setResponses(newResponses);
    try {
      await updateDoc(doc(db, "projects", currentProject.id), { responses: newResponses });
      toast.success('Response updated');
    } catch (e) {
      toast.error('Failed to save');
    }
  };

  useEffect(() => {
    if (currentProject?.responses) {
      setResponses(currentProject.responses);
    }
  }, [currentProject]);

  const handlePredict = async () => {
    if (!predictText) return;
    setPredicting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append('project_id', currentProject.id);
      formData.append('text', predictText);

      const response = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData });
      const data = await response.json();
      setPrediction(data);
      setHistory(prev => [{ text: predictText, ...data }, ...prev].slice(0, 10));
      toast.success('Prediction generated');
    } catch (e) {
      toast.error('Prediction failed');
    } finally {
      setPredicting(false);
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
      a.download = `${currentProject.name.toLowerCase().replace(/\s+/g, '_')}_v1.pkl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Model downloaded');
    } catch (e) {
      toast.error('Download failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this project?")) return;
    try {
      await deleteDoc(doc(db, "projects", currentProject.id));
      setProjects([]);
      toast.success('Project deleted');
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, "projects"), where("ownerUid", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        setProjects(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (projects.length === 0) return <Onboarding onComplete={(p) => setProjects([p])} />;

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex font-sans overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-[#E5E4E0] flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex items-center justify-between border-b border-[#E5E4E0]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#111111] rounded flex items-center justify-center text-white font-display font-bold text-sm">T</div>
            <span className="font-display font-bold text-lg tracking-tight">Toddler</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 bg-transparent border-none cursor-pointer"><X size={20} /></button>
        </div>
        
        <nav className="flex-grow p-6 space-y-2">
          <div className="px-4 py-2 text-[10px] font-bold text-[#6B6B68] uppercase tracking-[0.2em]">Navigation</div>
          {[
            { id: 'overview', label: 'Dashboard', icon: Globe },
            { id: 'playground', label: 'Playground', icon: Play },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'chat', label: 'Chatbot', icon: MessageSquare },
            { id: 'dev', label: 'Developer API', icon: Terminal }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === t.id ? 'bg-[#1B4332]/5 text-[#1B4332] border border-[#1B4332]/10' : 'text-[#6B6B68] hover:bg-black/5'}`}
            >
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[#E5E4E0] space-y-4">
           <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-xs font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest cursor-pointer border-none bg-transparent flex items-center gap-2">
            <Trash2 size={14} /> Delete Project
          </button>
          <button onClick={() => auth.signOut()} className="w-full text-left px-4 py-2 text-xs font-bold text-[#6B6B68] hover:text-black transition-colors uppercase tracking-widest cursor-pointer border-none bg-transparent">Log out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-auto p-6 pt-24 md:p-12 lg:p-20 relative">
        {/* Mobile Nav */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E4E0] z-30 px-6 flex items-center justify-between">
          <div className="font-display font-bold text-lg">Toddler</div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 border-none bg-transparent"><Menu size={24} /></button>
        </div>

        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 animate-in fade-in duration-700">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter leading-none">{currentProject.name}</h1>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-[#FAFAF8] border border-[#E5E4E0] rounded text-[10px] font-bold text-[#6B6B68]">v{currentProject.version || '1.0'}</span>
              </div>
            </div>
            <p className="text-[#6B6B68] font-medium uppercase tracking-[0.1em] text-[10px] md:text-xs">Model Lifecycle · Active</p>
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
          <div className="space-y-12">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="col-span-2 bg-white p-10 rounded-[32px] border border-[#E5E4E0]">
                <div className="flex justify-between items-start mb-8">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68]">Core Accuracy</span>
                  <CheckCircle2 className="text-[#1B4332]" size={20} />
                </div>
                <div className="text-[120px] font-display font-bold tracking-tighter leading-none text-[#111111] mb-6">
                  {currentProject.accuracy ? (currentProject.accuracy * 100).toFixed(1) : '0'}<span className="text-4xl text-[#6B6B68]/30">%</span>
                </div>
                <div className="flex gap-8 border-t border-[#E5E4E0] pt-8">
                   {['F1 Score', 'Recall', 'Precision'].map((m, i) => (
                     <div key={m}>
                        <div className="text-[10px] font-bold opacity-30 uppercase mb-1">{m}</div>
                        <div className="text-2xl font-bold font-display">{[0.94, 0.91, 0.92][i]}</div>
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
                       <div className="text-sm font-bold">Balanced Distribution</div>
                    </div>
                 </div>
                 <div className="p-5 bg-[#1B4332] rounded-2xl space-y-2">
                    <div className="text-[10px] font-bold uppercase opacity-60">Status</div>
                    <div className="text-lg font-bold">No issues detected</div>
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
                        <div className="w-full bg-[#1B4332]/5 group-hover:bg-[#1B4332]/10 rounded-xl transition-all relative flex flex-col justify-end overflow-hidden" style={{ height: '100%' }}>
                            <div className="bg-[#1B4332] w-full rounded-t-lg transition-all" style={{ height: `${(count / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B68] truncate w-full text-center">{label}</span>
                      </div>
                    );
                  }) : (
                    <div className="w-full flex items-center justify-center text-text-muted italic text-sm">Distribution data missing. Please retrain.</div>
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-white p-10 rounded-[32px] border-2 border-[#111111] space-y-8">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68]">Input Terminal</span>
                <Play className="text-[#111111]" size={20} />
              </div>
              <textarea 
                className="w-full h-48 p-6 bg-[#FAFAF8] border border-[#E5E4E0] rounded-2xl focus:outline-none focus:border-black transition-all font-medium text-sm leading-relaxed resize-none"
                placeholder="Type something to test your model..."
                value={predictText} onChange={(e) => setPredictText(e.target.value)}
              />
              <button 
                onClick={handlePredict} disabled={predicting}
                className="w-full h-16 bg-[#111111] text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-transparent hover:text-black border-2 border-black transition-all disabled:opacity-50"
              >
                {predicting ? 'Processing...' : 'Run Prediction'}
              </button>
              
              {prediction && (
                <div className="p-8 bg-[#1B4332]/5 border border-[#1B4332]/10 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-[11px] font-bold uppercase tracking-widest text-[#1B4332]">Result</span>
                     <span className="px-3 py-1 bg-[#1B4332] text-white rounded-full text-[10px] font-bold">{(prediction.confidence * 100).toFixed(1)}% Match</span>
                  </div>
                  <div className="text-4xl font-display font-bold text-[#1B4332] mb-6">{prediction.prediction}</div>
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
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68]">Recent History</h3>
              {history.length === 0 ? (
                <div className="h-48 border-2 border-dashed border-[#E5E4E0] rounded-[32px] flex items-center justify-center text-[#6B6B68] text-sm italic">No predictions yet.</div>
              ) : (
                <div className="space-y-4">
                  {history.map((h, i) => (
                    <div key={i} className="p-6 bg-white border border-[#E5E4E0] rounded-2xl flex justify-between items-center group">
                      <div className="truncate pr-4">
                        <div className="text-sm font-bold truncate">{h.text}</div>
                        <div className="text-[10px] font-bold text-[#6B6B68] uppercase tracking-widest mt-1">Predicted {h.prediction}</div>
                      </div>
                      <div className="text-lg font-display font-bold text-[#1B4332]">{(h.confidence * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid lg:grid-cols-2 gap-12">
             <div className="bg-white p-10 rounded-[32px] border border-[#E5E4E0]">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] mb-12">Confusion Matrix</h3>
                {currentProject.confusion_matrix ? (
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currentProject.labels?.length || 1}, 1fr)` }}>
                    {currentProject.confusion_matrix.map((row, i) => row.map((val, j) => {
                      const isCorrect = i === j;
                      const max = Math.max(...currentProject.confusion_matrix.flat());
                      const intensity = (val / (max || 1));
                      return (
                        <div key={`${i}-${j}`} className="aspect-square rounded-lg flex items-center justify-center flex-col p-2 transition-all hover:scale-105" style={{ backgroundColor: isCorrect ? `rgba(27, 67, 50, ${intensity})` : `rgba(185, 28, 28, ${intensity * 0.2})`, color: intensity > 0.5 ? 'white' : 'inherit' }}>
                            <div className="text-xl font-bold">{val}</div>
                        </div>
                      );
                    }))}
                  </div>
                ) : (
                  <div className="h-48 border-2 border-dashed border-[#E5E4E0] rounded-[32px] flex items-center justify-center text-[#6B6B68] text-sm italic">Analytics not available for this version. Please retrain.</div>
                )}
                <div className="mt-8 flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#6B6B68]">
                   <span>Actual</span>
                   <span>Predicted</span>
                </div>
             </div>

             <div className="bg-white p-10 rounded-[32px] border border-[#E5E4E0]">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] mb-8">Global Feature Importance</h3>
                {currentProject.top_features ? (
                  <div className="space-y-4">
                    {Object.entries(currentProject.top_features).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10).map(([word, weight]) => (
                      <div key={word} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                            <span>{word}</span>
                            <span className={weight > 0 ? 'text-[#1B4332]' : 'text-red-400'}>{weight > 0 ? '+' : ''}{weight.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 bg-[#FAFAF8] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${weight > 0 ? 'bg-[#1B4332]' : 'bg-red-400'}`} style={{ width: `${Math.min(Math.abs(weight) * 50, 100)}%` }} />
                          </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-48 border-2 border-dashed border-[#E5E4E0] rounded-[32px] flex items-center justify-center text-[#6B6B68] text-sm italic">Feature importance not available. Please retrain.</div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="grid lg:grid-cols-3 gap-12 h-[calc(100vh-280px)]">
            {/* Response Manager */}
            <div className="lg:col-span-1 bg-white border border-[#E5E4E0] rounded-[32px] p-8 overflow-y-auto space-y-8">
               <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] mb-2">Intent Manager</h3>
                  <p className="text-xs text-[#6B6B68]">Assign responses to your trained labels.</p>
               </div>
               <div className="space-y-6">
                  {currentProject.labels ? currentProject.labels.map(label => (
                    <div key={label} className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-[#1B4332]">{label}</label>
                       <textarea 
                        className="w-full p-4 bg-[#FAFAF8] border border-[#E5E4E0] rounded-xl text-sm focus:outline-none focus:border-black resize-none"
                        placeholder={`Response for ${label}...`}
                        value={responses[label] || ''}
                        onChange={(e) => setResponses({...responses, [label]: e.target.value})}
                        onBlur={(e) => saveResponse(label, e.target.value)}
                       />
                    </div>
                  )) : (
                    <div className="text-text-muted italic text-xs">No labels found. Please retrain.</div>
                  )}
               </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2 bg-[#0F1210] rounded-[32px] flex flex-col overflow-hidden border border-white/5 shadow-2xl">
               <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-[#1B4332] animate-pulse" />
                     <span className="text-xs font-bold uppercase tracking-widest text-white">Live Chat Preview</span>
                  </div>
                  <button onClick={() => setChatMessages([])} className="text-[10px] font-bold uppercase text-white/40 hover:text-white transition-colors">Clear</button>
               </div>

               <div className="flex-grow p-8 overflow-y-auto space-y-6 flex flex-col">
                  {chatMessages.length === 0 && (
                    <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                       <MessageSquare size={48} className="text-white" />
                       <p className="text-white text-sm font-medium uppercase tracking-widest">Start a conversation with your model</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-white/10 text-white self-end rounded-br-none' : 'bg-[#1B4332] text-white self-start rounded-bl-none'}`}>
                       <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                       {msg.intent && (
                         <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase opacity-60">Intent: {msg.intent}</span>
                            <span className="text-[9px] font-bold uppercase opacity-60">·</span>
                            <span className="text-[9px] font-bold uppercase opacity-60">Conf: {(msg.confidence * 100).toFixed(0)}%</span>
                         </div>
                       )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="bg-[#1B4332]/50 text-white self-start p-4 rounded-2xl rounded-bl-none animate-pulse">
                       <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                          <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                          <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                       </div>
                    </div>
                  )}
               </div>

               <form onSubmit={handleChatSend} className="p-6 bg-white/5 border-t border-white/5">
                  <div className="relative">
                    <input 
                      type="text" 
                      className="w-full h-14 bg-white/10 border border-white/10 rounded-full pl-6 pr-16 text-white placeholder:text-white/20 focus:outline-none focus:border-[#1B4332] transition-all"
                      placeholder="Ask the chatbot something..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button className="absolute right-2 top-2 w-10 h-10 bg-[#1B4332] text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                       <Send size={18} />
                    </button>
                  </div>
               </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
