import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Onboarding from './Onboarding';
import { notifyTrainingComplete } from './notify';

const vibrate = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {});
  }
};

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [previewImage, setPreviewImage] = useState(null);
  const [predictText, setPredictText] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [responses, setResponses] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Initializing Engine...');
  const [batchFile, setBatchFile] = useState(null);
  const [batchTextCol, setBatchTextCol] = useState('');
  const [batching, setBatching] = useState(false);
  const [history, setHistory] = useState([]);

  const genTimeoutRef = useRef(null);
  const projectsRef = useRef([]);

  const messages = ["Caramelizing onions...", "Finding Nemo...", "Seeking wisdom...", "Teaching the model..."];

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

  useEffect(() => () => {
    if (genTimeoutRef.current) clearTimeout(genTimeoutRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false
    let iv = null
    const fetchProjects = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, "projects"), where("ownerUid", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        if (cancelled) return
        const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Fire a local notification when a project just finished training.
        // Use projectsRef (always fresh) instead of the closure-captured `projects`.
        const prev = projectsRef.current;
        data.forEach(p => {
          if (p.status === 'trained') {
            const was = prev.find(pp => pp.id === p.id);
            if (was && was.status !== 'trained' && was.status !== 'failed') {
              const acc = typeof p.accuracy === 'number' ? ` (${Math.round(p.accuracy*100)}% accuracy)` : '';
              notifyTrainingComplete({ id: p.id, title: 'Toddler', body: `"${p.name || 'Model'}" ready${acc}.` });
            }
          }
        });
        projectsRef.current = data;
        setProjects(data);
        if (data.length) {
          setActiveProjectId(prev => prev && data.find(p => p.id === prev) ? prev : data[0].id);
        }
        // (Re)schedule poll whenever there's work in progress
        const anyTraining = data.some(p => ['queued','training','device_training','awaiting_device'].includes(p.status))
        if (iv) clearInterval(iv)
        iv = anyTraining ? setInterval(fetchProjects, 5000) : null
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setTimeout(() => setLoading(false), 400);
      }
    };
    fetchProjects();
    return () => { cancelled = true; if (iv) clearInterval(iv) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Load responses + reset per-project UI state whenever active project changes
  useEffect(() => {
    if (!currentProject) return;
    setResponses(currentProject.responses || {});
    setChatMessages([]);
    setPrediction(null);
    setHistory([]);
    setPreviewImage(null);
    setPredictText('');
    setChatInput('');
    setBatchFile(null);
    setBatchTextCol('');
    setActiveTab(currentProject.type === 'generative' ? 'chat' : 'overview');
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isModelReady = currentProject && currentProject.status === 'trained';

  const handlePredict = async () => {
    if (!predictText || !currentProject) return;
    if (!isModelReady) { toast.error('Model is not trained yet.'); return; }
    setPredicting(true); setPrediction(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) throw new Error("VITE_API_URL is missing.");
      const formData = new FormData();
      formData.append('project_id', currentProject.id);
      formData.append('text', predictText);

      let response;
      try {
        response = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData });
      } catch (e) {
        throw new Error('Network Error: Check backend CORS or URL.');
      }

      if (!response.ok) {
        let errText = `HTTP Error ${response.status}`;
        try { const errData = await response.json(); errText = errData.detail || errData.message || errText; } catch {}
        throw new Error(errText);
      }

      const data = await response.json();
      const confidence = typeof data.confidence === 'number' ? data.confidence : 0;
      const processedData = { prediction: data.prediction || 'Unknown', confidence, weights: data.weights || {} };
      setPrediction(processedData);
      setHistory(prev => [{ text: predictText, ...processedData }, ...prev].slice(0, 10));
      vibrate(ImpactStyle.Light);
      toast.success('Wisdom found.');
    } catch (e) { toast.error(e.message || 'Prediction failed.'); } finally { setPredicting(false); }
  };

  const handleBatchPredict = async (e) => {
    e.preventDefault();
    if (!batchFile || !batchTextCol || !currentProject) return;
    if (!isModelReady) { toast.error('Model is not trained yet.'); return; }
    setBatching(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) throw new Error("VITE_API_URL is missing.");
      const formData = new FormData();
      formData.append('project_id', currentProject.id);
      formData.append('text_column', batchTextCol);
      formData.append('file', batchFile);

      let response;
      try {
        response = await fetch(`${apiUrl}/batch`, { method: 'POST', body: formData });
      } catch (e) {
        throw new Error('Network Error: Check backend CORS or URL.');
      }

      if (!response.ok) {
        let errText = `HTTP Error ${response.status}`;
        try { const errData = await response.json(); errText = errData.detail || errData.message || errText; } catch {}
        throw new Error(errText);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `results_${currentProject.id}.csv`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
      vibrate(ImpactStyle.Medium);
      toast.success('Batch processing complete.');
    } catch (e) { toast.error(e.message || 'Batch failed.'); } finally { setBatching(false); }
  };

  const handleRename = async () => {
    if (!newName || !currentProject) { setIsEditingName(false); return; }
    if (newName === currentProject.name) { setIsEditingName(false); return; }
    try {
      await updateDoc(doc(db, "projects", currentProject.id), { name: newName });
      setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, name: newName } : p));
      setIsEditingName(false); vibrate(ImpactStyle.Light); toast.success('Identity updated.');
    } catch { toast.error('Rename failed'); }
  };

    const handleChatSend = async (e) => {
    e.preventDefault();
    if (!currentProject) return;
    if (!chatInput && !previewImage) return;

    const sentImage = previewImage;
    const sentText = chatInput;
    
    if (currentProject.type === 'vision') {
      if (!sentImage) return;
      const userMsg = { role: 'user', imageSrc: sentImage };
      setChatMessages(prev => [...prev, userMsg]);
      setPreviewImage(null);
    } else {
      if (!sentText) return;
      const userMsg = { role: 'user', text: sentText };
      setChatMessages(prev => [...prev, userMsg]);
      setChatInput('');
    }
    
    setIsTyping(true);

    try {
      // Proxy all predictions through the backend, never run locally
      const apiUrl = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append('project_id', currentProject.id);
      
      if (currentProject.type === 'vision') {
         // TODO: Phase 2 - vision payload
         throw new Error("Vision backend proxy pending Phase 2");
      } else {
         formData.append('text', sentText);
      }
      
      const response = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Backend inference proxy failed");
      const result = await response.json();
      
      const botResponse = currentProject.type === 'vision' 
        ? (responses[result.prediction] || `Decision: "${result.prediction}".`)
        : result.prediction;
        
      setChatMessages(prev => [...prev, { role: 'bot', text: botResponse, intent: result.prediction, confidence: result.confidence || 0, originImage: sentImage }]);
    } catch (e) {
      toast.error(e.message || "Prediction failed");
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div style={{minHeight: '100vh', backgroundColor: '#14130F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: '32px', height: '32px', border: '3px solid #C6FF33', borderTopColor: 'transparent', borderRadius: '50%'}} className="animate-spin"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="app-container text-[var(--text)] font-sans">
        <aside className="sidebar fixed md:static inset-y-0 left-0 z-50 transform translate-x-0">
          <div className="sidebar-header justify-between">
            <Link to="/" className="logo text-white cursor-pointer no-underline">
              <span className="logo-mark"></span>TODDLER
            </Link>
          </div>
          <div className="p-4 flex-grow flex flex-col gap-2 overflow-y-auto">
            <div className="input-label mb-2 px-2">Projects</div>
            <div className="text-[var(--text-faint)] px-2 text-sm">No projects yet.</div>
          </div>
        </aside>
        <main className="main-content relative overflow-y-auto">
          <Onboarding onComplete={(p) => { setProjects([p]); setActiveProjectId(p.id); }} />
        </main>
      </div>
    );
  }


  const saveResponse = async (label, text) => {
    if (!currentProject) return;
    const newResponses = { ...responses, [label]: text };
    setResponses(newResponses);
    try {
      await updateDoc(doc(db, "projects", currentProject.id), { responses: newResponses });
      vibrate(ImpactStyle.Light);
      toast.success('Response memorized.');
    } catch { toast.error('Save failed'); }
  };

  const handleDownload = async () => {
    if (!currentProject) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) throw new Error("VITE_API_URL is missing.");
      const response = await fetch(`${apiUrl}/projects/${currentProject.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const isJson = currentProject.model_format === 'toddler-bayes-v1';
      const ext = isJson ? 'json' : 'pkl';
      const a = document.createElement('a'); a.href = url; a.download = `model_${currentProject.id}.${ext}`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
      vibrate(ImpactStyle.Medium);
      toast.success('Model exported.');
    } catch { toast.error('Export failed'); }
  };

  const handleDelete = async () => {
    if (!currentProject) return;
    if (!window.confirm(`Delete project "${currentProject.name}"? This cannot be undone.`)) return;
    const deletedId = currentProject.id;
    try {
      await deleteDoc(doc(db, "projects", deletedId));
      const remaining = projects.filter(p => p.id !== deletedId);
      setProjects(remaining);
      setActiveProjectId(remaining[0]?.id || null);
      vibrate(ImpactStyle.Heavy);
      toast.success('Erased from existence.');
    } catch { toast.error('Deletion failed'); }
  };

  const switchProject = (pid) => {
    setActiveProjectId(pid);
    setSidebarOpen(false);
  };


  if (!currentProject) {
    return (
      <div className="app-container text-[var(--text)] font-sans">
        <aside className="sidebar fixed md:static inset-y-0 left-0 z-50 transform translate-x-0">
          <div className="sidebar-header justify-between">
            <Link to="/" className="logo text-white cursor-pointer no-underline">
              <span className="logo-mark"></span>TODDLER
            </Link>
          </div>
          <div className="p-4 flex-grow flex flex-col gap-2 overflow-y-auto">
            <div className="input-label mb-2 px-2">Projects</div>
            <div className="text-[var(--text-faint)] px-2 text-sm">No projects yet.</div>
          </div>
        </aside>
        <main className="main-content relative overflow-y-auto">
          <Onboarding onComplete={(p) => { setProjects([p]); setActiveProjectId(p.id); }} />
        </main>
      </div>
    );
  }

  const tabsForType = currentProject?.type === 'vision'
    ? ['overview', 'chat', 'dev']
    : currentProject?.type === 'generative'
    ? ['chat', 'dev']
    : ['overview', 'batch', 'chat', 'dev'];

  const effectiveTab = tabsForType.includes(activeTab) ? activeTab : tabsForType[0];

  return (
    <div className="app-container text-[var(--text)] font-sans">
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar fixed md:static inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-transform duration-200`}>
        <div className="sidebar-header justify-between">
          <Link to="/" className="logo text-white cursor-pointer no-underline">
            <span className="logo-mark"></span>TODDLER
          </Link>
          <button className="md:hidden btn-ghost" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <div className="p-4 flex-grow flex flex-col gap-2 overflow-y-auto">
          <div className="input-label mb-2 px-2">Projects</div>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => switchProject(p.id)}
              className={`text-left bg-[var(--surface-2)] border px-4 py-3 cursor-pointer ${p.id === currentProject.id ? 'border-[var(--accent-lime)]' : 'border-[var(--line)]'}`}
            >
              <div className="font-medium truncate">{p.name}</div>
              <div className="font-mono text-[10px] mt-1" style={{color:'var(--accent-lime)'}}>
                {p.status === 'trained'
                  ? `Acc ${((p.accuracy||0)*100).toFixed(1)}%`
                  : p.status === 'queued' || p.status === 'training' ? 'Training…' : (p.status || 'Draft')}
              </div>
            </button>
          ))}
          <button
            className="btn mt-2"
            onClick={() => {
              setActiveProjectId(null);
              setProjects([]);
            }}
          >
            + New Project
          </button>
        </div>
        <div className="p-4 border-t border-[var(--line)] space-y-3">
          <button className="btn w-full !border-[var(--danger)] !text-[var(--danger)] hover:!bg-[var(--danger)] hover:!text-white" onClick={handleDelete}>Delete Model</button>
          <button className="btn-ghost w-full text-left font-mono text-xs" onClick={() => auth.signOut()}>Log out</button>
        </div>
      </aside>

      <main className="main-content flex flex-col h-screen overflow-hidden">
        <div className="md:hidden p-4 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)]">
          <span className="font-display font-bold">Toddler Dashboard</span>
          <button className="btn-ghost" onClick={() => setSidebarOpen(true)}>Menu</button>
        </div>

        <header className="dash-header p-6 md:p-8 flex flex-wrap justify-between items-center gap-4 bg-[var(--surface)] border-b border-[var(--line)]">
          <div>
            <div className="eyebrow mb-4"><span className="dot"></span>{isModelReady ? 'Production Model' : currentProject.status === 'training' || currentProject.status === 'queued' ? 'Training in progress' : 'Model Draft'}</div>
            {isEditingName ? (
              <input
                type="text"
                className="input-field !text-3xl !font-display !font-bold !bg-transparent !border-b-2 !border-[var(--accent-lime)] !p-0 !pb-2"
                value={newName} onChange={(e) => setNewName(e.target.value)}
                autoFocus onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-display font-bold">{currentProject.name}</h1>
                <button className="text-[var(--text-faint)] hover:text-[var(--text)] transition-colors cursor-pointer bg-transparent border-none" onClick={() => { setNewName(currentProject.name); setIsEditingName(true); }}>✎</button>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button className="btn" onClick={handleDownload} disabled={!isModelReady}>
              Export {currentProject?.model_format === 'toddler-bayes-v1' ? '.json' : '.pkl'}
            </button>
          </div>
        </header>

        <div className="border-b border-[var(--line)] bg-[var(--bg)] px-6 md:px-8 flex gap-6 md:gap-8 overflow-x-auto">
          {tabsForType.map(tab => (
            <button
              key={tab}
              className={`py-4 font-mono text-xs uppercase tracking-wider border-b-2 transition-colors cursor-pointer bg-transparent ${effectiveTab === tab ? 'border-[var(--accent-lime)] text-[var(--accent-lime)]' : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-grow overflow-auto p-8 bg-[var(--bg)]">
          {!isModelReady && effectiveTab !== 'dev' && (
            <div className="panel mb-6" style={{borderColor:'var(--accent-purple)'}}>
              <div className="font-mono text-xs uppercase tracking-wider" style={{color:'var(--accent-purple)'}}>Status: {currentProject.status || 'draft'}</div>
              <p className="text-[var(--text-dim)] text-sm mt-2">
                {currentProject.status === 'queued' || currentProject.status === 'training'
                  ? 'Your model is being trained. Predictions, batch, and chat will unlock once training finishes.'
                  : 'This model isn\u2019t trained yet. Finish training to start running predictions.'}
              </p>
            </div>
          )}

          {effectiveTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="panel">
                  <h3 className="font-display font-bold text-xl mb-4">Live Inference</h3>
                  {currentProject.type === 'vision' ? (
                    <div className="flex flex-col gap-4">
                      <div className="border-2 border-dashed border-[var(--line)] bg-[var(--surface-2)] p-12 text-center relative hover:border-[var(--accent-lime)] transition-colors cursor-pointer">
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                          if (e.target.files[0]) {
                            if (previewImage) URL.revokeObjectURL(previewImage);
                            setPreviewImage(URL.createObjectURL(e.target.files[0]));
                            setPrediction(null);
                          }
                        }} />
                        <div className="font-mono text-sm text-[var(--accent-lime)]">Drop image here or click to upload</div>
                      </div>
                      {previewImage && (
                        <div className="flex gap-4 items-end flex-wrap">
                          <img src={previewImage} alt="Preview" className="h-32 object-contain border border-[var(--line)]" />
                          <button className="btn btn-solid" onClick={async () => {
                            setPredicting(true);
                            try {
                              const apiUrl = import.meta.env.VITE_API_URL;
                              const formData = new FormData();
                              formData.append('project_id', currentProject.id);
                              // TODO: Phase 2 - image blob upload
                              throw new Error("Vision backend proxy pending Phase 2");
                              /*
                              const response = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData });
                              if (!response.ok) throw new Error("Backend inference proxy failed");
                              const result = await response.json();
                              setPrediction({ prediction: result.prediction, confidence: result.confidence || 0, weights: {} });
                              vibrate(ImpactStyle.Light);
                              */
                            } catch (e) {
                              toast.error(e.message || "Vision prediction failed");
                            } finally {
                              setPredicting(false);
                            }
                          }} disabled={predicting}>
                            {predicting ? 'Analyzing...' : 'Predict Image Class'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3 items-stretch">
                      <input
                        type="text"
                        className="input-field m-0"
                        placeholder={isModelReady ? "Enter text to classify..." : "Waiting for model to finish training..."}
                        value={predictText}
                        onChange={e => setPredictText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePredict()}
                        disabled={!isModelReady}
                      />
                      <button className="btn btn-solid shrink-0 m-0" onClick={handlePredict} disabled={predicting || !isModelReady}>
                        {predicting ? 'Wait' : 'Predict'}
                      </button>
                    </div>
                  )}

                  {prediction && (
                    <div className="mt-6 p-6 border border-[var(--line)] bg-[var(--surface-2)]">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <div className="input-label mb-1">Result</div>
                          <div className="text-2xl font-bold text-[var(--accent-lime)]">{prediction.prediction}</div>
                        </div>
                        <div className="text-right">
                          <div className="input-label mb-1">Confidence</div>
                          <div className="text-xl font-mono text-[var(--text-dim)]">{((prediction.confidence || 0) * 100).toFixed(1)}%</div>
                        </div>
                      </div>

                      {Object.keys(prediction.weights || {}).length > 0 && (
                        <>
                          <div className="input-label mb-3">Feature Weights</div>
                          <div className="space-y-2">
                            {Object.entries(prediction.weights).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,5).map(([word, weight]) => (
                              <div key={word} className="flex items-center gap-4 text-sm font-mono">
                                <div className="w-24 text-right truncate text-[var(--text-dim)]">{word}</div>
                                <div className="flex-grow h-2 bg-[var(--surface)] relative">
                                  <div className={`absolute top-0 h-full ${weight > 0 ? 'bg-[var(--accent-lime)] left-1/2' : 'bg-[var(--danger)] right-1/2'}`} style={{ width: `${Math.min(Math.abs(weight) * 50, 50)}%` }} />
                                </div>
                                <div className="w-12 text-[10px] text-[var(--text-faint)]">{weight > 0 ? '+' : ''}{weight.toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {history.length > 0 && currentProject.type !== 'vision' && (
                    <div className="mt-6">
                      <div className="input-label mb-3">Recent predictions</div>
                      <div className="border border-[var(--line)]">
                        {history.slice(0, 5).map((h, i) => (
                          <div key={i} className="flex items-center justify-between p-3 text-sm font-mono border-b border-[var(--line)] last:border-b-0">
                            <span className="truncate text-[var(--text-dim)] mr-3">{h.text}</span>
                            <span className="text-[var(--accent-lime)] shrink-0">{h.prediction} · {((h.confidence||0)*100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-6">
                <div className="panel">
                  <h3 className="font-display font-bold text-lg mb-4">Model Health</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between font-mono text-sm border-b border-[var(--line)] pb-2">
                      <span className="text-[var(--text-dim)]">Accuracy</span>
                      <span className="text-[var(--accent-lime)]">{isModelReady ? `${((currentProject.accuracy||0)*100).toFixed(1)}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between font-mono text-sm border-b border-[var(--line)] pb-2">
                      <span className="text-[var(--text-dim)]">{currentProject.type === 'vision' ? 'Training Images' : 'Dataset Rows'}</span>
                      <span className="text-white">{currentProject.type === 'vision' ? (currentProject.dataset?.imageCount || 0) : (currentProject.dataset?.rowCount || 0)}</span>
                    </div>
                    <div className="flex justify-between font-mono text-sm pb-2">
                      <span className="text-[var(--text-dim)]">Status</span>
                      <span style={{color:'var(--accent-purple)'}}>{currentProject.status || 'Draft'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {effectiveTab === 'batch' && (
            <div className="max-w-2xl">
              <div className="panel">
                <h3 className="font-display font-bold text-xl mb-2">Bulk Processing</h3>
                <p className="text-[var(--text-dim)] text-sm mb-6">Upload a CSV to classify multiple rows at once.</p>

                <form onSubmit={handleBatchPredict} className="space-y-6">
                  <div className="border-2 border-dashed border-[var(--line)] p-8 text-center bg-[var(--surface-2)] relative">
                    <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setBatchFile(e.target.files[0])} />
                    <div className="font-mono text-sm text-[var(--accent-lime)]">
                      {batchFile ? batchFile.name : 'Drop target file here or click to upload'}
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Target Text Column Name</label>
                    <input type="text" className="input-field" placeholder="e.g. comment_body" value={batchTextCol} onChange={e => setBatchTextCol(e.target.value)} />
                  </div>
                  <button disabled={!batchFile || !batchTextCol || batching || !isModelReady} type="submit" className="btn btn-solid w-full">
                    {batching ? loadingMessage : 'Execute Batch Analysis'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {effectiveTab === 'chat' && (
            <div className={`flex flex-col lg:flex-row gap-6 h-full min-h-[500px] ${currentProject.type === 'generative' ? 'lg:flex-col' : ''}`}>
              {currentProject.type !== 'generative' && (
                <div className="panel lg:w-1/3 overflow-y-auto mb-0">
                  <h3 className="input-label mb-6">Intent Mapping</h3>
                  {currentProject.labels && currentProject.labels.length > 0 ? (
                    <div className="space-y-6">
                      {currentProject.labels.map(label => (
                        <div key={label}>
                          <label className="font-mono text-[10px] text-[var(--accent-lime)] uppercase mb-2 block">{label}</label>
                          <textarea
                            className="input-field h-24 resize-none"
                            value={responses[label] || ''}
                            onChange={e => setResponses({...responses, [label]: e.target.value})}
                            onBlur={e => saveResponse(label, e.target.value)}
                            placeholder="Response logic..."
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--text-faint)] text-sm font-mono">Labels will appear once training finishes.</p>
                  )}
                </div>
              )}
              <div className={`panel flex flex-col p-0 mb-0 ${currentProject.type === 'generative' ? 'w-full lg:h-[700px]' : 'lg:w-2/3'}`}>
                <div className="p-4 border-b border-[var(--line)] bg-[var(--surface-2)] flex items-center justify-between">
                  <div className="eyebrow !m-0"><span className="dot"></span>Simulation</div>
                  <button className="btn-ghost !text-[10px]" onClick={() => setChatMessages([])}>Reset</button>
                </div>
                <div className="flex-grow overflow-y-auto bg-[var(--bg)] flex flex-col">
                  {chatMessages.length === 0 && (
                    <div className="flex-grow flex items-center justify-center font-mono text-[var(--text-faint)] text-xs">
                      System: Ready for input.
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`p-6 border-b border-[var(--line)] flex gap-4 md:gap-6 ${msg.role === 'user' ? 'bg-[var(--surface)]' : 'bg-[var(--bg)]'}`}>
                      <div className={`font-mono text-xs font-bold uppercase shrink-0 w-16 md:w-24 mt-1 ${msg.role === 'user' ? 'text-[var(--text-dim)]' : 'text-[var(--accent-purple)]'}`}>
                        {msg.role === 'user' ? 'USER >' : 'TODDLER >'}
                      </div>
                      <div className="flex-grow space-y-4 min-w-0">
                        {msg.imageSrc ? (
                          <img src={msg.imageSrc} alt="User input" className="max-h-64 object-contain border border-[var(--line)] bg-black" />
                        ) : (
                          <p className="text-[15px] font-sans leading-relaxed text-[var(--text)]">{msg.text}</p>
                        )}

                        {msg.intent && (
                          <div className="pt-4 border-t border-[var(--line)] border-opacity-50 flex flex-col gap-3">
                            <div className="flex flex-wrap items-center text-xs font-mono text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-3 py-2 border border-[var(--accent-lime)]/20 w-fit gap-6">
                              <span>INTENT_MATCH: {msg.intent}</span>
                              <span>CONFIDENCE: {((msg.confidence||0)*100).toFixed(1)}%</span>
                            </div>

                            {msg.originImage && currentProject.type === 'vision' && (
                              <div className="mt-2">
                                <label className="text-[10px] font-mono text-[var(--text-dim)] uppercase block mb-1">Incorrect? Recalibrate weight:</label>
                                <select
                                  className="input-field !h-10 !text-xs !w-auto min-w-[200px]"
                                  onChange={(e) => {
                                    if (e.target.value) handleRetrainVision(msg.originImage, e.target.value);
                                    e.target.value = "";
                                  }}
                                >
                                  <option value="">Select correct label...</option>
                                  {currentProject.labels?.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="p-6 border-b border-[var(--line)] flex gap-4 md:gap-6 bg-[var(--bg)]">
                      <div className="font-mono text-xs font-bold uppercase shrink-0 w-16 md:w-24 mt-1 text-[var(--accent-lime)]">TODDLER &gt;</div>
                      <div className="flex-grow"><div className="w-3 h-5 bg-[var(--accent-lime)] animate-pulse" /></div>
                    </div>
                  )}
                </div>
                <form onSubmit={handleChatSend} className="p-4 border-t border-[var(--line)] bg-[var(--surface-2)] flex gap-3 items-center">
                  {currentProject.type === 'vision' ? (
                    <div className="flex-grow flex items-center gap-3">
                      <input
                        key={previewImage ? 'has-img' : 'empty'}
                        type="file" accept="image/*"
                        className="hidden" id="chat-img-upload"
                        onChange={e => { if (e.target.files[0]) setPreviewImage(URL.createObjectURL(e.target.files[0])); }}
                      />
                      <label htmlFor="chat-img-upload" className="btn-ghost !text-xs cursor-pointer border border-[var(--line)] px-4 py-2 hover:bg-[var(--line)]">
                        {previewImage ? 'Change Image' : 'Select Image'}
                      </label>
                      {previewImage && <span className="text-xs font-mono text-[var(--accent-lime)]">Image selected. Ready to send.</span>}
                    </div>
                  ) : (
                    <input type="text" className="input-field m-0 flex-grow" placeholder={isModelReady || currentProject.type === 'generative' ? "Enter test sequence..." : "Waiting for model to finish training..."} value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={!isModelReady && currentProject.type !== 'generative'} />
                  )}
                  <button className="btn btn-solid shrink-0 m-0" type="submit" disabled={isTyping || (currentProject.type === 'vision' && !previewImage) || (!isModelReady && currentProject.type !== 'generative' && currentProject.type !== 'vision')}>Send</button>
                </form>
              </div>
            </div>
          )}

          {effectiveTab === 'dev' && (
            <div className="max-w-3xl space-y-6">
              <div className="panel">
                <h3 className="input-label mb-4">Infrastructure Key</h3>
                <div className="flex gap-4 items-center flex-wrap">
                  <div id="api-key-readout" className="input-field font-mono text-sm text-[var(--accent-lime)] truncate select-all bg-[var(--surface-2)] min-w-0 flex-1">
                    {currentProject?.api_key || 'A key will be generated once training completes.'}
                  </div>
                  <button
                    className="btn shrink-0"
                    disabled={!currentProject?.api_key}
                    onClick={() => {
                      const el = document.getElementById('api-key-readout');
                      if (el && navigator.clipboard) navigator.clipboard.writeText(el.textContent || '');
                      toast.success('Key copied.');
                    }}
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[var(--text-faint)] text-xs font-mono mt-3">
                  Send <code className="text-[var(--accent-lime)]">X-API-Key: {currentProject?.api_key || 'tdlr_live_…'}</code> to authenticate requests without a Firebase token.
                </p>
              </div>
              <div className="panel border-[var(--accent-purple)]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display font-bold text-lg">
                    {currentProject.type === 'vision' ? 'JavaScript Implementation (Edge ML)' : currentProject.type === 'generative' ? 'OpenAI Python SDK' : 'Python Implementation'}
                  </h3>
                </div>
                <div className="bg-[var(--bg)] p-6 border border-[var(--line)] font-mono text-sm text-[var(--text-dim)] overflow-x-auto leading-loose whitespace-pre-wrap">
                  {currentProject.type === 'vision' ? (
                    <>
                      <div className="text-[var(--text-faint)]">{'// Load model weights from your Toddler CDN endpoint'}</div>
                      <div className="text-white">{'import * as tf from "@tensorflow/tfjs";'}</div>
                      <div className="text-white">{'import * as knn from "@tensorflow-models/knn-classifier";'}</div>
                      <div className="text-white mt-4">{'const url = "' + (currentProject.modelUrl || 'https://api.cloudinary.com/v1_1/.../raw') + '";'}</div>
                      <div className="text-white">{'const res = await fetch(url);'}</div>
                      <div className="pl-4 text-[var(--accent-purple)]">{'const datasetObj = await res.json();'}</div>
                      <div className="text-[var(--text-faint)] mt-4">{'// Run edge prediction on a local image'}</div>
                      <div className="text-white">{'const classifier = knn.create();'}</div>
                      <div className="text-[var(--accent-lime)]">{'// (See documentation for deserialization logic)'}</div>
                      <div className="text-white">{'const prediction = await classifier.predictClass(activation);'}</div>
                    </>
                  ) : currentProject.type === 'generative' ? (
                    <div className="whitespace-pre overflow-x-auto">
                      <div className="text-white">from openai import OpenAI</div>
                      <div className="text-[var(--text-faint)] mt-4"># Initialize connection to your fine-tuned model</div>
                      <div className="text-white">client = OpenAI(api_key="your_api_key")</div>
                      <div className="text-white mt-4">response = client.chat.completions.create(</div>
                      <div className="pl-4 text-[var(--accent-purple)]">model="ft:gpt-4o:toddler:{currentProject.id}",</div>
                      <div className="pl-4 text-white">messages=[</div>
                      <div className="pl-8 text-[var(--accent-lime)]">{`{"role": "system", "content": "${currentProject.dataset?.systemPrompt || 'You are a helpful assistant.'}"},`}</div>
                      <div className="pl-8 text-white">{"{\"role\": \"user\", \"content\": \"Your prompt here\"}"}</div>
                      <div className="pl-4 text-white">]</div>
                      <div className="text-white">)</div>
                      <div className="text-[var(--text-faint)] mt-4">print(response.choices[0].message.content)</div>
                    </div>
                  ) : currentProject.model_format === 'toddler-bayes-v1' ? (
                    <>
                      <div className="text-[var(--text-faint)]">// Zero-dependency JSON model export (phone-trained)</div>
                      <div className="text-white">import json, math, re</div>
                      <div className="text-white mt-4">with open('model.json') as f:</div>
                      <div className="pl-4 text-[var(--accent-purple)]">m = json.load(f)</div>
                      <div className="text-white mt-4"># see README in export zip for full ~30-line predictor</div>
                      <div className="text-white"># result = predict("your text here")</div>
                    </>
                  ) : (
                    <>
                      <div className="text-white">import pickle</div>
                      <div className="text-[var(--text-faint)]"># Load serialized artifact</div>
                      <div className="text-white">with open('toddler_v1_model.pkl', 'rb') as f:</div>
                      <div className="pl-4 text-[var(--accent-purple)]">pipeline = pickle.load(f)</div>
                      <div className="text-white mt-4"># Execute prediction</div>
                      <div className="text-white">result = pipeline.predict(["Specific test string"])</div>
                      <div className="text-[var(--accent-lime)]">print(f"Decision: {'{result[0]}'}")</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
