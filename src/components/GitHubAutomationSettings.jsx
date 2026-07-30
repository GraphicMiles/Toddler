import { useState } from 'react';
import { Bot, Github } from 'lucide-react';
import { githubAutomation, GITHUB_AUTOMATION_TIERS } from '../github/GitHubAutomation.js';
import DropdownMenu from './DropdownMenu.jsx';

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
        <DropdownMenu
          value={tier}
          onChange={updateTier}
          label="Automation tier"
          options={[
            { value: GITHUB_AUTOMATION_TIERS.MANUAL, label: 'Manual — review everything' },
            { value: GITHUB_AUTOMATION_TIERS.SUGGESTED, label: 'Suggested — propose PRs' },
            { value: GITHUB_AUTOMATION_TIERS.AUTO_COMMIT, label: 'Auto-commit — feature branches' },
            { value: GITHUB_AUTOMATION_TIERS.AUTO_DEPLOY, label: 'Auto-deploy — main and releases' },
          ]}
        />
      </div>

      <div className="settings-list">
        <label className="settings-toggle-row">
          <span className="settings-row-icon"><Bot size={18} /></span>
          <span className="settings-toggle-copy"><strong>Maintenance bot</strong><small>Automate dependency, lint, and docs maintenance when enabled.</small></span>
          <input className="settings-switch" type="checkbox" checked={maintenanceBot} onChange={event => updateMaintenanceBot(event.target.checked)} />
        </label>
        <label className="settings-toggle-row">
          <span className="settings-row-icon"><Github size={18} /></span>
          <span className="settings-toggle-copy"><strong>Dry run mode</strong><small>Simulate GitHub operations without executing remote writes.</small></span>
          <input className="settings-switch" type="checkbox" checked={dryRun} onChange={event => updateDryRun(event.target.checked)} />
        </label>
      </div>
    </section>
  );
}
