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
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [redactPii, setRedactPii] = useState(false);

  const messages = [
    "Caramelizing onions...",
    "Finding Nemo...",
    "Seeking wisdom...",
    "Discombobulating data...",
    "Teaching the model manners...",
    "Polishing the prediction..."
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
      setError('File exceeds 5MB limit.');
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
          setStep(3); // Skip to mapping since we already have the file
        } else {
          setError('CSV appears to be empty.');
        }
      },
      error: (err) => setError('Parse error: ' + err.message)
    });
  };

  const handleComplete = async () => {
    if (!selection.text || !selection.label) {
      setError('Select both text and label columns.');
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

      if (!response.ok) throw new Error('Server side error');

      const result = await response.json();
      onComplete({ id: docRef.id, ...projectData, status: 'trained', accuracy: result.accuracy });

    } catch (err) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center p-[var(--spacing-5)] font-sans">
      <div className="w-full max-w-[640px] bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]">
        {/* Progress Tracker */}
        <div className="h-1.5 bg-[var(--color-bg-base)] w-full flex">
          {[1,2,3].map(i => (
            <div key={i} className={`flex-grow h-full transition-all duration-500 ${i <= step ? 'bg-[var(--color-accent)]' : 'bg-transparent'}`} />
          ))}
        </div>

        <div className="p-[var(--spacing-7)] md:p-[var(--spacing-8)]">
          {step === 1 && (
            <div className="space-y-[var(--spacing-7)] fade-in-up">
              <div className="space-y-[var(--spacing-3)]">
                <Badge>Step 01</Badge>
                <h2 className="text-4xl font-display font-bold tracking-tighter">Name your project.</h2>
                <p className="text-[var(--color-text-muted)] font-medium text-lg">What are you building today?</p>
              </div>
              <div className="space-y-[var(--spacing-7)]">
                <input 
                  type="text" autoFocus placeholder="e.g., Sentiment Engine"
                  className="w-full text-2xl md:text-3xl font-display font-bold border-none border-b-4 border-[var(--color-bg-base)] focus:border-[var(--color-accent)] pb-[var(--spacing-3)] outline-none transition-all"
                  value={projectName} onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && projectName && setStep(2)}
                />
                <Button disabled={!projectName} onClick={() => setStep(2)} icon={ArrowRight}>Continue</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-[var(--spacing-7)] fade-in-up">
              <div className="space-y-[var(--spacing-3)]">
                <Badge>Step 02</Badge>
                <h2 className="text-4xl font-display font-bold tracking-tighter">Upload your data.</h2>
                <p className="text-[var(--color-text-muted)] font-medium text-lg">Upload a CSV file (max 5MB, 2,000 rows).</p>
              </div>
              <div className="border-4 border-dashed border-[var(--color-bg-base)] rounded-[var(--radius-xl)] p-[var(--spacing-9)] text-center relative group hover:border-[var(--color-accent)]/20 transition-all cursor-pointer">
                <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                <div className="flex flex-col items-center gap-[var(--spacing-5)]">
                   <div className="w-16 h-16 bg-[var(--color-bg-base)] rounded-2xl flex items-center justify-center text-[var(--color-text-primary)] group-hover:scale-110 transition-transform"><Upload size={32} /></div>
                   <div className="space-y-[var(--spacing-1)]">
                      <p className="text-xl font-bold">Drop your CSV here</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">or click to browse files</p>
                   </div>
                </div>
              </div>

              {/* Privacy Engine Toggle */}
              <div className="p-[var(--spacing-5)] bg-[var(--color-bg-base)] rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] flex items-center justify-between cursor-pointer" onClick={() => setRedactPii(!redactPii)}>
                <div className="flex items-center gap-[var(--spacing-4)] text-left">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${redactPii ? 'bg-[var(--color-accent)] text-white' : 'bg-white text-[var(--color-text-muted)]'}`}>
                    <Shield size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold">PII Redaction</div>
                    <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Auto-scrub sensitive data</div>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-all ${redactPii ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-subtle)]'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${redactPii ? 'left-7' : 'left-1'}`} />
                </div>
              </div>

              <button onClick={() => setStep(1)} className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer border-none bg-transparent">Go Back</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-[var(--spacing-7)] fade-in-up">
              <div className="space-y-[var(--spacing-3)]">
                <Badge>Step 03</Badge>
                <h2 className="text-4xl font-display font-bold tracking-tighter">Map your data.</h2>
                <p className="text-[var(--color-text-muted)] font-medium text-lg">Identify text and label columns.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-5)]">
                <div className="space-y-[var(--spacing-2)] text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Input Column</label>
                  <select value={selection.text} onChange={e => setSelection({...selection, text: e.target.value})} className="w-full h-14 px-[var(--spacing-4)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl font-bold text-sm outline-none focus:border-[var(--color-text-primary)]">
                    <option value="">Select text...</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-[var(--spacing-2)] text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Result Label</label>
                  <select value={selection.label} onChange={e => setSelection({...selection, label: e.target.value})} className="w-full h-14 px-[var(--spacing-4)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl font-bold text-sm outline-none focus:border-[var(--color-text-primary)]">
                    <option value="">Select label...</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-[var(--spacing-5)] pt-[var(--spacing-5)]">
                {error && <div className="p-[var(--spacing-4)] bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-start gap-[var(--spacing-3)]"><AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{error}</span></div>}
                
                <div className="flex justify-between items-center">
                  <button onClick={() => setStep(2)} className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer border-none bg-transparent">Go Back</button>
                  <Button 
                    disabled={!selection.text || !selection.label || isUploading} onClick={handleComplete}
                    variant="accent" loading={isUploading}
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
