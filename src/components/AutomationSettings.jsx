import { useState } from 'react';
import {
  automationTierManager,
  AUTOMATION_TIERS,
  WHITELISTABLE_ACTIONS,
  isFullAutoMode,
} from '../agent/automation/automationTiers.js';
import { AlertTriangle, Pause, Play, RotateCcw, Settings2 } from 'lucide-react';

export default function AutomationSettings() {
  const [tier, setTier] = useState(automationTierManager.getTier());
  const [pendingTier, setPendingTier] = useState(null);
  const [whitelist, setWhitelist] = useState(automationTierManager.getWhitelist());
  const [showWarning, setShowWarning] = useState(false);

  const handleTierChange = (newTier) => {
    if (newTier === AUTOMATION_TIERS.FULL_AUTO || newTier === AUTOMATION_TIERS.WORKFLOW) {
      setPendingTier(newTier);
      setShowWarning(true);
      return;
    }
    applyTier(newTier);
  };

  const applyTier = (newTier) => {
    automationTierManager.setTier(newTier);
    setTier(newTier);
    setPendingTier(null);
    setShowWarning(false);
  };

  const toggleWhitelist = (action) => {
    if (automationTierManager.isWhitelisted(action)) automationTierManager.removeFromWhitelist(action);
    else automationTierManager.addToWhitelist(action);
    setWhitelist(automationTierManager.getWhitelist());
  };

  const clearLog = () => {
    automationTierManager.clearWorkflowLog();
    alert('Workflow log cleared.');
  };

  const isFullAuto = isFullAutoMode();

  return (
    <section className="settings-card">
      <h3><Settings2 size={16} /> Autonomous automation tiers</h3>
      <p className="setting-help first">Control how much ForgeAI can do without your approval.</p>

      <div className="setting-field">
        <label className="setting-label" htmlFor="automation-tier">Automation level</label>
        <select id="automation-tier" value={tier} onChange={event => handleTierChange(event.target.value)}>
          <option value={AUTOMATION_TIERS.ASSISTED}>Assisted — manual approval required</option>
          <option value={AUTOMATION_TIERS.SEMI_AUTONOMOUS}>Semi-autonomous — safe and whitelisted actions</option>
          <option value={AUTOMATION_TIERS.FULL_AUTO}>Full-auto — execute without pause</option>
          <option value={AUTOMATION_TIERS.WORKFLOW}>Workflow mode — long multi-step plans</option>
        </select>
      </div>

      {showWarning && (
        <div className="settings-warning-box">
          <div className="settings-warning-title"><AlertTriangle size={16} /> High risk mode</div>
          <p>Full-auto and Workflow modes can execute file writes, terminal commands, and Git operations without confirmation.</p>
          <div className="setting-row wrap">
            <button onClick={() => { setPendingTier(null); setShowWarning(false); }}>Cancel</button>
            <button className="danger" onClick={() => applyTier(pendingTier || tier)}>I understand the risks</button>
          </div>
        </div>
      )}

      <div className="setting-field">
        <label className="setting-label">Auto-execute whitelist</label>
        <p className="setting-help">These action types can run automatically in Semi-autonomous mode.</p>
        <div className="settings-chip-grid">
          {WHITELISTABLE_ACTIONS.map(action => (
            <label key={action} className={`settings-check-card ${whitelist.includes(action) ? 'active' : ''}`}>
              <input type="checkbox" checked={whitelist.includes(action)} onChange={() => toggleWhitelist(action)} />
              <span>{action}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={`settings-status-row ${isFullAuto ? 'active' : ''}`}>
        {isFullAuto ? <Play size={16} /> : <Pause size={16} />}
        <span>{isFullAuto ? 'Full-auto mode active — agent will not pause for approval' : `Current tier: ${tier}`}</span>
      </div>

      {tier === AUTOMATION_TIERS.WORKFLOW && (
        <div className="settings-subsection-row">
          <div>
            <strong>Workflow mode</strong>
            <p className="setting-help">Multi-step execution with workflow logging.</p>
          </div>
          <button onClick={clearLog}><RotateCcw size={14} /> Clear log</button>
        </div>
      )}
    </section>
  );
}
