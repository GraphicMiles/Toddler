/**
 * ResearchProvider - Android Native Version
 * Delegates to ResearchRuntime when Experimental mode is enabled.
 */

import { nativeResearchProvider } from './NativeResearchProvider.js';
import { isExperimentalEnabled } from '../components/ExperimentalFeatures.jsx';
import { isNative } from '../nativeBridge.js';

export const RESEARCH_DEPTH = Object.freeze({
  STANDARD: 'standard',
  COMPREHENSIVE: 'comprehensive',
  RAW: 'raw',
});

export class ResearchProvider {
  constructor() {
    this.depth = RESEARCH_DEPTH.STANDARD;
  }

  setDepth(depth) {
    if (Object.values(RESEARCH_DEPTH).includes(depth)) {
      this.depth = depth;
    }
  }

  async search(query, options = {}) {
    const experimentalEnabled = isExperimentalEnabled('realResearch');

    if (experimentalEnabled && isNative) {
      // Real native research on Android
      return await nativeResearchProvider.search(query, options);
    }

    // Fallback simulated mode
    return {
      query,
      depth: this.depth,
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