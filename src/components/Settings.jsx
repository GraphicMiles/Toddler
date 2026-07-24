import { useState } from 'react';
import { RefreshCw, Trash2, Wifi } from 'lucide-react';
import './Settings.css';

export default function Settings({ endpoint, onEndpointChange, onClearChat, onReset }) {
  const [value, setValue] = useState(endpoint);
  const save = () => { const next = value.trim().replace(/\/$/, ''); if (!next) return; localStorage.setItem('forgeai_endpoint', next); onEndpointChange?.(next); };
  return <div className="settings-screen"><div className="screen-pad">
    <div className="section-head"><h2>User & Settings</h2><p>Runtime, privacy, and device diagnostics</p></div>
    <section className="settings-card"><h3><Wifi size={16}/> Ollama runtime</h3><label className="setting-label" htmlFor="ollama-endpoint">Endpoint</label><div className="setting-row"><input id="ollama-endpoint" value={value} onChange={e=>setValue(e.target.value)} placeholder="http://localhost:11434"/><button onClick={save}><RefreshCw size={14}/> Save</button></div><p className="setting-help">Use a reachable Ollama server. Browser requests may require CORS configuration.</p></section>
    <section className="settings-card"><h3>Local data</h3><p className="setting-help">Chats and model metadata stay locally. Android offline model files are stored in app-private storage; Ollama is optional on web.</p><div className="setting-row"><button onClick={onClearChat}>Clear chat history</button><button className="danger" onClick={onReset}><Trash2 size={14}/> Reset app data</button></div></section>
    <section className="settings-card"><h3>Diagnostics</h3><p className="setting-help">Platform: {typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() || 'web'} · Storage scope: browser quota on web</p></section>
  </div></div>;
}
