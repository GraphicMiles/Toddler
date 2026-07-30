import { useState } from 'react';
import { researchProvider, RESEARCH_DEPTH } from '../research/ResearchProvider.js';
import { Archive, Globe, Search, Shield } from 'lucide-react';
import DropdownMenu from './DropdownMenu.jsx';

export default function ResearchSettings() {
  const [depth, setDepth] = useState(researchProvider.depth);
  const [archiveMode, setArchiveMode] = useState(researchProvider.archiveMode);
  const [sourceVerification, setSourceVerification] = useState(researchProvider.sourceVerification);
  const [proxyEnabled, setProxyEnabled] = useState(researchProvider.proxyEnabled);
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem('forgeai_research_proxy_url') || '');

  const updateDepth = (newDepth) => { researchProvider.setDepth(newDepth); setDepth(newDepth); };
  const updateArchive = (value) => { researchProvider.setArchiveMode(value); setArchiveMode(value); };
  const updateVerification = (value) => { researchProvider.setSourceVerification(value); setSourceVerification(value); };
  const updateProxy = (value) => { researchProvider.setProxy(value); setProxyEnabled(value); };
  
  const saveProxyUrl = () => {
    try {
      localStorage.setItem('forgeai_research_proxy_url', proxyUrl.trim());
    } catch (error) {
      console.warn('Failed to save proxy URL:', error);
    }
  };

  const toggles = [
    { id: 'archive', icon: Archive, label: 'Archive mode', description: 'Fetch fuller page content when native research is enabled.', checked: archiveMode, onChange: updateArchive },
    { id: 'verification', icon: Shield, label: 'Source verification', description: 'Keep fact-checking and source-verification overlays enabled.', checked: sourceVerification, onChange: updateVerification },
    { id: 'proxy', icon: Globe, label: 'Proxy routing', description: 'Route native research through a configured proxy when available.', checked: proxyEnabled, onChange: updateProxy },
  ];

  return (
    <section className="settings-card">
      <h3><Search size={16} /> Research pipeline</h3>
      <p className="setting-help first">Configure content retrieval and research depth for online information gathering.</p>

      <div className="setting-field">
        <label className="setting-label" htmlFor="research-depth">Research depth</label>
        <DropdownMenu
          value={depth}
          onChange={updateDepth}
          label="Research depth"
          options={[
            { value: RESEARCH_DEPTH.STANDARD, label: 'Standard — filtered results' },
            { value: RESEARCH_DEPTH.COMPREHENSIVE, label: 'Comprehensive — broader retrieval' },
            { value: RESEARCH_DEPTH.RAW, label: 'Raw — minimal post-processing' },
          ]}
        />
      </div>

      <div className="settings-chip-grid">
        {toggles.map(item => {
          const Icon = item.icon;
          return (
            <label key={item.id} className="settings-toggle-row">
              <span className="settings-row-icon"><Icon size={18} /></span>
              <span className="settings-toggle-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <input className="settings-switch" type="checkbox" checked={item.checked} onChange={event => item.onChange(event.target.checked)} />
            </label>
          );
        })}
      </div>
      
      {proxyEnabled && (
        <div className="setting-field" style={{ marginTop: '1rem' }}>
          <label className="setting-label" htmlFor="proxy-url">Proxy URL</label>
          <div className="setting-row">
            <input
              id="proxy-url"
              type="text"
              value={proxyUrl}
              onChange={event => setProxyUrl(event.target.value)}
              placeholder="https://proxy.example.com:8080"
            />
            <button onClick={saveProxyUrl}>Save</button>
          </div>
          <p className="setting-help">Route research requests through this proxy server.</p>
        </div>
      )}
      
      <p className="setting-help">Providers: DuckDuckGo, SearXNG, Web Archive, and native page fetching where available.</p>
    </section>
  );
}
