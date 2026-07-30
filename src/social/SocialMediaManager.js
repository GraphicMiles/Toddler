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
    // Use real web research instead of fabricated data.
    // Fake posts (user0, user1...) are dangerous — never return made-up content.
    try {
      const { performOnlineResearch } = await import('../agent/onlineResearch.js');
      const research = await performOnlineResearch(`site:twitter.com OR site:x.com ${query}`);
      return (research.items || []).slice(0, limit).map((item, i) => ({
        id: i,
        platform: 'twitter',
        text: item.snippet || item.title || '',
        author: item.publisher || 'unknown',
        url: item.url,
        source: 'web_research',
      }));
    } catch (error) {
      // Honest fallback — never fabricate data
      return [{
        id: 0,
        platform: 'twitter',
        text: `Could not fetch public posts about "${query}": ${error.message}. Configure Google CSE in Settings for broader results.`,
        author: 'system',
        source: 'error',
      }];
    }
  }
}

export const socialMediaManager = new SocialMediaManager();
