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
      const q = query(collection(db, "projects"), where("ownerUid", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const projectList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projectList);
      setLoading(false);
    };

    fetchProjects();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-toddler-off-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-toddler-green border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // If no projects, force onboarding
  if (projects.length === 0) {
    return <Onboarding onComplete={(newProject) => setProjects([newProject])} />;
  }

  const project = projects[0]; // V1 only supports one project

  return (
    <div className="min-h-screen bg-toddler-off-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-toddler-black/5 flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-toddler-black/5">
          <div className="w-6 h-6 bg-toddler-green rounded-sm flex items-center justify-center text-white font-display font-bold text-xs">T</div>
          <span className="font-display font-bold tracking-tight">Toddler</span>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <div className="px-4 py-2 text-xs font-bold text-toddler-black/30 uppercase tracking-widest">Projects</div>
          <button className="w-full text-left px-4 py-2 rounded-sm bg-toddler-green/5 text-toddler-green font-medium">
            {project.name}
          </button>
        </nav>
        <div className="p-4 border-t border-toddler-black/5">
          <button 
            onClick={() => auth.signOut()}
            className="w-full text-left px-4 py-2 text-sm font-medium text-toddler-black/60 hover:text-toddler-black transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-auto p-12">
        <header className="mb-12">
          <h1 className="font-display text-4xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-toddler-black/60 mt-2">Status: {project.status}</p>
        </header>

        {project.status === 'trained' ? (
          <div className="grid grid-cols-2 gap-8">
            {/* Results / Stats */}
            <div className="bg-white p-8 rounded-lg border border-toddler-black/5 shadow-sm">
              <h2 className="font-display text-xl font-bold mb-6">Model Performance</h2>
              <div className="text-6xl font-display font-bold text-toddler-green mb-2">
                {project.accuracy ? `${(project.accuracy * 100).toFixed(1)}%` : '—'}
              </div>
              <p className="text-sm text-toddler-black/40 font-medium uppercase tracking-wider">Accuracy on test set</p>
            </div>
            
            {/* Playground placeholder */}
            <div className="bg-white p-8 rounded-lg border border-toddler-black/5 shadow-sm">
              <h2 className="font-display text-xl font-bold mb-6">Playground</h2>
              <p className="text-toddler-black/60 mb-6 text-sm">Test your model with new input text.</p>
              <textarea 
                className="w-full h-32 p-4 border border-toddler-black/10 rounded-sm focus:outline-none focus:border-toddler-green transition-colors text-sm"
                placeholder="Type something here..."
              />
              <button className="mt-4 w-full bg-toddler-green text-white py-3 rounded-sm font-bold hover:opacity-90 transition-opacity">
                Predict
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-lg border border-toddler-black/5 text-center max-w-2xl mx-auto mt-20">
             <h2 className="font-display text-2xl font-bold mb-4">Complete your project setup</h2>
             <p className="text-toddler-black/60 mb-8">You need to upload a dataset and train your model before you can use the dashboard.</p>
             <button className="bg-toddler-green text-white px-8 py-3 rounded-sm font-bold hover:opacity-90">
               Continue Setup
             </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
