import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Upload, X, Check, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { auth, db, storage } from './firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selection, setSelection] = useState({ text: '', label: '' });
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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
      header: true,
      preview: 10,
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
      // 1. Upload file to Storage
      const storageRef = ref(storage, `datasets/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // 2. Create Project in Firestore
      const projectData = {
        ownerUid: auth.currentUser.uid,
        name: projectName,
        createdAt: new Date(),
        status: 'empty',
        dataset: {
          fileUrl,
          textColumn: selection.text,
          labelColumn: selection.label,
          rowCount: csvData.length // This is just the preview count, in real use we'd count full file
        }
      };

      const docRef = await addDoc(collection(db, "projects"), projectData);
      onComplete({ id: docRef.id, ...projectData });
    } catch (err) {
      setError('Failed to save project: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-toddler-off-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg border border-toddler-black/5 shadow-sm overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-toddler-black/5 w-full">
          <motion.div 
            className="h-full bg-toddler-green"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="font-display text-3xl font-bold mb-2">Name your project</h2>
                  <p className="text-toddler-black/60">What are you building today?</p>
                </div>
                <div>
                  <input 
                    type="text"
                    placeholder="e.g., Customer Sentiment Classifier"
                    autoFocus
                    className="w-full text-2xl font-display font-bold border-b-2 border-toddler-black/10 py-2 focus:outline-none focus:border-toddler-green transition-colors"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && projectName && nextStep()}
                  />
                </div>
                <button 
                  disabled={!projectName}
                  onClick={nextStep}
                  className="bg-toddler-green text-white px-8 py-3 rounded-sm font-bold disabled:opacity-30 flex items-center gap-2"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="font-display text-3xl font-bold mb-2">Upload your data</h2>
                  <p className="text-toddler-black/60">Upload a CSV file (max 5MB, up to 2,000 rows).</p>
                </div>
                
                <div className="border-2 border-dashed border-toddler-black/10 rounded-lg p-12 text-center hover:border-toddler-green transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".csv"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />
                  <div className="flex flex-col items-center">
                    <Upload className="text-toddler-black/20 mb-4" size={48} />
                    <p className="font-medium">Drop your CSV here or click to browse</p>
                    <p className="text-xs text-toddler-black/40 mt-2 uppercase tracking-widest font-bold">CSV only · Max 5MB</p>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded text-sm">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <button onClick={prevStep} className="text-toddler-black/40 font-bold text-sm uppercase tracking-widest hover:text-toddler-black transition-colors">
                  Back
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="font-display text-3xl font-bold mb-2">Select your columns</h2>
                  <p className="text-toddler-black/60">Tell Toddler which column contains the text to analyze and which contains the result label.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-toddler-black/40 uppercase tracking-widest">Text Column</label>
                    <select 
                      className="w-full p-3 border border-toddler-black/10 rounded focus:outline-none focus:border-toddler-green bg-white text-sm"
                      value={selection.text}
                      onChange={(e) => setSelection({ ...selection, text: e.target.value })}
                    >
                      <option value="">Select text column...</option>
                      {columns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-toddler-black/40 uppercase tracking-widest">Label Column</label>
                    <select 
                      className="w-full p-3 border border-toddler-black/10 rounded focus:outline-none focus:border-toddler-green bg-white text-sm"
                      value={selection.label}
                      onChange={(e) => setSelection({ ...selection, label: e.target.value })}
                    >
                      <option value="">Select label column...</option>
                      {columns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-toddler-black/5 rounded overflow-hidden">
                  <div className="bg-toddler-off-white px-4 py-2 border-b border-toddler-black/5 text-[10px] font-bold uppercase tracking-widest text-toddler-black/30">Preview (First 5 rows)</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-toddler-off-white/50 border-b border-toddler-black/5">
                          {columns.slice(0, 3).map(col => <th key={col} className="p-3 font-bold">{col}</th>)}
                          {columns.length > 3 && <th className="p-3">...</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-toddler-black/5">
                            {columns.slice(0, 3).map(col => <td key={col} className="p-3 truncate max-w-[150px]">{row[col]}</td>)}
                            {columns.length > 3 && <td className="p-3 text-toddler-black/20">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button onClick={prevStep} className="text-toddler-black/40 font-bold text-sm uppercase tracking-widest hover:text-toddler-black transition-colors">
                    Back
                  </button>
                  <button 
                    disabled={!selection.text || !selection.label || isUploading}
                    onClick={handleComplete}
                    className="bg-toddler-green text-white px-8 py-3 rounded-sm font-bold disabled:opacity-30 flex items-center gap-2"
                  >
                    {isUploading ? 'Creating...' : 'Finish setup'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
