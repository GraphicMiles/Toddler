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

    // Check if experimental real GitHub is enabled
    let experimentalEnabled = false;
    try {
      const exp = JSON.parse(localStorage.getItem('forgeai_experimental_features') || '{}');
      experimentalEnabled = exp.realGitHub === true;
    } catch {}

    const { githubToken, branchProtectionBypass = false } = options;

    if (!experimentalEnabled) {
      if (this.tier === GITHUB_AUTOMATION_TIERS.MANUAL) {
        return { status: 'pending-review', changes, message };
      }
      if (this.tier === GITHUB_AUTOMATION_TIERS.SUGGESTED) {
        return { status: 'suggested', prTitle: message, changes };
      }
      return {
        status: 'simulated',
        tier: this.tier,
        message: 'Enable "Real GitHub Automation" in Experimental Features for real execution',
      };
    }

    // Experimental real GitHub mode
    if (this.tier === GITHUB_AUTOMATION_TIERS.AUTO_COMMIT) {
      return {
        status: 'committed_experimental',
        branch: 'feature/forgeai-auto',
        message,
        requiresToken: !githubToken,
      };
    }

    if (this.tier === GITHUB_AUTOMATION_TIERS.AUTO_DEPLOY) {
      if (branchProtectionBypass && !githubToken) {
        return {
          status: 'blocked',
          reason: 'Branch protection bypass requires a valid GitHub token',
          message,
        };
      }
      return {
        status: 'deployed_experimental',
        release: message,
        merged: true,
        branchProtectionBypass: branchProtectionBypass && !!githubToken,
      };
    }

    return { status: 'pending', tier: this.tier };
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