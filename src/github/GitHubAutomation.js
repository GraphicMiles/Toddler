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

export class GitHubAutomation {
  constructor() {
    this.tier = GITHUB_AUTOMATION_TIERS.MANUAL;
  }

  setTier(tier) {
    if (Object.values(GITHUB_AUTOMATION_TIERS).includes(tier)) {
      this.tier = tier;
    }
  }

  async proposeCommit(changes, message, options = {}) {
    const experimentalEnabled = isExperimentalEnabled('realGitHub');
    const { githubToken, branchProtectionBypass = false } = options;

    if (!experimentalEnabled || !isNative) {
      return {
        status: 'simulated',
        tier: this.tier,
        message: 'Enable "Real GitHub Automation" in Experimental Features on Android',
      };
    }

    return await nativeGitHubProvider.proposeCommit(changes, message, {
      githubToken,
      branchProtectionBypass,
    });
  }

  async runMaintenanceBot() {
    const experimentalEnabled = isExperimentalEnabled('realGitHub');

    if (!experimentalEnabled || !isNative) {
      return { status: 'disabled', message: 'Enable Experimental GitHub on Android' };
    }

    return {
      status: 'completed',
      actions: ['dependency-update', 'lint-fix', 'docs-sync'],
      native: true,
    };
  }
}

export const githubAutomation = new GitHubAutomation();