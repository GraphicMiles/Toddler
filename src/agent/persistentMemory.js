/**
 * Persistent Cross-Session Memory
 * 
 * Unlike the per-conversation episodic memory, this persists across sessions.
 * Uses tag-based retrieval and relevance scoring for better recall.
 * Stores: user preferences, project facts, learned patterns, past solutions.
 */

const MEMORY_KEY = 'forgeai_persistent_memory_v2';
const MAX_ENTRIES = 1000;

// Memory categories
export const MEMORY_CATEGORIES = Object.freeze({
  USER_PREFERENCE: 'user_preference',
  PROJECT_FACT: 'project_fact',
  LEARNED_PATTERN: 'learned_pattern',
  PAST_SOLUTION: 'past_solution',
  ERROR_FIX: 'error_fix',
  TOOL_USAGE: 'tool_usage',
  ENTITY: 'entity',
});

class PersistentMemory {
  constructor() {
    this.entries = [];
    this.tags = new Map(); // tag -> Set of entry IDs
    this.load();
  }

  load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]');
      this.entries = Array.isArray(data) ? data : [];
      this.rebuildTagIndex();
    } catch {
      this.entries = [];
    }
  }

  save() {
    if (typeof localStorage === 'undefined') return;
    try {
      // Prune old entries if over limit
      if (this.entries.length > MAX_ENTRIES) {
        this.entries = this.entries
          .sort((a, b) => (b.relevance || 0) + b.timestamp - (a.relevance || 0) - a.timestamp)
          .slice(0, MAX_ENTRIES);
      }
      localStorage.setItem(MEMORY_KEY, JSON.stringify(this.entries));
    } catch (error) {
      console.warn('Failed to save persistent memory:', error);
    }
  }

  rebuildTagIndex() {
    this.tags.clear();
    for (const entry of this.entries) {
      for (const tag of (entry.tags || [])) {
        if (!this.tags.has(tag)) this.tags.set(tag, new Set());
        this.tags.get(tag).add(entry.id);
      }
    }
  }

  /**
   * Store a new memory entry.
   */
  store({ content, category, tags = [], relevance = 0.5, metadata = {} }) {
    if (!content || typeof content !== 'string') return null;

    const entry = {
      id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: content.trim().slice(0, 4000),
      category: category || MEMORY_CATEGORIES.PROJECT_FACT,
      tags: [...new Set(tags.map(t => String(t).toLowerCase().trim()).filter(Boolean))],
      relevance: Math.max(0, Math.min(1, relevance)),
      metadata,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.entries.push(entry);

    // Update tag index
    for (const tag of entry.tags) {
      if (!this.tags.has(tag)) this.tags.set(tag, new Set());
      this.tags.get(tag).add(entry.id);
    }

    this.save();
    return entry.id;
  }

  /**
   * Recall relevant memories for a query.
   * Uses tag matching, keyword overlap, recency, and access frequency.
   */
  recall(query, { limit = 10, category = null, minRelevance = 0 } = {}) {
    if (!query) return [];

    const queryLower = query.toLowerCase();
    const queryWords = new Set(queryLower.split(/\s+/).filter(w => w.length >= 3));
    const queryTags = this.extractTags(query);

    const scored = this.entries
      .filter(entry => !category || entry.category === category)
      .filter(entry => entry.relevance >= minRelevance)
      .map(entry => {
        let score = 0;

        // Tag match (strongest signal)
        for (const tag of entry.tags) {
          if (queryTags.has(tag)) score += 3;
          if (queryLower.includes(tag)) score += 1;
        }

        // Keyword overlap
        const entryWords = new Set(entry.content.toLowerCase().split(/\s+/).filter(w => w.length >= 3));
        for (const word of queryWords) {
          if (entryWords.has(word)) score += 1;
        }

        // Category match bonus
        if (category && entry.category === category) score += 1;

        // Recency (decay over 30 days)
        const ageDays = (Date.now() - entry.timestamp) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 2 - ageDays * 0.07);

        // Access frequency (frequently recalled = more relevant)
        score += Math.min(2, (entry.accessCount || 0) * 0.2);

        // Base relevance
        score += entry.relevance;

        return { ...entry, score };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Update access counts
    for (const entry of scored) {
      const original = this.entries.find(e => e.id === entry.id);
      if (original) {
        original.accessCount = (original.accessCount || 0) + 1;
        original.lastAccessed = Date.now();
      }
    }
    if (scored.length > 0) this.save();

    return scored;
  }

  /**
   * Extract potential tags from a query string.
   */
  extractTags(text) {
    const tags = new Set();
    const lower = text.toLowerCase();

    // Programming languages
    const languages = ['javascript', 'typescript', 'python', 'java', 'kotlin', 'rust', 'go', 'ruby', 'css', 'html', 'sql', 'bash'];
    for (const lang of languages) {
      if (lower.includes(lang)) tags.add(lang);
    }

    // Tools/frameworks
    const tools = ['react', 'node', 'npm', 'git', 'docker', 'webpack', 'vite', 'jest', 'pytest', 'gradle', 'maven'];
    for (const tool of tools) {
      if (lower.includes(tool)) tags.add(tool);
    }

    // Action types
    const actions = ['bug', 'fix', 'error', 'refactor', 'feature', 'test', 'deploy', 'build', 'debug', 'optimize'];
    for (const action of actions) {
      if (lower.includes(action)) tags.add(action);
    }

    return tags;
  }

  /**
   * Store a learned solution (problem → fix mapping).
   */
  storeSolution({ problem, solution, tools = [], files = [] }) {
    const tags = [...tools, ...this.extractTags(problem), ...this.extractTags(solution)];
    return this.store({
      content: `Problem: ${problem}\nSolution: ${solution}\nTools: ${tools.join(', ')}\nFiles: ${files.join(', ')}`,
      category: MEMORY_CATEGORIES.PAST_SOLUTION,
      tags,
      relevance: 0.8,
      metadata: { problem, solution, tools, files },
    });
  }

  /**
   * Store an error fix (error → resolution mapping).
   */
  storeErrorFix({ error, fix, context = '' }) {
    const tags = ['error-fix', ...this.extractTags(error), ...this.extractTags(fix)];
    return this.store({
      content: `Error: ${error}\nFix: ${fix}${context ? `\nContext: ${context}` : ''}`,
      category: MEMORY_CATEGORIES.ERROR_FIX,
      tags,
      relevance: 0.9,
      metadata: { error, fix, context },
    });
  }

  /**
   * Store a user preference.
   */
  storePreference({ preference, value, context = '' }) {
    return this.store({
      content: `User prefers: ${preference} = ${value}${context ? ` (${context})` : ''}`,
      category: MEMORY_CATEGORIES.USER_PREFERENCE,
      tags: ['preference', preference.toLowerCase()],
      relevance: 0.7,
      metadata: { preference, value, context },
    });
  }

  /**
   * Get memory formatted as a prompt injection.
   */
  getMemoryPrompt(query, { limit = 8 } = {}) {
    const memories = this.recall(query, { limit });
    if (memories.length === 0) return '';

    const lines = memories.map(m => `- [${m.category}] ${m.content.slice(0, 200)}`);
    return `RELEVANT PAST EXPERIENCES:\n${lines.join('\n')}\n\nUse these past experiences to inform your response. Do not mention them unless directly relevant.`;
  }

  /**
   * Get all entries for a specific category.
   */
  getByCategory(category) {
    return this.entries.filter(e => e.category === category);
  }

  /**
   * Delete a specific memory entry.
   */
  delete(id) {
    const index = this.entries.findIndex(e => e.id === id);
    if (index < 0) return false;
    const entry = this.entries[index];
    for (const tag of entry.tags) {
      this.tags.get(tag)?.delete(id);
    }
    this.entries.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * Clear all memories.
   */
  clear() {
    this.entries = [];
    this.tags.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(MEMORY_KEY);
    }
  }

  /**
   * Get stats about the memory store.
   */
  stats() {
    const categories = {};
    for (const entry of this.entries) {
      categories[entry.category] = (categories[entry.category] || 0) + 1;
    }
    return {
      total: this.entries.length,
      categories,
      tags: this.tags.size,
    };
  }
}

// Singleton
export const persistentMemory = new PersistentMemory();
