/**
 * Social Media Manager - Android Native Version
 */

import { nativeSocialProvider } from './NativeSocialProvider.js';
import { isExperimentalEnabled } from '../utils/experimentalFeatures.js';
import { isNative } from '../nativeBridge.js';

const STORAGE_KEY = 'forgeai_social_accounts_v1';

function readAccounts() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item?.platform && item?.username) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); }
  catch (error) { console.warn('Failed to save social accounts:', error); }
}

export class SocialMediaManager {
  constructor() {
    this.accounts = new Map();
    for (const account of readAccounts()) {
      this.accounts.set(`${account.platform}:${account.username}`, account);
    }
  }

  persist() {
    writeAccounts(this.getAccounts());
  }

  async addAccount(platform, username, _credentials) {
    const cleanPlatform = String(platform || '').trim().toLowerCase();
    const cleanUsername = String(username || '').trim().replace(/^@/, '');
    if (!cleanPlatform || !cleanUsername) throw new Error('Platform and username are required.');
    this.accounts.set(`${cleanPlatform}:${cleanUsername}`, { platform: cleanPlatform, username: cleanUsername });
    this.persist();
    return { success: true, native: isNative };
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
