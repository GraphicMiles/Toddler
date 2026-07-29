import { useState } from 'react';

const EXPERIMENTAL_KEY = 'forgeai_experimental_features';

export default function ExperimentalFeatures() {
  const [features, setFeatures] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(EXPERIMENTAL_KEY) || '{}');
    } catch {
      return {};
    }
  });

  const toggle = (key) => {
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    localStorage.setItem(EXPERIMENTAL_KEY, JSON.stringify(next));
  };

  const isEnabled = (key) => features[key] === true;

  return (
    <section className="settings-card">
      <h3>🧪 Experimental Features</h3>
      <p className="setting-help">
        Enable real implementations for Terminal, Browser, Research, Social, and GitHub.
        These may require permissions or tokens.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {[
          { key: 'realTerminal', label: 'Real Terminal Execution', desc: 'Attempt real shell commands (limited on Android)' },
          { key: 'realBrowser', label: 'Real Browser Automation', desc: 'Enable WebView-based browser control' },
          { key: 'realResearch', label: 'Real Research APIs', desc: 'Use live web search instead of simulated results' },
          { key: 'realSocial', label: 'Real Social Media Posting', desc: 'Enable actual posting (requires OAuth setup)' },
          { key: 'realGitHub', label: 'Real GitHub Automation', desc: 'Execute real commits and PRs with token' },
        ].map(item => (
          <label key={item.key} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            background: isEnabled(item.key) ? '#1e3a8a' : '#111827',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={isEnabled(item.key)}
              onChange={() => toggle(item.key)}
              style={{ marginTop: '4px' }}
            />
            <div>
              <div style={{ fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{item.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <p style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
        Note: Some features require native plugins or user tokens for full functionality.
      </p>
    </section>
  );
}
