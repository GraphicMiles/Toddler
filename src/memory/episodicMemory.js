/**
 * Episodic Memory System for ForgeAI (Android Optimized)
 * Stores interactions with semantic search capability
 */

const MEMORY_KEY = 'forgeai_episodic_memory';
const MAX_MEMORIES = 500;

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
    const entry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      task: memory.task || '',
      outcome: memory.outcome || '',
      success: memory.success ?? true,
      analysis: memory.analysis || '',
      tags: memory.tags || [],
      embedding: memory.embedding || null, // Future: vector embedding
    };

    this.memories.push(entry);
    this.save();
    return entry.id;
  }

  /**
   * Semantic recall (keyword overlap + recency).
   *
   * A memory only qualifies when it shares real content with the query
   * (relevanceScore > 0). Recency then orders the survivors — it can never
   * promote an unrelated memory on its own. Without this floor, the recency
   * boost alone made every recent memory "match" any message, leaking stale
   * entities (e.g. a football answer) into unrelated turns.
   */
  recall(query, limit = 5, { minRelevance = 1 } = {}) {
    if (!query) return [];

    const queryTokens = tokenize(query);
    if (!queryTokens.size) return [];

    const scored = this.memories.map(mem => {
      const text = `${mem.task} ${mem.outcome} ${mem.analysis}`.toLowerCase();
      const memTokens = tokenize(text);

      // Relevance = number of meaningful query tokens present in the memory.
      let relevance = 0;
      for (const token of queryTokens) {
        if (memTokens.has(token)) relevance += 1;
      }
      // Whole-phrase and tag hits are strong signals.
      const q = query.toLowerCase().trim();
      if (q.length >= 4 && text.includes(q)) relevance += 2;
      if (mem.tags.some(t => queryTokens.has(t.toLowerCase()))) relevance += 1;

      // Recency only orders memories that already cleared the relevance floor.
      const age = (Date.now() - mem.timestamp) / (1000 * 60 * 60 * 24);
      const recency = Math.max(0, 2 - age * 0.1);

      return { ...mem, relevance, score: relevance + recency };
    });

    return scored
      .filter(m => m.relevance >= minRelevance)
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