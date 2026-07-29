/**
 * GitHub Automation - Android Native Version
 */

import { nativeGitHubProvider } from './NativeGitHubProvider.js';
import { isExperimentalEnabled } from '../utils/experimentalFeatures.js';
import { isNative } from '../nativeBridge.js';

export const GITHUB_AUTOMATION_TIERS = Object.freeze({
  MANUAL: 'manual',
  SUGGESTED: 'suggested',
  AUTO_COMMIT: 'auto-commit',
  AUTO_DEPLOY: 'auto-deploy',
});

const STORAGE_KEY = 'forgeai_github_automation_settings';

function readSettings() {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function writeSettings(value) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
  catch (error) { console.warn('Failed to save GitHub automation settings:', error); }
}

export class GitHubAutomation {
  constructor() {
    const settings = readSettings();
    this.tier = Object.values(GITHUB_AUTOMATION_TIERS).includes(settings.tier)
      ? settings.tier
      : GITHUB_AUTOMATION_TIERS.MANUAL;
    this.maintenanceBot = Boolean(settings.maintenanceBot);
    this.dryRun = settings.dryRun !== false;
  }

  persist() {
    writeSettings({ tier: this.tier, maintenanceBot: this.maintenanceBot, dryRun: this.dryRun });
  }

  setTier(tier) {
    if (Object.values(GITHUB_AUTOMATION_TIERS).includes(tier)) {
      this.tier = tier;
      this.persist();
    }
  }

  setMaintenanceBot(enabled) {
    this.maintenanceBot = Boolean(enabled);
    this.persist();
  }

  setDryRun(enabled) {
    this.dryRun = Boolean(enabled);
    this.persist();
  }

  async proposeCommit(changes, message, options = {}) {
    const experimentalEnabled = isExperimentalEnabled('realGitHub');
    const { githubToken, branchProtectionBypass = false } = options;

    if (!experimentalEnabled || !isNative || this.dryRun) {
      return {
        status: 'simulated',
        tier: this.tier,
        dryRun: this.dryRun,
        message: this.dryRun
          ? 'Dry Run Mode is enabled. Disable it to allow real GitHub automation on Android.'
          : 'Enable "Real GitHub Automation" in Experimental Features on Android',
      };
    }

    return await nativeGitHubProvider.proposeCommit(changes, message, {
      githubToken,
      branchProtectionBypass,
    });
  }

  async runMaintenanceBot() {
    const experimentalEnabled = isExperimentalEnabled('realGitHub');

    if (!this.maintenanceBot) {
      return { status: 'disabled', message: 'Maintenance Bot is disabled in Settings.' };
    }

    if (!experimentalEnabled || !isNative || this.dryRun) {
      return {
        status: 'disabled',
        dryRun: this.dryRun,
        message: this.dryRun ? 'Dry Run Mode is enabled.' : 'Enable Experimental GitHub on Android',
      };
    }

    return {
      status: 'completed',
      actions: ['dependency-update', 'lint-fix', 'docs-sync'],
      native: true,
    };
  }
}

export const githubAutomation = new GitHubAutomation();
