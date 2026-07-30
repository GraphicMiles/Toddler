import { useState } from 'react';
import { FlaskConical } from 'lucide-react';

const EXPERIMENTAL_KEY = 'forgeai_experimental_features';

export default function ExperimentalFeatures() {
  const [features, setFeatures] = useState(() => {
    try { return JSON.parse(localStorage.getItem(EXPERIMENTAL_KEY) || '{}'); }
    catch { return {}; }
  });

  const toggle = (key) => {
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    try { localStorage.setItem(EXPERIMENTAL_KEY, JSON.stringify(next)); }
    catch (error) { console.warn('Failed to save experimental feature settings:', error); }
  };

  const isEnabled = (key) => features[key] === true;
  const items = [
    { key: 'realTerminal', label: 'Real terminal execution', desc: 'Attempt real shell commands on supported Android builds.' },
    { key: 'realBrowser', label: 'Real browser automation', desc: 'Enable WebView-based browser control.' },
    { key: 'realResearch', label: 'Real research APIs', desc: 'Use live native research providers instead of simulated results.' },
    { key: 'realSocial', label: 'Real social posting', desc: 'Enable actual posting flows after OAuth setup.' },
    { key: 'realGitHub', label: 'Real GitHub automation', desc: 'Execute real GitHub operations with a stored token.' },
  ];

  return (
    <section className="settings-card">
      <h3><FlaskConical size={16} /> Experimental features</h3>
      <p className="setting-help first">Enable native implementations that may require platform permissions, credentials, or explicit trust.</p>
      <div className="settings-list">
        {items.map(item => (
          <label key={item.key} className="settings-toggle-row">
            <span className="settings-row-icon"><FlaskConical size={18} /></span>
            <span className="settings-toggle-copy"><strong>{item.label}</strong><small>{item.desc}</small></span>
            <input className="settings-switch" type="checkbox" checked={isEnabled(item.key)} onChange={() => toggle(item.key)} />
          </label>
        ))}
      </div>
      <p className="setting-help">Some features require native plugins or user tokens for full functionality.</p>
    </section>
  );
}
