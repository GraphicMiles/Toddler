import { useState } from 'react';
import { researchProvider, RESEARCH_DEPTH } from '../research/ResearchProvider.js';
import { Archive, Globe, Shield } from 'lucide-react';

export default function ResearchSettings() {
  const [depth, setDepth] = useState(researchProvider.depth);
  const [archiveMode, setArchiveMode] = useState(researchProvider.archiveMode);
  const [sourceVerification, setSourceVerification] = useState(researchProvider.sourceVerification);
  const [proxyEnabled, setProxyEnabled] = useState(researchProvider.proxyEnabled);

  const updateDepth = (newDepth) => {
    researchProvider.setDepth(newDepth);
    setDepth(newDepth);
  };

  const updateArchive = (val) => {
    researchProvider.setArchiveMode(val);
    setArchiveMode(val);
  };

  const updateVerification = (val) => {
    researchProvider.setSourceVerification(val);
    setSourceVerification(val);
  };

  const updateProxy = (val) => {
    researchProvider.setProxy(val);
    setProxyEnabled(val);
  };

  return (
    <section className="settings-card">
      <h3>🔍 Research Pipeline</h3>
      <p className="setting-help">Configure content filtering and research depth for unfiltered information gathering.</p>

      {/* Depth Selector */}
      <div style={{ margin: '16px 0' }}>
        <label className="setting-label">Research Depth</label>
        <select 
          value={depth} 
          onChange={e => updateDepth(e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#111827', color: '#fff', borderRadius: '8px' }}
        >
          <option value={RESEARCH_DEPTH.STANDARD}>Standard — Filtered results</option>
          <option value={RESEARCH_DEPTH.COMPREHENSIVE}>Comprehensive — Minimal filtering</option>
          <option value={RESEARCH_DEPTH.RAW}>Raw — Unmodified search results</option>
        </select>
      </div>

      {/* Toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#1f2937', borderRadius: '8px' }}>
          <input type="checkbox" checked={archiveMode} onChange={e => updateArchive(e.target.checked)} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Archive size={15} /> Archive Mode
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Full page retrieval</div>
          </div>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#1f2937', borderRadius: '8px' }}>
          <input type="checkbox" checked={!sourceVerification} onChange={e => updateVerification(!e.target.checked)} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={15} /> Disable Verification
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>No fact-checking overlays</div>
          </div>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#1f2937', borderRadius: '8px' }}>
          <input type="checkbox" checked={proxyEnabled} onChange={e => updateProxy(e.target.checked)} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={15} /> Tor / Proxy Routing
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Route through proxy</div>
          </div>
        </label>
      </div>

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
        Providers: DuckDuckGo • SearXNG • Web Archive • Playwright scraping
      </div>
    </section>
  );
}