import { useState } from 'react';
import { Bot, Github } from 'lucide-react';
import { githubAutomation, GITHUB_AUTOMATION_TIERS } from '../github/GitHubAutomation.js';

export default function GitHubAutomationSettings() {
  const [tier, setTier] = useState(githubAutomation.tier);
  const [maintenanceBot, setMaintenanceBot] = useState(githubAutomation.maintenanceBot);
  const [dryRun, setDryRun] = useState(githubAutomation.dryRun);

  const updateTier = (newTier) => { githubAutomation.setTier(newTier); setTier(newTier); };
  const updateMaintenanceBot = (enabled) => { githubAutomation.setMaintenanceBot(enabled); setMaintenanceBot(enabled); };
  const updateDryRun = (enabled) => { githubAutomation.setDryRun(enabled); setDryRun(enabled); };

  return (
    <section className="settings-card">
      <h3><Github size={16} /> GitHub automation</h3>
      <p className="setting-help first">Configure automation level for commits, pull requests, and maintenance workflows.</p>

      <div className="setting-field">
        <label className="setting-label" htmlFor="github-tier">Automation tier</label>
        <select id="github-tier" value={tier} onChange={event => updateTier(event.target.value)}>
          <option value={GITHUB_AUTOMATION_TIERS.MANUAL}>Manual — review everything</option>
          <option value={GITHUB_AUTOMATION_TIERS.SUGGESTED}>Suggested — propose PRs</option>
          <option value={GITHUB_AUTOMATION_TIERS.AUTO_COMMIT}>Auto-commit — feature branches</option>
          <option value={GITHUB_AUTOMATION_TIERS.AUTO_DEPLOY}>Auto-deploy — main and releases</option>
        </select>
      </div>

      <div className="settings-chip-grid">
        <label className={`settings-check-card ${maintenanceBot ? 'active' : ''}`}>
          <input type="checkbox" checked={maintenanceBot} onChange={event => updateMaintenanceBot(event.target.checked)} />
          <span><strong><Bot size={14} /> Maintenance bot</strong><small>Automate dependency, lint, and docs maintenance when enabled.</small></span>
        </label>
        <label className={`settings-check-card ${dryRun ? 'active' : ''}`}>
          <input type="checkbox" checked={dryRun} onChange={event => updateDryRun(event.target.checked)} />
          <span><strong>Dry run mode</strong><small>Simulate GitHub operations without executing remote writes.</small></span>
        </label>
      </div>
    </section>
  );
}
