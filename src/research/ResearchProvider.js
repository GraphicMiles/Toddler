/**
 * ResearchProvider - Unfiltered Research Pipeline
 * Supports Standard / Comprehensive / Raw depth levels
 */

export const RESEARCH_DEPTH = Object.freeze({
  STANDARD: 'standard',
  COMPREHENSIVE: 'comprehensive',
  RAW: 'raw',
});

const RESEARCH_CONFIG_KEY = 'forgeai_research_config';

export class ResearchProvider {
  constructor() {
    this.depth = RESEARCH_DEPTH.STANDARD;
    this.archiveMode = false;
    this.sourceVerification = true;
    this.proxyEnabled = false;
    this.loadConfig();
  }

  loadConfig() {
    if (typeof localStorage === 'undefined') return;
    try {
      const cfg = JSON.parse(localStorage.getItem(RESEARCH_CONFIG_KEY) || '{}');
      this.depth = cfg.depth || RESEARCH_DEPTH.STANDARD;
      this.archiveMode = !!cfg.archiveMode;
      this.sourceVerification = cfg.sourceVerification !== false;
      this.proxyEnabled = !!cfg.proxyEnabled;
    } catch {}
  }

  saveConfig() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(RESEARCH_CONFIG_KEY, JSON.stringify({
      depth: this.depth,
      archiveMode: this.archiveMode,
      sourceVerification: this.sourceVerification,
      proxyEnabled: this.proxyEnabled,
    }));
  }

  setDepth(depth) {
    if (!Object.values(RESEARCH_DEPTH).includes(depth)) return;
    this.depth = depth;
    this.saveConfig();
  }

  setArchiveMode(enabled) {
    this.archiveMode = !!enabled;
    this.saveConfig();
  }

  setSourceVerification(enabled) {
    this.sourceVerification = !!enabled;
    this.saveConfig();
  }

  setProxy(enabled) {
    this.proxyEnabled = !!enabled;
    this.saveConfig();
  }

  async search(query, options = {}) {
    const depth = options.depth || this.depth;
    const useArchive = options.archiveMode ?? this.archiveMode;

    // Check if experimental real research is enabled
    let experimentalEnabled = false;
    try {
      const exp = JSON.parse(localStorage.getItem('forgeai_experimental_features') || '{}');
      experimentalEnabled = exp.realResearch === true;
    } catch {}

    if (experimentalEnabled) {
      // Use real DuckDuckGo API
      return await realResearchProvider.search(query, { depth });
    }

    // Simulated mode (default)
    let results = [];
    if (depth === RESEARCH_DEPTH.RAW) {
      results = await this._rawSearch(query);
    } else if (depth === RESEARCH_DEPTH.COMPREHENSIVE) {
      results = await this._comprehensiveSearch(query);
    } else {
      results = await this._standardSearch(query);
    }

    if (useArchive) {
      results = results.map(r => ({ ...r, archived: true, fullContent: `Archived content for: ${r.title}` }));
    }
    if (!this.sourceVerification) {
      results = results.map(r => ({ ...r, verified: false }));
    }

    return {
      query,
      depth,
      results,
      timestamp: Date.now(),
      provider: this._getProviderName(depth),
      simulated: true,
    };
  }

  async _standardSearch(query) {
    // Mock filtered results
    return [
      { id: 1, title: `${query} - Official Source`, url: `https://example.com/${query.toLowerCase().replace(/\s+/g, '-')}`, snippet: `Filtered result about ${query}`, verified: true },
      { id: 2, title: `Research: ${query}`, url: `https://wikipedia.org/wiki/${query}`, snippet: `Encyclopedia entry`, verified: true },
    ];
  }

  async _comprehensiveSearch(query) {
    const standard = await this._standardSearch(query);
    return [
      ...standard,
      { id: 3, title: `Deep Dive: ${query}`, url: `https://arxiv.org/search/?query=${query}`, snippet: `Academic paper`, verified: false },
      { id: 4, title: `Forum Discussion`, url: `https://reddit.com/r/research/search?q=${query}`, snippet: `Community discussion`, verified: false },
    ];
  }

  async _rawSearch(query) {
    // Unfiltered - would normally call real APIs
    return [
      { id: 1, title: query, url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, snippet: `Raw search result`, verified: false },
      { id: 2, title: `${query} - Unverified`, url: `https://searxng.example/search?q=${query}`, snippet: `Direct result`, verified: false },
      { id: 3, title: `Archive: ${query}`, url: `https://web.archive.org/web/*/${query}`, snippet: `Historical snapshot`, verified: false },
    ];
  }

  _getProviderName(depth) {
    if (depth === RESEARCH_DEPTH.RAW) return 'DuckDuckGo + SearXNG + Archive';
    if (depth === RESEARCH_DEPTH.COMPREHENSIVE) return 'Multi-source Aggregator';
    return 'Filtered Search';
  }

  async fetchFullPage(url) {
    if (this.proxyEnabled) {
      return `[PROXY] Full content of ${url}`;
    }

    try {
      // Attempt real fetch for public pages
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        const text = await response.text();
        return {
          url,
          content: text.slice(0, 5000), // Limit size
          status: 'real_fetch',
          experimental: true,
        };
      }
    } catch (error) {
      // CORS or network error - expected for many sites
    }

    return `Full page content for: ${url} (real fetch blocked by CORS)`;
  }
}

export const researchProvider = new ResearchProvider();