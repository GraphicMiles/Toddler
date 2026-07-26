import { useState } from 'react';
import { RefreshCw, Trash2, Wifi } from 'lucide-react';
import './Settings.css';

export default function Settings({ 
  endpoint, 
  onEndpointChange, 
  onClearChat, 
  onReset, 
  smartMode, 
  onSmartModeChange, 
  isNative = false, 
  localServerStatus = null 
}) {
  const [value, setValue] = useState(endpoint);
  const save = () => { const next = value.trim().replace(/\/$/, ''); if (!next) return; localStorage.setItem('forgeai_endpoint', next); onEndpointChange?.(next); };
  return <div className="settings-screen"><div className="screen-pad">
    <div className="section-head"><h2>User & Settings</h2><p>Runtime, privacy, and device diagnostics</p></div>
    <section className="settings-card"><h3><Wifi size={16}/> Ollama runtime</h3><label className="setting-label" htmlFor="ollama-endpoint">Endpoint</label><div className="setting-row"><input id="ollama-endpoint" value={value} onChange={e=>setValue(e.target.value)} placeholder="http://localhost:11434"/><button onClick={save}><RefreshCw size={14}/> Save</button></div><p className="setting-help">Use a reachable Ollama server. Browser requests may require CORS configuration.</p></section>
    <section className="settings-card"><h3>Local data</h3><p className="setting-help">Chats and model metadata stay locally. Android offline model files are stored in app-private storage; Ollama is optional on web.</p><div className="setting-row"><button onClick={onClearChat}>Clear chat history</button><button className="danger" onClick={onReset}><Trash2 size={14}/> Reset app data</button></div></section>
    <section className="settings-card">
      <h3>Diagnostics</h3>
      <p className="setting-help">Platform: {typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() || 'web'} · Storage scope: browser quota on web</p>
      
      {/* Local Server Debug Panel - Enhanced for Testing */}
      {isNative && (
        <div style={{ marginTop: '16px', padding: '14px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Local Server Debug</span>
              <span style={{ 
                padding: '3px 10px', 
                borderRadius: '9999px', 
                fontSize: '11px',
                background: localServerStatus?.running ? '#166534' : '#334155',
                color: localServerStatus?.running ? '#86efac' : '#94a3b8'
              }}>
                {localServerStatus?.running ? 'RUNNING' : 'STOPPED'}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            <div><strong>Port:</strong> <span className="mono">{localServerStatus?.port || 8080}</span></div>
            <div><strong>Model:</strong> <span className="mono" style={{ wordBreak: 'break-all' }}>{localServerStatus?.model || 'None mounted'}</span></div>
            <div><strong>Status:</strong> {localServerStatus?.running ? 'llama-server is active' : 'No local server running'}</div>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                // This would trigger mount logic from parent if exposed
                alert('Use the Mount button in My Collection to test');
              }}
              style={{ 
                padding: '6px 12px', 
                fontSize: '12px',
                background: '#1e2937',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#e2e8f0'
              }}
            >
              Test Mount
            </button>
            <button 
              onClick={() => {
                alert('Check the console (Logcat) for detailed logs from LlamaServerService');
              }}
              style={{ 
                padding: '6px 12px', 
                fontSize: '12px',
                background: '#1e2937',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#e2e8f0'
              }}
            >
              View Logs
            </button>
          </div>

          <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
            Tip: If the server fails to start, check that <code>libllama-server.so</code> exists in <code>jniLibs/arm64-v8a/</code>
          </div>
        </div>
      )}

      <div style={{ marginTop: '12px', padding: '10px', background: '#1f2937', borderRadius: '6px' }}>
        <div style={{ fontSize: '13px', color: '#f59e0b' }}>
          ⚠️ On-device inference (local models without Ollama) is currently in development.
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
          The app currently uses Ollama for best reliability. True offline inference via MLC-LLM or llama-server is planned.
        </div>
      </div>
    </section>
  </div></div>;
}
