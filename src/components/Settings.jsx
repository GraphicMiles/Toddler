import { useState } from 'react';
import { RefreshCw, Trash2, Wifi } from 'lucide-react';
import './Settings.css';

export default function Settings({ endpoint, onEndpointChange, onClearChat, onReset, smartMode, onSmartModeChange, isNative = false, localServerStatus = null }) {
  const [value, setValue] = useState(endpoint);
  const save = () => { const next = value.trim().replace(/\/$/, ''); if (!next) return; localStorage.setItem('forgeai_endpoint', next); onEndpointChange?.(next); };
  return <div className="settings-screen"><div className="screen-pad">
    <div className="section-head"><h2>User & Settings</h2><p>Runtime, privacy, and device diagnostics</p></div>
    <section className="settings-card"><h3><Wifi size={16}/> Ollama runtime</h3><label className="setting-label" htmlFor="ollama-endpoint">Endpoint</label><div className="setting-row"><input id="ollama-endpoint" value={value} onChange={e=>setValue(e.target.value)} placeholder="http://localhost:11434"/><button onClick={save}><RefreshCw size={14}/> Save</button></div><p className="setting-help">Use a reachable Ollama server. Browser requests may require CORS configuration.</p></section>
    <section className="settings-card"><h3>Local data</h3><p className="setting-help">Chats and model metadata stay locally. Android offline model files are stored in app-private storage; Ollama is optional on web.</p><div className="setting-row"><button onClick={onClearChat}>Clear chat history</button><button className="danger" onClick={onReset}><Trash2 size={14}/> Reset app data</button></div></section>
    <section className="settings-card">
      <h3>Diagnostics</h3>
      <p className="setting-help">Platform: {typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() || 'web'} · Storage scope: browser quota on web</p>
      
      {/* Local Server Debug Panel */}
      {isNative && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Local Server Debug</span>
            <span style={{ 
              padding: '2px 8px', 
              borderRadius: '9999px', 
              fontSize: '11px',
              background: localServerStatus?.running ? '#166534' : '#374151',
              color: localServerStatus?.running ? '#86efac' : '#9ca3af'
            }}>
              {localServerStatus?.running ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          
          <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5' }}>
            <div>Port: <span className="mono">{localServerStatus?.port || 8080}</span></div>
            <div>Model: <span className="mono">{localServerStatus?.model || 'None mounted'}</span></div>
            <div>Status: {localServerStatus?.running ? 'Connected to llama-server' : 'No local inference running'}</div>
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
