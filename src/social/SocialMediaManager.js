/**
 * Social Media Manager - Android Native Version
 */

import { nativeSocialProvider } from './NativeSocialProvider.js';
import { isExperimentalEnabled } from '../utils/experimentalFeatures.js';
import { isNative } from '../nativeBridge.js';

export class SocialMediaManager {
  constructor() {
    this.accounts = new Map();
  }

  async addAccount(platform, username, _credentials) {
    this.accounts.set(`${platform}:${username}`, { platform, username });
    return { success: true, native: true };
  }

  getAccounts() {
    return Array.from(this.accounts.values());
  }

  async post(platform, username, content, options = {}) {
    const experimentalEnabled = isExperimentalEnabled('realSocial');

    if (!experimentalEnabled || !isNative) {
      return {
        status: 'simulated',
        warning: 'Enable "Real Social Media Posting" in Experimental Features on Android',
      };
    }

    return await nativeSocialProvider.post(platform, username, content, options);
  }

  async dm(_platform, _username, _recipient, _message) {
    return {
      status: 'simulated',
      message: 'Direct messaging requires native implementation',
    };
  }

  async scrapePublicPosts(query, limit = 10) {
    return Array.from({ length: limit }, (_, i) => ({
      id: i,
      platform: 'twitter',
      text: `Public post about ${query} #${i}`,
      author: `user${i}`,
    }));
  }
}

export const socialMediaManager = new SocialMediaManager();