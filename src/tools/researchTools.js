import { researchProvider } from '../research/ResearchProvider.js';

export function registerResearchTools(registry) {
  registry.register({
    name: 'research:query',
    description: 'Perform research (currently simulated - real scraping requires native plugin)',
    permission: 'read',
    execute: async ({ query, depth, archiveMode }) => {
      if (!query) throw new Error('Query is required');
      const result = await researchProvider.search(query, { depth, archiveMode });
      return result;
    },
  });

  registry.register({
    name: 'research:scrape',
    description: 'Fetch full content of a URL (Archive Mode)',
    permission: 'read',
    execute: async ({ url }) => {
      if (!url) throw new Error('URL is required');
      return await researchProvider.fetchFullPage(url);
    },
  });
}