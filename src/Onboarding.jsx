import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { auth, db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const vibrate = (style = ImpactStyle.Medium) => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style }).catch(() => {});
};

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [modelType, setModelType] = useState('text'); // 'text', 'vision', 'generative'
  
  // Text & Generative state
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selection, setSelection] = useState({ text: '', label: '', systemPrompt: '' });
  
  // Vision state
  const [imageFiles, setImageFiles] = useState([]);
  const [visionLabels, setVisionLabels] = useState([]);
  
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Protocol...');
  const [redactPii, setRedactPii] = useState(false);

  const messages = ["Caramelizing onions...", "Finding Nemo...", "Seeking wisdom...", "Teaching the model...", "Polishing weights..."];

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

  // Refs for cleanup
  const pollIntervalRef = React.useRef(null);
  const genIntervalRef = React.useRef(null);

  useEffect(() => () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (genIntervalRef.current) clearInterval(genIntervalRef.current);
  }, []);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    // Server caps CSV at ~750KB (Firestore 1MB doc after base64). Surface a
    // soft 5MB limit here so users see a friendly error before the server
    // rejects it; larger files should use signed Cloud Storage uploads.
    if (selectedFile.size > 5 * 1024 * 1024) { setError('File too large for web upload. Max 5MB.'); return; }
    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          setCsvData(results.data); setColumns(Object.keys(results.data[0]));
          setError(''); setStep(3);
        } else { setError('Detected empty CSV file.'); }
      },
      error: (err) => setError('System parse error: ' + err.message)
    });
  };

  const handleImageFolderUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) {
      setError('No valid images found in the selected folder.');
      return;
    }
    
    // Enforce 1000 image cap for free tier (Pro users train in cloud — handled by server)
    if (files.length > 1000) {
      const ramGb = (navigator.deviceMemory || 4);
      const estRamMb = Math.max(200, Math.round(2.5 * files.length + 180));
      const deviceCanHandle = (ramGb * 1024 * 0.45) >= estRamMb && files.length <= 2000;
      if (!deviceCanHandle) {
        setError(`Free tier is capped at 1000 images. You selected ${files.length} images, which needs ~${estRamMb} MB training RAM — your ${ramGb} GB device can't handle it. Upgrade to Pro for cloud training.`);
        return;
      }
      // Device can technically handle it, but still warn; Pro upsell handled server-side
    }

    // Extract unique folder names as labels (e.g., foldername/image.jpg)
    const labels = [...new Set(files.map(f => {
      const parts = f.webkitRelativePath.split('/');
      return parts.length > 1 ? parts[parts.length - 2] : 'unknown';
    }))].filter(l => l !== 'unknown');

    if (labels.length < 2) {
      setError('Vision models require at least 2 categories (folders).');
      return;
    }

    setImageFiles(files);
    setVisionLabels(labels);
    setError('');
    setStep(3);
  };

    const handleComplete = async () => {
    setIsUploading(true); setError('');
    try {
      const projectData = {
        ownerUid: auth.currentUser.uid,
        name: projectName,
        type: modelType,
        createdAt: new Date(),
        status: 'queued',
        health: 'Pending',
        version: 1,
      };

      if (modelType === 'text') {
        if (!selection.text || !selection.label) throw new Error('Column mapping incomplete.');
        projectData.redactPii = redactPii;
        projectData.dataset = { textColumn: selection.text, labelColumn: selection.label, rowCount: csvData ? csvData.length : 0 };
      } else if (modelType === 'generative') {
        if (!selection.text || !selection.label) throw new Error('Generative mapping incomplete.');
        projectData.dataset = { promptColumn: selection.text, completionColumn: selection.label, systemPrompt: selection.systemPrompt, rowCount: csvData ? csvData.length : 0 };
      } else if (modelType === 'vision') {
        projectData.labels = visionLabels;
        projectData.dataset = { imageCount: imageFiles.length, categories: visionLabels.length };
      }

      const docRef = await addDoc(collection(db, "projects"), projectData);

      // Phase 2: Secure Cloud Storage Upload Hand-off
      const { uploadDatasetToCloudinary } = await import('./cloud');
      
      let datasetUrl = null;
      if (modelType === 'text' || modelType === 'generative') {
        if (!file) throw new Error("Dataset file is missing.");
        setLoadingMessage('Uploading dataset to secured storage...');
        datasetUrl = await uploadDatasetToCloudinary(file);
      } else if (modelType === 'vision') {
        // Zip images or notify user. For the scope of this update, we set a placeholder dataset_ref 
        // because native mobile BYOC expects an image ZIP or structured blob. 
        datasetUrl = "pending_vision_zip_upload"; 
      }

      await updateDoc(docRef, { datasetUrl });

      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) {
         setLoadingMessage('Waking training workers...');
         const token = await auth.currentUser?.getIdToken();
         const formData = new FormData();
         formData.append('project_id', docRef.id);
         formData.append('dataset_url', datasetUrl);
         if (modelType === 'text') {
            formData.append('text_column', selection.text);
            formData.append('label_column', selection.label);
         }
         await fetch(`${apiUrl}/train`, { 
             method: 'POST', 
             headers: { 'Authorization': `Bearer ${token}` },
             body: formData
         }).catch(() => {}); // fire and forget
      }

      setIsUploading(false);
      vibrate(ImpactStyle.Heavy);
      onComplete({ id: docRef.id, ...projectData, status: 'queued', datasetUrl, labels: visionLabels || [], responses: {} });
    } catch (err) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-8 font-sans text-[var(--text)]">
      <div className="w-full max-w-[600px] panel !p-0 overflow-hidden shadow-2xl">
        <div className="flex bg-[var(--surface-2)] border-b border-[var(--line)]">
          {[1,2,3].map(i => (
            <div key={i} className={`flex-1 h-1 transition-colors ${i <= step ? 'bg-[var(--accent-lime)]' : 'bg-transparent'}`} />
          ))}
        </div>

        <div className="p-12 md:p-16">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in zoom-in duration-300">
              <div>
                <div className="eyebrow"><span className="dot"></span>Phase 01</div>
                <h2 className="text-3xl font-display font-bold mt-4">Project Identity.</h2>
                <p className="text-[var(--text-dim)] mt-2">Assign a unique name to your specialized intelligence engine.</p>
              </div>
              <input 
                type="text" autoFocus placeholder="e.g. Sentiment Engine"
                className="input-field !text-2xl !font-display !font-bold !bg-transparent !border-x-0 !border-t-0 !border-b-2 !px-0"
                value={projectName} onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && projectName && setStep(2)}
              />
              <button className="btn btn-solid w-full mt-4" disabled={!projectName} onClick={() => setStep(2)}>Continue Protocol →</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in zoom-in duration-300">
              <div>
                <div className="eyebrow"><span className="dot"></span>Phase 02</div>
                <h2 className="text-3xl font-display font-bold mt-4">Ingest Dataset.</h2>
                <p className="text-[var(--text-dim)] mt-2">Select the data modality and provide the raw inputs.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  className={`p-4 border ${modelType === 'text' ? 'border-[var(--accent-lime)] bg-[var(--accent-lime)]/10 text-[var(--accent-lime)]' : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-dim)]'} text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2`}
                  onClick={() => { setModelType('text'); setError(''); setFile(null); setCsvData(null); setColumns([]); setSelection({text:'',label:'',systemPrompt:''}); }}
                >
                  <span className="font-mono text-sm uppercase">Classification</span>
                  <span className="text-[10px] uppercase text-[var(--text-faint)]">Text Data</span>
                </button>
                <button 
                  className={`p-4 border ${modelType === 'generative' ? 'border-[var(--accent-lime)] bg-[var(--accent-lime)]/10 text-[var(--accent-lime)]' : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-dim)]'} text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2`}
                  onClick={() => { setModelType('generative'); setError(''); setFile(null); setCsvData(null); setColumns([]); setSelection({text:'',label:'',systemPrompt:''}); }}
                >
                  <span className="font-mono text-sm uppercase">Generative</span>
                  <span className="text-[10px] uppercase text-[var(--text-faint)]">Fine-Tune LLM</span>
                </button>
                <button 
                  className={`p-4 border ${modelType === 'vision' ? 'border-[var(--accent-lime)] bg-[var(--accent-lime)]/10 text-[var(--accent-lime)]' : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-dim)]'} text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2`}
                  onClick={() => { setModelType('vision'); setError(''); setFile(null); setCsvData(null); setColumns([]); setImageFiles([]); setVisionLabels([]); setSelection({text:'',label:'',systemPrompt:''}); }}
                >
                  <span className="font-mono text-sm uppercase">Vision</span>
                  <span className="text-[10px] uppercase text-[var(--text-faint)]">Image Data</span>
                </button>
              </div>

              {modelType === 'text' || modelType === 'generative' ? (
                <>
                  <div className="border-2 border-dashed border-[var(--line)] bg-[var(--surface-2)] p-12 text-center relative hover:border-[var(--accent-lime)] transition-colors cursor-pointer">
                    <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                    <div className="font-mono text-sm text-[var(--accent-lime)]">Select training source (.csv)</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-[var(--line)] bg-[var(--surface-2)]">
                    <div>
                      <div className="font-bold text-sm">PII Redaction</div>
                      <div className="text-[10px] font-mono text-[var(--text-dim)] uppercase mt-1">Auto-scrub sensitive data</div>
                    </div>
                    <button 
                      className={`w-12 h-6 rounded-full relative transition-colors ${redactPii ? 'bg-[var(--accent-lime)]' : 'bg-[var(--line)]'}`}
                      onClick={() => setRedactPii(!redactPii)}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${redactPii ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="border-2 border-dashed border-[var(--line)] bg-[var(--surface-2)] p-12 text-center relative hover:border-[var(--accent-lime)] transition-colors cursor-pointer">
                  <input type="file" webkitdirectory="" directory="" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageFolderUpload} />
                  <div className="font-mono text-sm text-[var(--accent-lime)] mb-2">Select Image Folder</div>
                  <div className="text-[10px] text-[var(--text-dim)]">Must contain sub-folders for each category. Max 1000 images on free tier.</div>
                </div>
              )}
              
              {error && <div className="text-[var(--danger)] text-sm font-mono border border-[var(--danger)] p-3 bg-[var(--danger)]/10">{error}</div>}
              
              <button onClick={() => setStep(1)} className="btn-ghost !text-xs font-mono">← Backtrack</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in zoom-in duration-300">
              <div>
                <div className="eyebrow"><span className="dot"></span>Phase 03</div>
                <h2 className="text-3xl font-display font-bold mt-4">Map Dimensions.</h2>
                <p className="text-[var(--text-dim)] mt-2">
                  {modelType === 'vision' ? 'Review parsed image categories.' : 'Identify the source vectors and formats.'}
                </p>
              </div>

              {modelType === 'text' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Text Column</label>
                    <select value={selection.text} onChange={e => setSelection({...selection, text: e.target.value})} className="input-field">
                      <option value="">Select...</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Label Column</label>
                    <select value={selection.label} onChange={e => setSelection({...selection, label: e.target.value})} className="input-field">
                      <option value="">Select...</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              ) : modelType === 'generative' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="input-label">System Prompt (Optional Hardcoded Context)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. You are a helpful technical assistant..." 
                      value={selection.systemPrompt} 
                      onChange={e => setSelection({...selection, systemPrompt: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="input-label">User Input Column</label>
                    <select value={selection.text} onChange={e => setSelection({...selection, text: e.target.value})} className="input-field">
                      <option value="">Select Prompt Column...</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Assistant Response Column</label>
                    <select value={selection.label} onChange={e => setSelection({...selection, label: e.target.value})} className="input-field">
                      <option value="">Select Completion Column...</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--surface-2)] border border-[var(--line)] p-6">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--line)]">
                    <span className="font-mono text-sm text-[var(--text-dim)]">Total Images</span>
                    <span className="font-mono text-[var(--accent-lime)]">{imageFiles.length}</span>
                  </div>
                  <div className="input-label mb-2">Detected Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {visionLabels.map(label => (
                      <span key={label} className="font-mono text-xs px-3 py-1 bg-[var(--bg)] border border-[var(--line)]">{label}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {error && <div className="text-[var(--danger)] text-sm font-mono border border-[var(--danger)] p-3 bg-[var(--danger)]/10">{error}</div>}
              
              <div className="flex justify-between items-center mt-8">
                <button onClick={() => setStep(2)} className="btn-ghost !text-xs font-mono">← Backtrack</button>
                <button
                  className="btn btn-solid"
                  disabled={
                    isUploading ||
                    (modelType === 'text' && (!selection.text || !selection.label)) ||
                    (modelType === 'generative' && (!selection.text || !selection.label)) ||
                    (modelType === 'vision' && visionLabels.length < 2)
                  }
                  onClick={handleComplete}
                >
                  {isUploading ? loadingMessage : 'Initialize Engine'}
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
