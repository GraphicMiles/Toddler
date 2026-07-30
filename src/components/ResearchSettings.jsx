import { useState } from 'react';
import { researchProvider, RESEARCH_DEPTH } from '../research/ResearchProvider.js';
import { Archive, Globe, Search, Shield } from 'lucide-react';

export default function ResearchSettings() {
  const [depth, setDepth] = useState(researchProvider.depth);
  const [archiveMode, setArchiveMode] = useState(researchProvider.archiveMode);
  const [sourceVerification, setSourceVerification] = useState(researchProvider.sourceVerification);
  const [proxyEnabled, setProxyEnabled] = useState(researchProvider.proxyEnabled);

  const updateDepth = (newDepth) => { researchProvider.setDepth(newDepth); setDepth(newDepth); };
  const updateArchive = (value) => { researchProvider.setArchiveMode(value); setArchiveMode(value); };
  const updateVerification = (value) => { researchProvider.setSourceVerification(value); setSourceVerification(value); };
  const updateProxy = (value) => { researchProvider.setProxy(value); setProxyEnabled(value); };

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
        <select id="research-depth" value={depth} onChange={event => updateDepth(event.target.value)}>
          <option value={RESEARCH_DEPTH.STANDARD}>Standard — filtered results</option>
          <option value={RESEARCH_DEPTH.COMPREHENSIVE}>Comprehensive — broader retrieval</option>
          <option value={RESEARCH_DEPTH.RAW}>Raw — minimal post-processing</option>
        </select>
      </div>

      <div className="settings-chip-grid">
        {toggles.map(item => {
          const Icon = item.icon;
          return (
            <label key={item.id} className={`settings-check-card ${item.checked ? 'active' : ''}`}>
              <input type="checkbox" checked={item.checked} onChange={event => item.onChange(event.target.checked)} />
              <span>
                <strong><Icon size={14} /> {item.label}</strong>
                <small>{item.description}</small>
              </span>
            </label>
          );
        })}
      </div>
      <p className="setting-help">Providers: DuckDuckGo, SearXNG, Web Archive, and native page fetching where available.</p>
    </section>
  );
}
