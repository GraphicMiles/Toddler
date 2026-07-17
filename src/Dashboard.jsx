import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Shield, Play, Menu, X, Download } from 'lucide-react';
import Onboarding from './Onboarding';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictText, setPredictText] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handlePredict = async () => {
    if (!predictText) return;
    setPredicting(true);
    setPrediction(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) throw new Error('API URL missing');

      const formData = new FormData();
      formData.append('project_id', projects[0].id);
      formData.append('text', predictText);

      const response = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setPrediction(data);
    } catch (e) {
      console.error(e);
    } finally {
      setPredicting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/projects/${projects[0].id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `toddler_model_${projects[0].name.toLowerCase().replace(/\s+/g, '_')}.pkl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, "projects"), where("ownerUid", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const projectList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(projectList);
      } catch (e) {
        console.error("Error fetching projects:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // If no projects, force onboarding
  if (projects.length === 0) {
    return <Onboarding onComplete={(newProject) => setProjects([newProject])} />;
  }

  const project = projects[0];

  return (
    <div className="min-h-screen bg-bg-base flex font-sans relative overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-border-subtle z-30 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-text-primary rounded flex items-center justify-center text-bg-base font-display font-bold text-sm">T</div>
          <span className="font-display font-bold text-lg tracking-tight">Toddler</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2 border-none bg-transparent cursor-pointer">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-border-subtle flex flex-col z-50 transition-transform duration-300 transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-8 flex items-center justify-between border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-text-primary rounded flex items-center justify-center text-bg-base font-display font-bold text-sm">T</div>
            <span className="font-display font-bold text-lg tracking-tight">Toddler</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 border-none bg-transparent cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-grow p-6 space-y-2">
          <div className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Projects</div>
          <button className="w-full text-left px-4 py-3 rounded-xl bg-accent/5 text-accent font-bold text-sm flex items-center justify-between border border-accent/10">
            {project.name}
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </button>
        </nav>
        <div className="p-6 border-t border-border-subtle">
          <button 
            onClick={() => auth.signOut()}
            className="w-full text-left px-4 py-2 text-sm font-bold text-text-muted hover:text-text-primary transition-colors uppercase tracking-widest cursor-pointer border-none bg-transparent"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-auto p-6 pt-24 md:p-12 lg:p-20">
        <header className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div className="space-y-2">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter leading-none">{project.name}</h1>
            <p className="text-text-muted font-medium uppercase tracking-[0.1em] text-[10px] md:text-xs">V1 Model Engine · Active</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownload}
              className="px-4 py-2 border border-border-subtle hover:border-text-primary transition-all rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer bg-white"
            >
              <Download size={14} /> Download (.pkl)
            </button>
            <div className="px-4 py-2 bg-accent text-accent-fg rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest">System Operational</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Performance Card */}
          <div className="bg-white p-6 md:p-10 rounded-3xl border border-border-subtle flex flex-col">
            <div className="space-y-6 md:space-y-8 flex-grow">
              <div className="flex justify-between items-start">
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">Model Performance</span>
                <Shield className="text-accent" size={20} />
              </div>
              <div className="space-y-1">
                <div className="text-6xl md:text-8xl font-display font-bold tracking-tighter text-text-primary leading-none">
                  {project.accuracy ? `${(project.accuracy * 100).toFixed(1)}%` : '—'}
                </div>
                <p className="text-[11px] md:text-sm font-bold text-text-muted uppercase tracking-widest">Test Set Accuracy</p>
              </div>
              <div className="pt-6 md:pt-8 border-t border-border-subtle grid grid-cols-3 gap-4 md:gap-8">
                <div>
                   <div className="text-[9px] md:text-xs font-bold opacity-30 uppercase mb-1">F1 Score</div>
                   <div className="text-lg md:text-xl font-bold font-display">0.94</div>
                </div>
                <div>
                   <div className="text-[9px] md:text-xs font-bold opacity-30 uppercase mb-1">Recall</div>
                   <div className="text-lg md:text-xl font-bold font-display">0.91</div>
                </div>
                <div>
                   <div className="text-[9px] md:text-xs font-bold opacity-30 uppercase mb-1">Precision</div>
                   <div className="text-lg md:text-xl font-bold font-display">0.92</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Playground Card */}
          <div className="bg-white p-6 md:p-10 rounded-3xl border-2 border-text-primary">
            <div className="space-y-6 md:space-y-8">
              <div className="flex justify-between items-start">
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">Interactive Playground</span>
                <Play className="text-text-primary" size={20} />
              </div>
              <div className="space-y-4">
                <textarea 
                  className="w-full h-32 md:h-40 p-4 md:p-6 bg-bg-base border border-border-subtle rounded-2xl focus:outline-none focus:border-text-primary transition-all font-medium text-sm leading-relaxed"
                  placeholder="Paste input text here to test your model..."
                  value={predictText}
                  onChange={(e) => setPredictText(e.target.value)}
                />
                <button 
                  onClick={handlePredict}
                  disabled={predicting}
                  className="w-full py-4 md:py-5 bg-text-primary text-bg-base rounded-full font-bold uppercase tracking-widest text-[10px] md:text-xs hover:bg-transparent hover:text-text-primary border-2 border-text-primary transition-all active:scale-[0.98] cursor-pointer"
                >
                  {predicting ? 'Predicting...' : 'Generate Prediction'}
                </button>
                
                {prediction && (
                  <div className="p-4 md:p-6 bg-accent/5 border border-accent/10 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-accent">Prediction Result</span>
                       <span className="text-[9px] md:text-[10px] font-bold text-accent">{(prediction.confidence * 100).toFixed(1)}% Confidence</span>
                    </div>
                    
                    <div className="text-2xl font-display font-bold text-accent mb-4 leading-none">{prediction.prediction}</div>
                    
                    {/* Explainability / Word Highlights */}
                    <div className="pt-4 border-t border-accent/10">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-accent/40 mb-3">Key contributors:</div>
                      <div className="flex flex-wrap gap-2">
                        {predictText.split(/\s+/).map((word, i) => {
                          const cleanWord = word.toLowerCase().replace(/[.,!?;]/g, '');
                          const weight = prediction.weights[cleanWord];
                          // Map weight to opacity (0.1 to 0.4 range)
                          const intensity = weight ? Math.min(Math.max(Math.abs(weight) * 2, 0.1), 0.4) : 0;
                          
                          return (
                            <span 
                              key={i} 
                              className="px-2 py-0.5 rounded text-xs md:text-sm font-medium transition-all duration-500"
                              style={{ 
                                backgroundColor: intensity > 0 ? `rgba(27, 67, 50, ${intensity})` : 'transparent',
                                border: intensity > 0 ? `1px solid rgba(27, 67, 50, 0.1)` : '1px solid transparent'
                              }}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
