import { researchProvider } from './ResearchProvider.js';

export async function performResearch(query, options = {}) {
  return await researchProvider.search(query, options);
}

export async function fetchArchivedPage(url) {
  return await researchProvider.fetchFullPage(url);
}

export function getResearchDepthLabel(depth) {
  const labels = {
    standard: 'Standard (Filtered)',
    comprehensive: 'Comprehensive',
    raw: 'Raw / Unfiltered',
  };
  return labels[depth] || depth;
}