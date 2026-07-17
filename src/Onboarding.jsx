import React, { useState, useEffect } from 'react';
import { ArrowRight, Upload, X, Check, AlertCircle, Database, Shield } from 'lucide-react';
import Papa from 'papaparse';
import { auth, db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Container, Button, Badge } from './components/UI';

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selection, setSelection] = useState({ text: '', label: '' });
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Protocol...');
  const [redactPii, setRedactPii] = useState(false);

  const messages = [
    "Caramelizing onions...",
    "Finding Nemo...",
    "Seeking wisdom...",
    "Discombobulating data...",
    "Teaching the model...",
    "Polishing weights..."
  ];

  useEffect(() => {
    let interval;
    if (isUploading) {
      let index = 0;
      interval = setInterval(() => {
        setLoadingMessage(messages[index % messages.length]);
        index++;
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeded. Max 5MB.');
      return;
    }
    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true, preview: 10,
      complete: (results) => {
        if (results.data.length > 0) {
          setCsvData(results.data);
          setColumns(Object.keys(results.data[0]));
          setError('');
          setStep(3);
        } else {
          setError('Detected empty CSV file.');
        }
      },
      error: (err) => setError('System parse error: ' + err.message)
    });
  };

  const handleComplete = async () => {
    if (!selection.text || !selection.label) {
      setError('Column mapping incomplete.');
      return;
    }

    setIsUploading(true);
    setError('');
    
    try {
      const projectData = {
        ownerUid: auth.currentUser.uid,
        name: projectName,
        createdAt: new Date(),
        status: 'training',
        redactPii,
        version: 1,
        health: 'Optimal',
        dataset: { textColumn: selection.text, labelColumn: selection.label, rowCount: csvData ? csvData.length : 0 }
      };
      const docRef = await addDoc(collection(db, "projects"), projectData);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', docRef.id);
      formData.append('text_column', selection.text);
      formData.append('label_column', selection.label);
      formData.append('redact_pii', redactPii);

      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/train`, { method: 'POST', body: formData });

      if (!response.ok) throw new Error('Training algorithm failed.');

      const result = await response.json();
      onComplete({ id: docRef.id, ...projectData, status: 'trained', accuracy: result.accuracy });

    } catch (err) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center p-[var(--spacing-6)] font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      
      <div className="w-full max-w-[600px] bg-[#0D0F14] rounded-[var(--radius-xl)] border border-white/5 overflow-hidden shadow-2xl relative z-10">
        {/* Neon Progress Bar */}
        <div className="h-1 bg-white/5 w-full flex">
          {[1,2,3].map(i => (
            <div key={i} className={`flex-grow h-full transition-all duration-700 ${i <= step ? 'bg-[var(--color-accent-green)] shadow-[0_0_10px_var(--color-accent-green)]' : 'bg-transparent'}`} />
          ))}
        </div>

        <div className="p-[var(--spacing-8)] md:p-[var(--spacing-9)]">
          {step === 1 && (
            <div className="space-y-[var(--spacing-8)] fade-in-up">
              <div className="space-y-[var(--spacing-4)] text-left">
                <Badge variant="purple">Phase 01</Badge>
                <h2 className="text-4xl font-display font-bold tracking-tighter text-white">Project Identity.</h2>
                <p className="text-[#9A9A96] font-medium text-lg leading-relaxed">Assign a unique name to your specialized intelligence engine.</p>
              </div>
              <div className="space-y-[var(--spacing-8)]">
                <input 
                  type="text" autoFocus placeholder="e.g. Contract Classifier"
                  className="w-full text-3xl font-display font-bold bg-transparent border-none border-b-4 border-white/5 focus:border-[var(--color-accent-green)] pb-[var(--spacing-4)] outline-none transition-all text-white placeholder:opacity-10"
                  value={projectName} onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && projectName && setStep(2)}
                />
                <Button variant="primary" disabled={!projectName} onClick={() => setStep(2)} icon={ArrowRight} className="!h-14 px-10">Continue Protocol</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-[var(--spacing-8)] fade-in-up">
              <div className="space-y-[var(--spacing-4)] text-left">
                <Badge variant="purple">Phase 02</Badge>
                <h2 className="text-4xl font-display font-bold tracking-tighter text-white">Ingest Dataset.</h2>
                <p className="text-[#9A9A96] font-medium text-lg">Provide the raw CSV data for weight calibration.</p>
              </div>
              <div className="border-4 border-dashed border-white/5 rounded-[var(--radius-xl)] p-[var(--spacing-10)] text-center relative group hover:border-[var(--color-accent-green)]/20 transition-all cursor-pointer bg-white/[0.01]">
                <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                <div className="flex flex-col items-center gap-[var(--spacing-6)]">
                   <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-[var(--color-accent-green)] group-hover:scale-110 transition-transform"><Upload size={32} /></div>
                   <div className="space-y-[var(--spacing-2)]">
                      <p className="text-xl font-bold text-white">Select training source</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Maximum allocation: 5 megabytes</p>
                   </div>
                </div>
              </div>

              {/* Privacy Logic Toggle */}
              <div className="p-[var(--spacing-6)] bg-white/[0.02] rounded-[var(--radius-lg)] border border-white/5 flex items-center justify-between cursor-pointer group" onClick={() => setRedactPii(!redactPii)}>
                <div className="flex items-center gap-[var(--spacing-5)] text-left">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${redactPii ? 'bg-[var(--color-accent-green)] text-black' : 'bg-white/5 text-white/30'}`}>
                    <Shield size={22} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-[var(--color-accent-green)] transition-colors">PII Redaction</div>
                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.1em]">Scrub PII during ingestion</div>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-all ${redactPii ? 'bg-[var(--color-accent-green)]' : 'bg-white/10'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${redactPii ? 'left-7' : 'left-1'} shadow-sm`} />
                </div>
              </div>

              <button onClick={() => setStep(1)} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors cursor-pointer border-none bg-transparent">Backtrack</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-[var(--spacing-8)] fade-in-up">
              <div className="space-y-[var(--spacing-4)] text-left">
                <Badge variant="purple">Phase 03</Badge>
                <h2 className="text-4xl font-display font-bold tracking-tighter text-white">Map Dimensions.</h2>
                <p className="text-[#9A9A96] font-medium text-lg">Identify the source vectors and labels.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-6)]">
                <div className="space-y-[var(--spacing-3)] text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 ml-2">Training Input</label>
                  <select value={selection.text} onChange={e => setSelection({...selection, text: e.target.value})} className="w-full h-14 px-[var(--spacing-4)] bg-white/5 border border-white/5 rounded-xl font-bold text-sm outline-none focus:border-[var(--color-accent-green)] text-white">
                    <option value="">Select text column...</option>
                    {columns.map(c => <option key={c} value={c} className="bg-[#0D0F14]">{c}</option>)}
                  </select>
                </div>
                <div className="space-y-[var(--spacing-3)] text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 ml-2">Target Label</label>
                  <select value={selection.label} onChange={e => setSelection({...selection, label: e.target.value})} className="w-full h-14 px-[var(--spacing-4)] bg-white/5 border border-white/5 rounded-xl font-bold text-sm outline-none focus:border-[var(--color-accent-green)] text-white">
                    <option value="">Select result column...</option>
                    {columns.map(c => <option key={c} value={c} className="bg-[#0D0F14]">{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-[var(--spacing-7)] pt-[var(--spacing-4)]">
                {error && <div className="p-[var(--spacing-5)] bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-start gap-[var(--spacing-4)]"><AlertCircle size={18} className="shrink-0" /> <span>{error}</span></div>}
                
                <div className="flex justify-between items-center">
                  <button onClick={() => setStep(2)} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors cursor-pointer border-none bg-transparent">Backtrack</button>
                  <Button 
                    disabled={!selection.text || !selection.label || isUploading} onClick={handleComplete}
                    variant="primary" loading={isUploading} size="lg"
                    className="!bg-[var(--color-accent-green)] !text-black shadow-[0_0_20px_rgba(198,255,51,0.2)]"
                  >
                    {isUploading ? loadingMessage : 'Initialize Engine'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
