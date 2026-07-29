/**
 * Episodic Memory System for ForgeAI (Android Optimized)
 * Stores interactions with semantic search capability
 */

const MEMORY_KEY = 'forgeai_episodic_memory';
const MAX_MEMORIES = 500;

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
    } catch (_e) {
      console.warn('Failed to load episodic memory');
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
    } catch (_e) {
      console.warn('Failed to save episodic memory');
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
   * Semantic recall (simple keyword + recency for now)
   */
  recall(query, limit = 5) {
    if (!query) return [];

    const q = query.toLowerCase();
    const scored = this.memories.map(mem => {
      let score = 0;
      const text = `${mem.task} ${mem.outcome} ${mem.analysis}`.toLowerCase();

      if (text.includes(q)) score += 3;
      if (mem.tags.some(t => t.toLowerCase().includes(q))) score += 2;

      // Recency boost
      const age = (Date.now() - mem.timestamp) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 2 - age * 0.1);

      return { ...mem, score };
    });

    return scored
      .filter(m => m.score > 0)
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