import React, { useState } from 'react';
import { ArrowRight, Upload, X, Check, AlertCircle, Database, ChevronRight } from 'lucide-react';
import Papa from 'papaparse';
import { auth, db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

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

  const messages = [
    "Caramelizing onions...",
    "Finding Nemo...",
    "Seeking wisdom...",
    "Discombobulating data...",
    "Teaching the model some manners...",
    "Polishing the prediction..."
  ];

  React.useEffect(() => {
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

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
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
          nextStep();
        } else {
          setError('CSV appears to be empty.');
        }
      },
      error: (err) => setError('Failed to parse CSV: ' + err.message)
    });
  };

  const handleComplete = async () => {
    if (!selection.text || !selection.label) {
      setError('Please select both text and label columns.');
      return;
    }
    setIsUploading(true);
    try {
      const projectData = {
        ownerUid: auth.currentUser.uid,
        name: projectName,
        createdAt: new Date(),
        status: 'training',
        dataset: { textColumn: selection.text, labelColumn: selection.label, rowCount: csvData ? csvData.length : 0 }
      };
      const docRef = await addDoc(collection(db, "projects"), projectData);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', docRef.id);
      formData.append('text_column', selection.text);
      formData.append('label_column', selection.label);

      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/train`, { method: 'POST', body: formData });

      if (!response.ok) throw new Error('Training failed on server');

      const result = await response.json();
      onComplete({ id: docRef.id, ...projectData, status: 'trained', accuracy: result.accuracy });

    } catch (err) {
      console.error(err);
      setError('Failed to process model: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-[32px] border-2 border-black/5 overflow-hidden">
        <div className="h-1.5 bg-[#FAFAF8] w-full flex">
          {[1,2,3].map(i => (
            <div key={i} className={`flex-grow h-full transition-all duration-500 ${i <= step ? 'bg-[#1B4332]' : 'bg-transparent'}`} />
          ))}
        </div>

        <div className="p-12 md:p-16">
          {step === 1 && (
            <div className="space-y-12">
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#6B6B68]">Step 01</span>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">Name your project.</h2>
                <p className="text-[#6B6B68] font-medium text-lg">What type of intelligence are you building today?</p>
              </div>
              <div className="space-y-8">
                <input 
                  type="text" autoFocus placeholder="e.g., Support Ticket Classifier"
                  className="w-full text-2xl md:text-3xl font-bold border-none border-b-4 border-[#FAFAF8] focus:border-[#1B4332] pb-4 outline-none transition-all"
                  value={projectName} onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && projectName && nextStep()}
                />
                <button 
                  disabled={!projectName} onClick={nextStep}
                  className="bg-black text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest text-xs border-2 border-black hover:bg-transparent hover:text-black transition-all disabled:opacity-20 cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-12">
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#6B6B68]">Step 02</span>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">Upload your data.</h2>
                <p className="text-[#6B6B68] font-medium text-lg">Upload a CSV file (max 5MB, up to 2,000 rows).</p>
              </div>
              <div className="border-4 border-dashed border-[#FAFAF8] rounded-3xl p-16 text-center relative group hover:border-[#1B4332]/20 transition-all cursor-pointer">
                <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                <div className="flex flex-col items-center gap-6">
                   <div className="w-20 h-20 bg-[#FAFAF8] rounded-2xl flex items-center justify-center text-black group-hover:scale-110 transition-transform"><Upload size={32} /></div>
                   <div className="space-y-1">
                      <p className="text-xl font-bold">Drop your CSV here</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B68]">or click to browse local files</p>
                   </div>
                </div>
              </div>
              {error && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center gap-3"><AlertCircle size={18} /> {error}</div>}
              <button onClick={prevStep} className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] hover:text-black transition-colors cursor-pointer border-none bg-transparent">Go Back</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-12">
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#6B6B68]">Step 03</span>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">Map your columns.</h2>
                <p className="text-[#6B6B68] font-medium text-lg">Identify which columns contain the training data.</p>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B68] ml-1">Text Input Column</label>
                  <select value={selection.text} onChange={e => setSelection({...selection, text: e.target.value})} className="w-full h-14 px-4 bg-[#FAFAF8] border border-[#E5E4E0] rounded-xl font-bold text-sm">
                    <option value="">Select column...</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B68] ml-1">Result Label Column</label>
                  <select value={selection.label} onChange={e => setSelection({...selection, label: e.target.value})} className="w-full h-14 px-4 bg-[#FAFAF8] border border-[#E5E4E0] rounded-xl font-bold text-sm">
                    <option value="">Select column...</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center pt-8">
                <button onClick={prevStep} className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] hover:text-black transition-colors cursor-pointer border-none bg-transparent">Go Back</button>
                <button 
                  disabled={!selection.text || !selection.label || isUploading} onClick={handleComplete}
                  className="bg-[#1B4332] text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest text-xs border-2 border-[#1B4332] hover:bg-transparent hover:text-[#1B4332] transition-all disabled:opacity-20 cursor-pointer flex items-center gap-4"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {loadingMessage}
                    </>
                  ) : 'Initialize Workspace'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
