import { useState } from 'react';
import { githubAutomation, GITHUB_AUTOMATION_TIERS } from '../github/GitHubAutomation.js';

export default function GitHubAutomationSettings() {
  const [tier, setTier] = useState(githubAutomation.tier);
  const [maintenanceBot, setMaintenanceBot] = useState(githubAutomation.maintenanceBot);
  const [dryRun, setDryRun] = useState(githubAutomation.dryRun);

  const updateTier = (newTier) => {
    githubAutomation.setTier(newTier);
    setTier(newTier);
  };

  return (
    <section className="settings-card">
      <h3>🐙 GitHub Automation</h3>
      <p className="setting-help">Configure automation level for commits, PRs, and deployments.</p>

      <div style={{ margin: '16px 0' }}>
        <label className="setting-label">Automation Tier</label>
        <select value={tier} onChange={e => updateTier(e.target.value)} style={{ width: '100%', padding: '10px', background: '#111827', color: '#fff', borderRadius: '8px' }}>
          <option value={GITHUB_AUTOMATION_TIERS.MANUAL}>Manual — Review everything</option>
          <option value={GITHUB_AUTOMATION_TIERS.SUGGESTED}>Suggested — Propose PRs</option>
          <option value={GITHUB_AUTOMATION_TIERS.AUTO_COMMIT}>Auto-Commit — Direct to feature branches</option>
          <option value={GITHUB_AUTOMATION_TIERS.AUTO_DEPLOY}>Auto-Deploy — Push to main + releases</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="checkbox" checked={maintenanceBot} onChange={e => { githubAutomation.setMaintenanceBot(e.target.checked); setMaintenanceBot(e.target.checked); }} />
          Maintenance Bot (auto dependency updates, lint fixes, docs)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="checkbox" checked={dryRun} onChange={e => { githubAutomation.setDryRun(e.target.checked); setDryRun(e.target.checked); }} />
          Dry Run Mode
        </label>
      </div>
    </section>
  );
}