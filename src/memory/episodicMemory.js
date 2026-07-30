/**
 * Episodic Memory System for ForgeAI (Android Optimized)
 * Stores interactions with semantic search capability
 */

import { embed, cosineSimilarity } from './semanticVector.js';

const MEMORY_KEY = 'forgeai_episodic_memory';
const MAX_MEMORIES = 500;
// Minimum cosine similarity for a memory to be considered semantically relevant.
// Tuned so genuine paraphrases/typos qualify while common-word trigram noise
// between unrelated sentences (~0.15-0.20) does not.
const MIN_SIMILARITY = 0.25;

// Generic words that appear in almost every request. Matching on these would
// make unrelated memories look relevant, so they are excluded from scoring.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'to', 'of', 'in', 'on',
  'at', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'this', 'that', 'these',
  'those', 'my', 'me', 'i', 'you', 'your', 'we', 'so', 'can', 'will', 'want',
  'need', 'please', 'just', 'now', 'all', 'any', 'some', 'how', 'what', 'who',
  'when', 'where', 'why', 'do', 'does', 'did', 'get', 'got', 'make', 'made',
  'file', 'files', 'create', 'created', 'work', 'working', 'task', 'used',
  'using', 'general', 'assistance', 'completed', 'successfully',
]);

// Split text into meaningful lowercase tokens (4+ chars, non-stopword).
function tokenize(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 4 && !STOPWORDS.has(word)),
  );
}

export class EpisodicMemory {
  constructor() {
    this.memories = [];
    this.load();
  }

  load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = localStorage.getItem(MEMORY_KEY);
      if (data) {
        this.memories = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load episodic memory:', error);
    }
  }

  save() {
    if (typeof localStorage === 'undefined') return;
    try {
      // Keep only recent memories
      if (this.memories.length > MAX_MEMORIES) {
        this.memories = this.memories.slice(-MAX_MEMORIES);
      }
      localStorage.setItem(MEMORY_KEY, JSON.stringify(this.memories));
    } catch (error) {
      console.warn('Failed to save episodic memory:', error);
    }
  }

  /**
   * Store a new memory
   */
  store(memory) {
    const task = memory.task || '';
    const outcome = memory.outcome || '';
    const analysis = memory.analysis || '';
    const tags = memory.tags || [];
    const entry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      task,
      outcome,
      success: memory.success ?? true,
      analysis,
      tags,
      // Precomputed sparse semantic vector for fast, offline recall.
      embedding: memory.embedding || embed(`${task} ${outcome} ${analysis} ${tags.join(' ')}`),
    };

    this.memories.push(entry);
    this.save();
    return entry.id;
  }

  /**
   * Semantic recall (embedding cosine similarity + keyword overlap + recency).
   *
   * A memory qualifies when it is semantically similar to the query (cosine ≥
   * MIN_SIMILARITY) OR shares meaningful tokens with it. Semantic similarity
   * catches typos and word variations that exact token matching misses, while
   * the token floor keeps precision high. Recency only orders survivors — it can
   * never promote an unrelated memory on its own, so stale entities (e.g. a
   * football answer) never leak into unrelated turns.
   */
  recall(query, limit = 5, { minRelevance = 1, minSimilarity = MIN_SIMILARITY } = {}) {
    if (!query) return [];

    const queryTokens = tokenize(query);
    const queryVec = embed(query);
    if (!queryTokens.size && Object.keys(queryVec).length === 0) return [];

    const scored = this.memories.map(mem => {
      const text = `${mem.task} ${mem.outcome} ${mem.analysis}`.toLowerCase();
      const memTokens = tokenize(text);

      // Token relevance = number of meaningful query tokens present in memory.
      let relevance = 0;
      for (const token of queryTokens) {
        if (memTokens.has(token)) relevance += 1;
      }
      // Whole-phrase and tag hits are strong signals.
      const q = query.toLowerCase().trim();
      if (q.length >= 4 && text.includes(q)) relevance += 2;
      if (mem.tags.some(t => queryTokens.has(t.toLowerCase()))) relevance += 1;

      // Semantic similarity via cached embedding (rebuild lazily if missing).
      const memVec = mem.embedding || embed(`${mem.task} ${mem.outcome} ${mem.analysis} ${(mem.tags || []).join(' ')}`);
      const similarity = cosineSimilarity(queryVec, memVec);

      // A memory is relevant if it clears EITHER the token floor or the
      // semantic-similarity floor.
      const qualifies = relevance >= minRelevance || similarity >= minSimilarity;

      // Recency only orders memories that already qualified.
      const age = (Date.now() - mem.timestamp) / (1000 * 60 * 60 * 24);
      const recency = Math.max(0, 2 - age * 0.1);

      return { ...mem, relevance, similarity, qualifies, score: relevance + similarity * 3 + recency };
    });

    return scored
      .filter(m => m.qualifies)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get lessons learned for a task type
   */
  getLessons(taskType, limit = 3) {
    return this.memories
      .filter(m => m.task.toLowerCase().includes(taskType.toLowerCase()) && m.analysis)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(m => m.analysis);
  }

  clear() {
    this.memories = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(MEMORY_KEY);
    }
  }
}

export const episodicMemory = new EpisodicMemory();