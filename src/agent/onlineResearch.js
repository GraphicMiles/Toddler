import { searchOnline } from '../nativeBridge.js';

export function isOnlineResearchRequest(message = '') {
  return /\b(search online|research|latest|current|today|news|who won|score|result|how old|age of|github repo|pull request|workflow run|fact.?check)\b/i.test(message);
}

function stripMarkup(value) {
  return String(value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 1000);
}

export async function performOnlineResearch(query) {
  const googleApiKey = localStorage.getItem('forgeai_google_api_key') || '';
  const googleCx = localStorage.getItem('forgeai_google_cx') || '';
  const result = await searchOnline({ query, googleApiKey, googleCx });
  const items = Array.from(result.items || []).slice(0, 10).map((item, index) => ({
    id: index + 1,
    title: stripMarkup(item.title),
    url: String(item.url || ''),
    snippet: stripMarkup(item.snippet),
    source: String(item.source || result.provider || 'web'),
  })).filter(item => item.url.startsWith('https://'));
  if (!items.length) throw new Error('No public research sources were returned. Configure Google Programmable Search for broader results.');
  const evidence = items.map(item => `[${item.id}] ${item.title}\nSource: ${item.source}\nURL: ${item.url}\nEvidence: ${item.snippet}`).join('\n\n');
  return { query, provider: result.provider, searchedAt: result.searchedAt, items, evidence };
}
