/**
 * GitHub Automation Tiers
 * manual | suggested | auto-commit | auto-deploy
 */

export const GITHUB_AUTOMATION_TIERS = Object.freeze({
  MANUAL: 'manual',
  SUGGESTED: 'suggested',
  AUTO_COMMIT: 'auto-commit',
  AUTO_DEPLOY: 'auto-deploy',
});

const GITHUB_CONFIG_KEY = 'forgeai_github_automation';

export class GitHubAutomation {
  constructor() {
    this.tier = GITHUB_AUTOMATION_TIERS.MANUAL;
    this.maintenanceBot = false;
    this.dryRun = false;
    this.loadConfig();
  }

  loadConfig() {
    if (typeof localStorage === 'undefined') return;
    try {
      const cfg = JSON.parse(localStorage.getItem(GITHUB_CONFIG_KEY) || '{}');
      this.tier = cfg.tier || GITHUB_AUTOMATION_TIERS.MANUAL;
      this.maintenanceBot = !!cfg.maintenanceBot;
      this.dryRun = !!cfg.dryRun;
    } catch {}
  }

  saveConfig() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify({
      tier: this.tier,
      maintenanceBot: this.maintenanceBot,
      dryRun: this.dryRun,
    }));
  }

  setTier(tier) {
    if (!Object.values(GITHUB_AUTOMATION_TIERS).includes(tier)) return;
    this.tier = tier;
    this.saveConfig();
  }

  setMaintenanceBot(enabled) {
    this.maintenanceBot = !!enabled;
    this.saveConfig();
  }

  setDryRun(enabled) {
    this.dryRun = !!enabled;
    this.saveConfig();
  }

  async proposeCommit(changes, message, options = {}) {
    if (this.dryRun) return { status: 'dry-run', message };

    const { githubToken, branchProtectionBypass = false } = options;

    if (this.tier === GITHUB_AUTOMATION_TIERS.MANUAL) {
      return { status: 'pending-review', changes, message };
    }

    if (this.tier === GITHUB_AUTOMATION_TIERS.SUGGESTED) {
      return { status: 'suggested', prTitle: message, changes };
    }

    if (this.tier === GITHUB_AUTOMATION_TIERS.AUTO_COMMIT) {
      return {
        status: 'committed',
        branch: 'feature/forgeai-auto',
        message,
        requiresToken: !githubToken,
      };
    }

    if (this.tier === GITHUB_AUTOMATION_TIERS.AUTO_DEPLOY) {
      // Branch protection bypass requires explicit token + flag
      if (branchProtectionBypass && !githubToken) {
        return {
          status: 'blocked',
          reason: 'Branch protection bypass requires a valid GitHub token',
          message,
        };
      }

      return {
        status: 'deployed',
        release: message,
        merged: true,
        branchProtectionBypass: branchProtectionBypass && !!githubToken,
      };
    }
  }

  async runMaintenanceBot() {
    if (!this.maintenanceBot) return { status: 'disabled' };
    return {
      status: 'completed',
      actions: ['dependency-update', 'lint-fix', 'docs-sync'],
      dryRun: this.dryRun,
    };
  }
}

export const githubAutomation = new GitHubAutomation();