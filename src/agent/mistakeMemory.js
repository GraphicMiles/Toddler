/**
 * Mistake Memory
 *
 * Every failure becomes a lesson: problem → root cause → how it was fixed. Later,
 * when a similar situation arises, the relevant lesson is recalled and injected
 * so the agent avoids repeating the same mistake. Near-free (local, semantic
 * recall) and makes the agent visibly "learn."
 */

import { embed, cosineSimilarity } from '../memory/semanticVector.js';

const KEY = 'forgeai_mistake_memory_v1';
const MAX = 200;
const MIN_SIMILARITY = 0.22;

function load() {
  if (typeof localStorage === 'undefined') return [];
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function save(list) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); }
  catch (e) { console.warn('mistakeMemory save failed', e); }
}

export class MistakeMemory {
  constructor() { this.items = load(); }

  /**
   * Record a mistake and its resolution.
   * @param {object} m { problem, rootCause, fix, category?, success? }
   */
  record({ problem = '', rootCause = '', fix = '', category = 'general', success = true } = {}) {
    if (!problem && !rootCause) return null;
    const entry = {
      id: `mis-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      problem: String(problem).slice(0, 500),
      rootCause: String(rootCause).slice(0, 500),
      fix: String(fix).slice(0, 800),
      category,
      success: !!success,
      embedding: embed(`${problem} ${rootCause} ${fix}`),
    };
    this.items.push(entry);
    save(this.items);
    return entry.id;
  }

  /** Recall lessons relevant to the current situation (semantic). */
  recall(query, { limit = 3, minSimilarity = MIN_SIMILARITY } = {}) {
    if (!query || this.items.length === 0) return [];
    const qv = embed(query);
    return this.items
      .map(it => ({ it, sim: cosineSimilarity(qv, it.embedding || embed(`${it.problem} ${it.rootCause} ${it.fix}`)) }))
      .filter(x => x.sim >= minSimilarity)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, limit)
      .map(x => x.it);
  }

  /** A compact prompt block of relevant past mistakes, or '' if none. */
  getPrompt(query, opts = {}) {
    const hits = this.recall(query, opts);
    if (!hits.length) return '';
    const lines = ['LESSONS FROM PAST MISTAKES (avoid repeating these):'];
    for (const h of hits) {
      lines.push(`- Problem: ${h.problem}${h.rootCause ? ` | Cause: ${h.rootCause}` : ''}${h.fix ? ` | Fix: ${h.fix}` : ''}`);
    }
    return lines.join('\n');
  }

  clear() { this.items = []; if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY); }
}

export const mistakeMemory = new MistakeMemory();
