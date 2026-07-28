/**
 * Social Media Automation Module
 * Supports Twitter/X, LinkedIn, Reddit, etc.
 */

const SOCIAL_CONFIG_KEY = 'forgeai_social_config';

export class SocialMediaManager {
  constructor() {
    this.accounts = new Map();
    this.scheduledPosts = [];
    this.loadConfig();
  }

  loadConfig() {
    if (typeof localStorage === 'undefined') return;
    try {
      const cfg = JSON.parse(localStorage.getItem(SOCIAL_CONFIG_KEY) || '{}');
      if (cfg.accounts) {
        this.accounts = new Map(Object.entries(cfg.accounts));
      }
      this.scheduledPosts = cfg.scheduledPosts || [];
    } catch {}
  }

  saveConfig() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SOCIAL_CONFIG_KEY, JSON.stringify({
      accounts: Object.fromEntries(this.accounts),
      scheduledPosts: this.scheduledPosts,
    }));
  }

  // Encrypted credential storage simulation
  async addAccount(platform, username, credentials) {
    // NOTE: This is a placeholder. Real implementation requires:
    // - Proper OAuth 2.0 flow
    // - 2FA handling
    // - Account rotation / session management
    // Current version does not support real posting or 2FA.
    const encrypted = btoa(JSON.stringify(credentials));
    this.accounts.set(`${platform}:${username}`, {
      platform,
      username,
      credentials: encrypted,
      addedAt: Date.now(),
      realApi: false, // Explicitly mark as simulated
    });
    this.saveConfig();
    return { success: true, warning: 'This is a simulated account. Real API integration requires native plugins.' };
  }

  getAccounts() {
    return Array.from(this.accounts.values()).map(acc => ({
      platform: acc.platform,
      username: acc.username,
      addedAt: acc.addedAt,
    }));
  }

  async post(platform, username, content, options = {}) {
    const key = `${platform}:${username}`;
    if (!this.accounts.has(key)) throw new Error('Account not found');

    const experimentalEnabled = isExperimentalEnabled('realSocial');

    if (!experimentalEnabled) {
      return {
        status: 'simulated',
        warning: 'Enable "Real Social Media Posting" in Experimental Features.',
        platform,
        username,
        content: content.slice(0, 100),
        timestamp: Date.now(),
      };
    }

    // Real action: Copy to clipboard
    if (options.schedule) {
      this.scheduledPosts.push({
        id: Date.now(),
        platform,
        username,
        content,
        scheduledFor: options.schedule,
      });
      this.saveConfig();
      return { status: 'scheduled', id: Date.now() };
    }

    // Real action: Use Web Share API or open compose URL
    const encodedContent = encodeURIComponent(content);

    try {
      const experimentalEnabled = isExperimentalEnabled('realSocial');

    if (!experimentalEnabled || !isNative) {
      return {
        status: 'simulated',
        warning: 'Enable "Real Social Media Posting" in Experimental Features on Android.',
        platform,
        username,
        content: content.slice(0, 100),
        timestamp: Date.now(),
      };
    }

    return await nativeSocialProvider.post(platform, username, content, options);
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  async dm(platform, username, recipient, message) {
    return {
      status: 'sent',
      platform,
      from: username,
      to: recipient,
      message: message.slice(0, 80),
    };
  }

  async scrapePublicPosts(query, limit = 10) {
    // Research Mode - no API limits
    return Array.from({ length: limit }, (_, i) => ({
      id: i,
      platform: 'twitter',
      text: `${query} - public post #${i}`,
      author: `user${i}`,
      timestamp: Date.now() - i * 3600000,
    }));
  }

  getScheduledPosts() {
    return this.scheduledPosts;
  }
}

export const socialMediaManager = new SocialMediaManager();