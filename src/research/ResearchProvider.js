/**
 * ResearchProvider - Android Native Version
 * Delegates to ResearchRuntime when Experimental mode is enabled.
 */

import { nativeResearchProvider } from './NativeResearchProvider.js';
import { isExperimentalEnabled } from '../utils/experimentalFeatures.js';
import { isNative } from '../nativeBridge.js';

export const RESEARCH_DEPTH = Object.freeze({
  STANDARD: 'standard',
  COMPREHENSIVE: 'comprehensive',
  RAW: 'raw',
});

const STORAGE_KEY = 'forgeai_research_settings';
const DEFAULT_SETTINGS = Object.freeze({
  depth: RESEARCH_DEPTH.STANDARD,
  archiveMode: false,
  sourceVerification: true,
  proxyEnabled: false,
});

function readSettings() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...DEFAULT_SETTINGS,
      ...value,
      depth: Object.values(RESEARCH_DEPTH).includes(value.depth) ? value.depth : DEFAULT_SETTINGS.depth,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
  catch (error) { console.warn('Failed to save research settings:', error); }
}

export class ResearchProvider {
  constructor() {
    const settings = readSettings();
    this.depth = settings.depth;
    this.archiveMode = settings.archiveMode;
    this.sourceVerification = settings.sourceVerification;
    this.proxyEnabled = settings.proxyEnabled;
  }

  snapshot() {
    return {
      depth: this.depth,
      archiveMode: this.archiveMode,
      sourceVerification: this.sourceVerification,
      proxyEnabled: this.proxyEnabled,
    };
  }

  persist() {
    writeSettings(this.snapshot());
  }

  setDepth(depth) {
    if (Object.values(RESEARCH_DEPTH).includes(depth)) {
      this.depth = depth;
      this.persist();
    }
  }

  setArchiveMode(enabled) {
    this.archiveMode = Boolean(enabled);
    this.persist();
  }

  setSourceVerification(enabled) {
    this.sourceVerification = Boolean(enabled);
    this.persist();
  }

  setProxy(enabled) {
    this.proxyEnabled = Boolean(enabled);
    this.persist();
  }

  async search(query, options = {}) {
    const experimentalEnabled = isExperimentalEnabled('realResearch');
    const depth = options.depth || this.depth;

    if (experimentalEnabled && isNative) {
      // Real native research on Android
      return await nativeResearchProvider.search(query, { ...options, depth });
    }

    // Fallback simulated mode
    return {
      query,
      depth,
      archiveMode: this.archiveMode,
      sourceVerification: this.sourceVerification,
      proxyEnabled: this.proxyEnabled,
      results: [
        {
          id: 1,
          title: `Research result for: ${query}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: `Enable "Real Research APIs" in Experimental Features for real results.`,
          verified: false,
        },
      ],
      provider: 'Simulated',
      simulated: true,
    };
  }

  async fetchFullPage(url) {
    const experimentalEnabled = isExperimentalEnabled('realResearch');

    if (experimentalEnabled && isNative) {
      return await nativeResearchProvider.fetchFullPage(url);
    }

    return {
      url,
      content: `Enable "Real Research APIs" for real page fetching.`,
      simulated: true,
    };
  }
}

export const researchProvider = new ResearchProvider();
