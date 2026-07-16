import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Onboarding from './Onboarding';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-bg-base flex font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-border-subtle flex flex-col">
        <div className="p-8 flex items-center gap-2 border-b border-border-subtle">
          <div className="w-7 h-7 bg-text-primary rounded flex items-center justify-center text-bg-base font-display font-bold text-sm">T</div>
          <span className="font-display font-bold text-lg tracking-tight">Toddler</span>
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
      <main className="flex-grow overflow-auto p-12 lg:p-20">
        <header className="mb-16 flex justify-between items-end">
          <div className="space-y-2">
            <h1 className="font-display text-5xl font-bold tracking-tighter">{project.name}</h1>
            <p className="text-text-muted font-medium uppercase tracking-[0.1em] text-xs">V1 Model Engine · Active</p>
          </div>
          <div className="px-4 py-2 bg-accent text-accent-fg rounded-full text-[10px] font-bold uppercase tracking-widest">System Operational</div>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Performance Card */}
          <div className="bg-white p-10 rounded-3xl border border-border-subtle">
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">Model Performance</span>
                <Shield className="text-accent" size={20} />
              </div>
              <div className="space-y-1">
                <div className="text-8xl font-display font-bold tracking-tighter text-text-primary">
                  {project.accuracy ? `${(project.accuracy * 100).toFixed(1)}%` : '—'}
                </div>
                <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Test Set Accuracy</p>
              </div>
              <div className="pt-8 border-t border-border-subtle grid grid-cols-3 gap-8">
                <div>
                   <div className="text-xs font-bold opacity-30 uppercase mb-1">F1 Score</div>
                   <div className="text-xl font-bold font-display">0.94</div>
                </div>
                <div>
                   <div className="text-xs font-bold opacity-30 uppercase mb-1">Recall</div>
                   <div className="text-xl font-bold font-display">0.91</div>
                </div>
                <div>
                   <div className="text-xs font-bold opacity-30 uppercase mb-1">Precision</div>
                   <div className="text-xl font-bold font-display">0.92</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Playground Card */}
          <div className="bg-white p-10 rounded-3xl border-2 border-text-primary">
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">Interactive Playground</span>
                <Play className="text-text-primary" size={20} />
              </div>
              <div className="space-y-4">
                <textarea 
                  className="w-full h-40 p-6 bg-bg-base border border-border-subtle rounded-2xl focus:outline-none focus:border-text-primary transition-all font-medium text-sm leading-relaxed"
                  placeholder="Paste input text here to test your model..."
                />
                <button className="w-full py-5 bg-text-primary text-bg-base rounded-full font-bold uppercase tracking-widest text-xs hover:bg-transparent hover:text-text-primary border-2 border-text-primary transition-all active:scale-[0.98] cursor-pointer">
                  Generate Prediction
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
