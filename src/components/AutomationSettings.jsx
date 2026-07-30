import { useState } from 'react';
import { showToast } from '../utils/toast.js';
import {
  automationTierManager,
  AUTOMATION_TIERS,
  WHITELISTABLE_ACTIONS,
  isFullAutoMode,
} from '../agent/automation/automationTiers.js';
import { AUTONOMY_LEVELS, readAutonomyLevel } from '../agent/autonomyPolicy.js';
import { isNative, setFullAutonomy } from '../nativeBridge.js';
import { AlertTriangle, Pause, Play, RotateCcw, Settings2 } from 'lucide-react';
import DropdownMenu from './DropdownMenu.jsx';

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
    if (isNative) {
      // Tiers above 'assisted' execute terminal/Git actions; keep the native
      // autonomy flag in sync so GitRuntime/TerminalRuntime don't reject them.
      setFullAutonomy(newTier !== AUTOMATION_TIERS.ASSISTED || readAutonomyLevel() === AUTONOMY_LEVELS.FULL)
        .catch(error => console.warn('Failed to sync native autonomy flag:', error));
    }
  };

  const toggleWhitelist = (action) => {
    if (automationTierManager.isWhitelisted(action)) automationTierManager.removeFromWhitelist(action);
    else automationTierManager.addToWhitelist(action);
    setWhitelist(automationTierManager.getWhitelist());
  };

  const clearLog = () => {
    automationTierManager.clearWorkflowLog();
    showToast('Workflow log cleared.', 'success');
  };

  const isFullAuto = isFullAutoMode();

  return (
    <section className="settings-card">
      <h3><Settings2 size={16} /> Autonomous automation tiers</h3>
      <p className="setting-help first">Control how much ForgeAI can do without your approval.</p>

      <div className="setting-field">
        <label className="setting-label" htmlFor="automation-tier">Automation level</label>
        <DropdownMenu
          value={tier}
          onChange={handleTierChange}
          label="Automation level"
          options={[
            { value: AUTOMATION_TIERS.ASSISTED, label: 'Assisted — manual approval required' },
            { value: AUTOMATION_TIERS.SEMI_AUTONOMOUS, label: 'Semi-autonomous — safe and whitelisted actions' },
            { value: AUTOMATION_TIERS.FULL_AUTO, label: 'Full-auto — execute without pause' },
            { value: AUTOMATION_TIERS.WORKFLOW, label: 'Workflow mode — long multi-step plans' },
          ]}
        />
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
        <div className="settings-chip-grid compact">
          {WHITELISTABLE_ACTIONS.map(action => (
            <label key={action} className={`settings-check-card compact ${whitelist.includes(action) ? 'active' : ''}`}>
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
