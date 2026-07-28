import { useState } from 'react';
import { 
  automationTierManager, 
  AUTOMATION_TIERS, 
  WHITELISTABLE_ACTIONS,
  isFullAutoMode 
} from '../agent/automation/automationTiers.js';
import { AlertTriangle, Play, Pause, RotateCcw } from 'lucide-react';

export default function AutomationSettings() {
  const [tier, setTier] = useState(automationTierManager.getTier());
  const [whitelist, setWhitelist] = useState(automationTierManager.getWhitelist());
  const [showWarning, setShowWarning] = useState(false);

  const handleTierChange = (newTier) => {
    if (newTier === AUTOMATION_TIERS.FULL_AUTO || newTier === AUTOMATION_TIERS.WORKFLOW) {
      setShowWarning(true);
    } else {
      applyTier(newTier);
    }
  };

  const applyTier = (newTier) => {
    automationTierManager.setTier(newTier);
    setTier(newTier);
    setShowWarning(false);
  };

  const toggleWhitelist = (action) => {
    if (automationTierManager.isWhitelisted(action)) {
      automationTierManager.removeFromWhitelist(action);
    } else {
      automationTierManager.addToWhitelist(action);
    }
    setWhitelist(automationTierManager.getWhitelist());
  };

  const clearLog = () => {
    automationTierManager.clearWorkflowLog();
    alert('Workflow log cleared.');
  };

  const isFullAuto = isFullAutoMode();

  return (
    <section className="settings-card">
      <h3>⚙️ Autonomous Automation Tiers</h3>
      <p className="setting-help">
        Control how much ForgeAI can do without your approval.
      </p>

      {/* Tier Selector */}
      <div style={{ margin: '16px 0' }}>
        <label className="setting-label">Automation Level</label>
        <select 
          value={tier} 
          onChange={e => handleTierChange(e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#111827', color: '#fff', borderRadius: '8px' }}
        >
          <option value={AUTOMATION_TIERS.ASSISTED}>Assisted (Current) — Manual approval required</option>
          <option value={AUTOMATION_TIERS.SEMI_AUTONOMOUS}>Semi-Autonomous — Auto-approve safe + whitelisted actions</option>
          <option value={AUTOMATION_TIERS.FULL_AUTO}>Full-Auto — Execute everything without pause</option>
          <option value={AUTOMATION_TIERS.WORKFLOW}>Workflow Mode — Long multi-step plans (10+ actions)</option>
        </select>
      </div>

      {/* Warning for dangerous tiers */}
      {showWarning && (
        <div style={{ 
          background: '#451a03', 
          padding: '14px', 
          borderRadius: '8px', 
          marginBottom: '16px',
          border: '1px solid #78350f'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
            <AlertTriangle size={18} />
            <strong>Warning: High Risk Mode</strong>
          </div>
          <p style={{ fontSize: '13px', marginTop: '8px', color: '#fed7aa' }}>
            Full-Auto and Workflow modes will execute actions without confirmation. 
            This includes file writes, terminal commands, and Git operations.
          </p>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowWarning(false)} style={{ padding: '6px 14px' }}>Cancel</button>
            <button 
              onClick={() => applyTier(tier)} 
              style={{ padding: '6px 14px', background: '#b45309', color: 'white' }}
            >
              I understand the risks
            </button>
          </div>
        </div>
      )}

      {/* Whitelist */}
      <div style={{ marginTop: '20px' }}>
        <label className="setting-label">Auto-Execute Whitelist (Semi-Autonomous)</label>
        <p className="setting-help" style={{ marginBottom: '10px' }}>
          These action types will run automatically in Semi-Autonomous mode.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
          {WHITELISTABLE_ACTIONS.map(action => (
            <label key={action} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: '#1f2937',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <input 
                type="checkbox" 
                checked={whitelist.includes(action)}
                onChange={() => toggleWhitelist(action)}
              />
              <span>{action}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status Indicator */}
      <div style={{ 
        marginTop: '20px', 
        padding: '12px 16px', 
        background: isFullAuto ? '#1e3a8a' : '#111827',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        {isFullAuto ? (
          <>
            <Play size={18} color="#60a5fa" />
            <span style={{ color: '#93c5fd', fontWeight: 600 }}>
              FULL-AUTO MODE ACTIVE — Agent will not pause for approval
            </span>
          </>
        ) : (
          <>
            <Pause size={18} color="#9ca3af" />
            <span style={{ color: '#9ca3af' }}>
              Current tier: <strong>{tier}</strong>
            </span>
          </>
        )}
      </div>

      {/* Workflow Controls */}
      {tier === AUTOMATION_TIERS.WORKFLOW && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #374151' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Workflow Mode</strong>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Multi-step execution with full logging
              </div>
            </div>
            <button 
              onClick={clearLog}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '6px 12px',
                background: '#374151',
                border: 'none',
                color: '#d1d5db',
                borderRadius: '6px'
              }}
            >
              <RotateCcw size={14} /> Clear Log
            </button>
          </div>
        </div>
      )}
    </section>
  );
}