/**
 * Automation Tiers for Full Autonomous Mode
 * 
 * assisted          → Current behavior (manual approval for everything)
 * semi-autonomous   → Auto-approve "safe" actions (read, prepare-patch, whitelisted tools)
 * full-auto         → Execute all queued actions without interruption
 * workflow          → Multi-step plans (10+ actions) with logging + batch undo
 */

export const AUTOMATION_TIERS = Object.freeze({
  ASSISTED: 'assisted',
  SEMI_AUTONOMOUS: 'semi-autonomous',
  FULL_AUTO: 'full-auto',
  WORKFLOW: 'workflow',
});

const TIER_STORAGE_KEY = 'forgeai_automation_tier';
const WHITELIST_STORAGE_KEY = 'forgeai_automation_whitelist';
const WORKFLOW_LOG_KEY = 'forgeai_workflow_log';

export const SAFE_ACTIONS = Object.freeze([
  'read_file',
  'search_files',
  'plan',
  'final',
]);

export const WHITELISTABLE_ACTIONS = Object.freeze([
  'propose_patch',
  'create_file',
  'apply_patch',
  'terminal',
  'git',
  'git_clone',
  'github_api',
  'web_search',
]);

export class AutomationTierManager {
  constructor() {
    this.tier = AUTOMATION_TIERS.ASSISTED;
    this.whitelist = new Set();
    this.workflowLog = [];
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (typeof localStorage === 'undefined') return;

    try {
      const tier = localStorage.getItem(TIER_STORAGE_KEY);
      if (tier && Object.values(AUTOMATION_TIERS).includes(tier)) {
        this.tier = tier;
      }

      const wl = localStorage.getItem(WHITELIST_STORAGE_KEY);
      if (wl) {
        this.whitelist = new Set(JSON.parse(wl));
      }

      const log = localStorage.getItem(WORKFLOW_LOG_KEY);
      if (log) {
        this.workflowLog = JSON.parse(log);
      }
    } catch (error) {
      console.warn('Failed to load automation tier settings:', error);
    }
  }

  saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(TIER_STORAGE_KEY, this.tier);
      localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify([...this.whitelist]));
      localStorage.setItem(WORKFLOW_LOG_KEY, JSON.stringify(this.workflowLog.slice(-50)));
    } catch (error) {
      console.warn('Failed to save automation tier settings:', error);
    }
  }

  setTier(tier) {
    if (!Object.values(AUTOMATION_TIERS).includes(tier)) {
      throw new Error(`Invalid automation tier: ${tier}`);
    }
    this.tier = tier;
    this.saveToStorage();
  }

  getTier() {
    return this.tier;
  }

  isFullAuto() {
    return this.tier === AUTOMATION_TIERS.FULL_AUTO || this.tier === AUTOMATION_TIERS.WORKFLOW;
  }

  isWorkflowMode() {
    return this.tier === AUTOMATION_TIERS.WORKFLOW;
  }

  // === Whitelist Management ===
  addToWhitelist(actionType) {
    if (!WHITELISTABLE_ACTIONS.includes(actionType)) {
      throw new Error(`Action type "${actionType}" cannot be whitelisted`);
    }
    this.whitelist.add(actionType);
    this.saveToStorage();
  }

  removeFromWhitelist(actionType) {
    this.whitelist.delete(actionType);
    this.saveToStorage();
  }

  isWhitelisted(actionType) {
    return this.whitelist.has(actionType);
  }

  getWhitelist() {
    return [...this.whitelist];
  }

  // === Decision Engine ===
  shouldAutoApprove(action) {
    if (this.tier === AUTOMATION_TIERS.ASSISTED) return false;
    if (this.tier === AUTOMATION_TIERS.FULL_AUTO || this.tier === AUTOMATION_TIERS.WORKFLOW) return true;

    // SEMI_AUTONOMOUS
    if (SAFE_ACTIONS.includes(action.type)) return true;
    if (this.isWhitelisted(action.type)) return true;

    // Special case: small patches on whitelisted files
    if (action.type === 'propose_patch' || action.type === 'apply_patch') {
      return this.isWhitelisted('propose_patch') || this.isWhitelisted('apply_patch');
    }

    return false;
  }

  // === Workflow Logging ===
  logWorkflowStep(step) {
    const entry = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      tier: this.tier,
      ...step,
    };
    this.workflowLog.push(entry);
    if (this.workflowLog.length > 100) {
      this.workflowLog = this.workflowLog.slice(-100);
    }
    this.saveToStorage();
    return entry.id;
  }

  getWorkflowLog(limit = 30) {
    return this.workflowLog.slice(-limit).reverse();
  }

  clearWorkflowLog() {
    this.workflowLog = [];
    this.saveToStorage();
  }

  // Create a revert checkpoint
  createRevertCheckpoint(actions, description = 'Workflow checkpoint') {
    const checkpoint = {
      id: `checkpoint-${Date.now()}`,
      timestamp: Date.now(),
      description,
      actions: actions.map(a => ({ ...a })),
      tier: this.tier,
    };
    this.workflowLog.push({
      type: 'checkpoint',
      checkpoint,
    });
    this.saveToStorage();
    return checkpoint.id;
  }
}

// Singleton
export const automationTierManager = new AutomationTierManager();

export function getCurrentAutomationTier() {
  return automationTierManager.getTier();
}

export function setAutomationTier(tier) {
  return automationTierManager.setTier(tier);
}

export function shouldAutoApproveAction(action) {
  return automationTierManager.shouldAutoApprove(action);
}

export function isFullAutoMode() {
  return automationTierManager.isFullAuto();
}

// Tiers above 'assisted' promise to actually execute terminal/Git/GitHub actions
// (their UI copy says so) — App routes tool requests to the runner on these tiers,
// not only when the separate autonomy level is FULL.
export function isToolExecutionTier() {
  return automationTierManager.getTier() !== AUTOMATION_TIERS.ASSISTED;
}

export function isWorkflowMode() {
  return automationTierManager.isWorkflowMode();
}