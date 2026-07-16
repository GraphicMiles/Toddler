import React, { useState } from 'react';
import { ArrowRight, Upload, X, Check, AlertCircle } from 'lucide-react';
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
      // Create Project in Firestore (No storage for now, we'll send file to backend directly later)
      const projectData = {
        ownerUid: auth.currentUser.uid,
        name: projectName,
        createdAt: new Date(),
        status: 'empty',
        dataset: {
          textColumn: selection.text,
          labelColumn: selection.label,
          rowCount: csvData ? csvData.length : 0
        }
      };

      const docRef = await addDoc(collection(db, "projects"), projectData);
      onComplete({ id: docRef.id, ...projectData });
    } catch (err) {
      console.error(err);
      setError('Failed to save project: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#FAFAF8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'sans-serif'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid #E5E4E0',
    overflow: 'hidden'
  };

  const contentStyle = {
    padding: '48px'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Simple Progress Bar */}
        <div style={{ height: '4px', backgroundColor: '#E5E4E0', width: '100%' }}>
          <div style={{ height: '100%', backgroundColor: '#1B4332', width: `${(step / 3) * 100}%`, transition: 'width 0.3s ease' }} />
        </div>

        <div style={contentStyle}>
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Name your project</h2>
              <p style={{ color: '#6B6B68', marginBottom: '32px' }}>What are you building today?</p>
              <input 
                type="text"
                placeholder="e.g., Sentiment Classifier"
                style={{ width: '100%', fontSize: '24px', fontWeight: 'bold', border: 'none', borderBottom: '2px solid #E5E4E0', padding: '8px 0', marginBottom: '32px', outline: 'none' }}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && projectName && nextStep()}
              />
              <button 
                disabled={!projectName}
                onClick={nextStep}
                style={{ backgroundColor: '#111111', color: 'white', padding: '12px 32px', borderRadius: '9999px', border: 'none', fontWeight: 'bold', opacity: projectName ? 1 : 0.3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Upload your data</h2>
              <p style={{ color: '#6B6B68', marginBottom: '32px' }}>CSV file (max 5MB, up to 2,000 rows).</p>
              
              <div style={{ border: '2px dashed #E5E4E0', borderRadius: '12px', padding: '48px', textAlign: 'center', position: 'relative', marginBottom: '24px' }}>
                <input 
                  type="file" accept=".csv"
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  onChange={handleFileUpload}
                />
                <Upload style={{ color: '#E5E4E0', marginBottom: '16px' }} size={48} />
                <p style={{ fontWeight: 'bold' }}>Drop your CSV here</p>
              </div>

              {error && <div style={{ color: '#B91C1C', backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

              <button onClick={prevStep} style={{ background: 'none', border: 'none', fontWeight: 'bold', color: '#6B6B68', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Back</button>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Select columns</h2>
              <p style={{ color: '#6B6B68', marginBottom: '32px' }}>Identify the text and label columns.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6B6B68' }}>Text Column</label>
                  <select 
                    value={selection.text} onChange={e => setSelection({...selection, text: e.target.value})}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #E5E4E0', backgroundColor: 'white' }}
                  >
                    <option value="">Select...</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6B6B68' }}>Label Column</label>
                  <select 
                    value={selection.label} onChange={e => setSelection({...selection, label: e.target.value})}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #E5E4E0', backgroundColor: 'white' }}
                  >
                    <option value="">Select...</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={prevStep} style={{ background: 'none', border: 'none', fontWeight: 'bold', color: '#6B6B68', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Back</button>
                <button 
                  disabled={!selection.text || !selection.label || isUploading}
                  onClick={handleComplete}
                  style={{ backgroundColor: '#1B4332', color: 'white', padding: '12px 32px', borderRadius: '9999px', border: 'none', fontWeight: 'bold', cursor: 'pointer', opacity: isUploading ? 0.5 : 1 }}
                >
                  {isUploading ? '...' : 'Finish setup'}
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
