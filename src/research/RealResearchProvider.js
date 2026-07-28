/**
 * Real Research Provider
 * Uses actual web APIs when Experimental Research is enabled.
 */

export class RealResearchProvider {
  async search(query, options = {}) {
    const depth = options.depth || 'standard';

    try {
      // Using DuckDuckGo Instant Answer API (public, no key needed)
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1`
      );

      if (!response.ok) throw new Error('Search API failed');

      const data = await response.json();

      const results = [];

      if (data.AbstractText) {
        results.push({
          id: 1,
          title: data.Heading || query,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: data.AbstractText,
          source: 'DuckDuckGo',
          verified: true,
        });
      }

      if (data.RelatedTopics) {
        data.RelatedTopics.slice(0, 5).forEach((topic, index) => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              id: index + 2,
              title: topic.Text.split(' - ')[0],
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo Related',
              verified: false,
            });
          }
        });
      }

      return {
        query,
        depth,
        results: results.length > 0 ? results : this.getFallbackResults(query),
        timestamp: Date.now(),
        provider: 'DuckDuckGo Instant Answer (Real)',
        simulated: false,
        experimental: true,
      };
    } catch (error) {
      console.warn('Real research failed, falling back to mock:', error);
      return this.getFallbackResults(query, depth);
    }
  }

  getFallbackResults(query, depth = 'standard') {
    return {
      query,
      depth,
      results: [
        {
          id: 1,
          title: `Result for: ${query}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: `Real search temporarily unavailable. Try again later.`,
          verified: false,
        },
      ],
      timestamp: Date.now(),
      provider: 'Fallback',
      simulated: true,
    };
  }
}

export const realResearchProvider = new RealResearchProvider();