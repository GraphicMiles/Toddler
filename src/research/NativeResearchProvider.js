/**
 * Native Android Research Provider
 * Uses the ResearchRuntime Capacitor plugin for real web search and scraping.
 */

import { searchOnline, fetchPublicUrl } from '../nativeBridge.js';

export class NativeResearchProvider {
  async search(query, options = {}) {
    try {
      const result = await searchOnline({
        query,
        googleApiKey: options.googleApiKey || '',
        googleCx: options.googleCx || '',
      });

      return {
        query,
        results: result?.results || [],
        status: 'success',
        native: true,
        experimental: true,
      };
    } catch (error) {
      return {
        query,
        results: [],
        status: 'error',
        message: error.message,
        native: true,
      };
    }
  }

  async fetchFullPage(url) {
    try {
      const result = await fetchPublicUrl(url);
      return {
        url,
        content: result?.content || '',
        status: 'success',
        native: true,
      };
    } catch (error) {
      return {
        url,
        content: '',
        status: 'error',
        message: error.message,
      };
    }
  }
}

export const nativeResearchProvider = new NativeResearchProvider();