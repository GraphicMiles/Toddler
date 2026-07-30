/**
 * Conversation Context Engine
 * 
 * Tracks entities, topics, and references across the conversation.
 * Resolves vague/ambiguous user input using conversational context.
 * Handles pronouns, references, and topic continuity.
 */

// Entity types we track
const ENTITY_TYPES = {
  PERSON: 'person',
  REPOSITORY: 'repository',
  FILE: 'file',
  TOPIC: 'topic',
  CONCEPT: 'concept',
  URL: 'url',
  COMMAND: 'command',
  LANGUAGE: 'language',
};

// Pronoun resolution map
const PRONOUN_MAP = {
  he: ENTITY_TYPES.PERSON,
  she: ENTITY_TYPES.PERSON,
  they: ENTITY_TYPES.PERSON,
  him: ENTITY_TYPES.PERSON,
  her: ENTITY_TYPES.PERSON,
  it: [ENTITY_TYPES.REPOSITORY, ENTITY_TYPES.FILE, ENTITY_TYPES.CONCEPT],
  that: [ENTITY_TYPES.REPOSITORY, ENTITY_TYPES.FILE, ENTITY_TYPES.CONCEPT, ENTITY_TYPES.TOPIC],
  this: [ENTITY_TYPES.REPOSITORY, ENTITY_TYPES.FILE, ENTITY_TYPES.CONCEPT, ENTITY_TYPES.TOPIC],
  'the repo': ENTITY_TYPES.REPOSITORY,
  'the repository': ENTITY_TYPES.REPOSITORY,
  'the project': ENTITY_TYPES.REPOSITORY,
  'the file': ENTITY_TYPES.FILE,
  'the bug': ENTITY_TYPES.CONCEPT,
  'the issue': ENTITY_TYPES.CONCEPT,
  'the code': ENTITY_TYPES.FILE,
  'the function': ENTITY_TYPES.FILE,
  'the component': ENTITY_TYPES.FILE,
};

// Named entity patterns
const ENTITY_PATTERNS = {
  person: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
  repository: /(?:https?:\/\/github\.com\/)?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/g,
  file: /\b([\w.-]+\.(?:js|jsx|ts|tsx|py|java|kt|cpp|c|css|html|json|md|yml|yaml|xml|sh|sql))\b/gi,
  url: /\b(https?:\/\/[^\s)]+)\b/g,
  language: /\b(javascript|typescript|python|java|kotlin|cpp|c\+\+|rust|go|ruby|php|swift|html|css|sql|bash|shell)\b/gi,
  command: /\b(npm|git|docker|kubectl|python|node|cargo|make|gcc|clang)\b/gi,
};

// Topic keywords for continuity tracking
const TOPIC_KEYWORDS = {
  football: ['messi', 'ronaldo', 'cr7', 'neymar', 'mbappe', 'premier league', 'la liga', 'champions league', 'world cup', 'goals', 'club', 'team', 'match', 'score'],
  coding: ['bug', 'fix', 'code', 'function', 'component', 'refactor', 'deploy', 'test', 'build', 'error', 'debug'],
  git: ['clone', 'commit', 'push', 'pull', 'branch', 'merge', 'rebase', 'repo', 'repository', 'github'],
  research: ['search', 'research', 'find', 'look up', 'when is', 'who is', 'latest', 'current'],
};

class ConversationContextEngine {
  constructor() {
    this.entities = new Map(); // type -> [{ value, mentions, lastMentioned }]
    this.currentTopic = null;
    this.topicConfidence = 0;
    this.lastAction = null;
    this.lastQuestion = null;
    this.turnCount = 0;
  }

  /**
   * Process a conversation turn and extract entities/context
   */
  processTurn(messages) {
    this.turnCount++;
    const recentMessages = messages.slice(-10); // Last 10 messages for context

    // Extract entities from all recent messages
    for (const msg of recentMessages) {
      this.extractEntities(msg.content, msg.role);
    }

    // Track topic continuity
    this.updateTopic(recentMessages);

    // Track last action/question from agent
    const lastAssistant = [...recentMessages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      if (this.isQuestion(lastAssistant.content)) {
        this.lastQuestion = lastAssistant.content;
      }
      this.lastAction = this.detectAction(lastAssistant.content);
    }
  }

  /**
   * Extract named entities from text
   */
  extractEntities(text, role = 'user') {
    if (!text) return;

    // People (capitalized names, but filter common words)
    const commonWords = new Set(['The', 'This', 'That', 'What', 'When', 'Where', 'How', 'Why', 'Which', 'Who', 'Does', 'Did', 'Can', 'Could', 'Would', 'Should', 'Will', 'May', 'Might', 'Must', 'Shall', 'And', 'But', 'For', 'Nor', 'Yet', 'So', 'If', 'Then', 'Else', 'Also', 'Just', 'Only', 'Very', 'Really', 'Please', 'Thank', 'Thanks', 'Sorry', 'Hello', 'Hi', 'Hey', 'Okay', 'Yes', 'No', 'Done', 'Try', 'Again', 'Create', 'Fix', 'Add', 'Remove', 'Update', 'Delete', 'Run', 'Clone', 'Push', 'Pull', 'Commit', 'Check', 'Show', 'Tell', 'Explain', 'Define', 'Describe']);
    const personMatches = text.matchAll(ENTITY_PATTERNS.person);
    for (const match of personMatches) {
      const name = match[1].trim();
      if (!commonWords.has(name) && name.length > 2) {
        this.addEntity(ENTITY_TYPES.PERSON, name, role);
      }
    }

    // Repositories
    const repoMatches = text.matchAll(ENTITY_PATTERNS.repository);
    for (const match of repoMatches) {
      this.addEntity(ENTITY_TYPES.REPOSITORY, match[1], role);
    }

    // Files
    const fileMatches = text.matchAll(ENTITY_PATTERNS.file);
    for (const match of fileMatches) {
      this.addEntity(ENTITY_TYPES.FILE, match[1], role);
    }

    // URLs
    const urlMatches = text.matchAll(ENTITY_PATTERNS.url);
    for (const match of urlMatches) {
      this.addEntity(ENTITY_TYPES.URL, match[1], role);
    }

    // Languages
    const langMatches = text.matchAll(ENTITY_PATTERNS.language);
    for (const match of langMatches) {
      this.addEntity(ENTITY_TYPES.LANGUAGE, match[1].toLowerCase(), role);
    }

    // Commands
    const cmdMatches = text.matchAll(ENTITY_PATTERNS.command);
    for (const match of cmdMatches) {
      this.addEntity(ENTITY_TYPES.COMMAND, match[1].toLowerCase(), role);
    }
  }

  /**
   * Add or update an entity in the context
   */
  addEntity(type, value, role = 'user') {
    const key = `${type}:${value.toLowerCase()}`;
    const existing = this.entities.get(key);
    if (existing) {
      existing.mentions++;
      existing.lastMentioned = this.turnCount;
      existing.sources.push(role);
    } else {
      this.entities.set(key, {
        type,
        value,
        mentions: 1,
        lastMentioned: this.turnCount,
        firstMentioned: this.turnCount,
        sources: [role],
      });
    }
  }

  /**
   * Update topic tracking based on recent messages
   */
  updateTopic(messages) {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    let bestTopic = null;
    let bestScore = 0;

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }

    if (bestScore >= 2) {
      this.currentTopic = bestTopic;
      this.topicConfidence = Math.min(1, bestScore / 5);
    } else if (this.turnCount > 3) {
      // Decay topic confidence over time
      this.topicConfidence *= 0.8;
      if (this.topicConfidence < 0.2) {
        this.currentTopic = null;
        this.topicConfidence = 0;
      }
    }
  }

  /**
   * Check if a message is a question
   */
  isQuestion(text) {
    if (!text) return false;
    return text.trim().endsWith('?') || /^(what|which|who|where|when|why|how|can you|could you|do you|would you|should i)\b/i.test(text.trim());
  }

  /**
   * Detect what action the agent last performed
   */
  detectAction(text) {
    if (!text) return null;
    if (/clone|cloned|cloning/i.test(text)) return { type: 'git_clone', detail: text };
    if (/created|creating|new file/i.test(text)) return { type: 'file_create', detail: text };
    if (/patch|modified|updated|changed/i.test(text)) return { type: 'file_patch', detail: text };
    if (/search|research|found.*source/i.test(text)) return { type: 'research', detail: text };
    if (/terminal|command|ran|executed/i.test(text)) return { type: 'terminal', detail: text };
    return { type: 'chat', detail: text };
  }

  /**
   * Resolve vague references in a message using conversation context
   */
  resolveReferences(message) {
    if (!message || !this.entities.size) return { resolved: message, entities: [], confidence: 0 };

    const text = message.toLowerCase().trim();
    const resolvedEntities = [];
    let resolvedText = message;
    let totalConfidence = 0;

    // Check for pronoun references
    for (const [pronoun, expectedTypes] of Object.entries(PRONOUN_MAP)) {
      const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];
      const regex = new RegExp(`\\b${pronoun.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      
      if (regex.test(text)) {
        // Find the most recently mentioned entity of the expected type(s)
        const candidates = [];
        for (const [, entity] of this.entities) {
          if (types.includes(entity.type)) {
            candidates.push(entity);
          }
        }
        
        if (candidates.length > 0) {
          // Sort by recency and mention count
          candidates.sort((a, b) => {
            const recencyDiff = b.lastMentioned - a.lastMentioned;
            if (recencyDiff !== 0) return recencyDiff;
            return b.mentions - a.mentions;
          });
          
          const best = candidates[0];
          const recency = this.turnCount - best.lastMentioned;
          const confidence = Math.max(0.3, 1 - recency * 0.15);
          
          resolvedEntities.push({
            pronoun,
            resolved: best.value,
            type: best.type,
            confidence,
          });
          totalConfidence += confidence;
        }
      }
    }

    // Check for topic-specific entity resolution (e.g., "mess" → "Messi" in football context)
    if (this.currentTopic && this.topicConfidence > 0.5) {
      const topicEntities = this.getEntitiesByType(ENTITY_TYPES.PERSON);
      for (const entity of topicEntities) {
        // Check for common misspellings/truncations
        const entityLower = entity.value.toLowerCase();
        const words = text.split(/\s+/);
        for (const word of words) {
          if (word.length >= 3 && word.length < entityLower.length && entityLower.startsWith(word)) {
            resolvedEntities.push({
              pronoun: word,
              resolved: entity.value,
              type: ENTITY_TYPES.PERSON,
              confidence: 0.7 * this.topicConfidence,
            });
            totalConfidence += 0.7 * this.topicConfidence;
          }
        }
      }
    }

    const avgConfidence = resolvedEntities.length > 0 ? totalConfidence / resolvedEntities.length : 0;

    return {
      resolved: resolvedText,
      entities: resolvedEntities,
      confidence: avgConfidence,
      topic: this.currentTopic,
      topicConfidence: this.topicConfidence,
    };
  }

  /**
   * Get all entities of a specific type
   */
  getEntitiesByType(type) {
    const results = [];
    for (const entity of this.entities.values()) {
      if (entity.type === type) results.push(entity);
    }
    return results.sort((a, b) => b.lastMentioned - a.lastMentioned);
  }

  /**
   * Get the most relevant entity for a vague reference
   */
  getMostRelevantEntity(type) {
    const entities = this.getEntitiesByType(type);
    if (entities.length === 0) return null;
    return entities[0]; // Already sorted by recency
  }

  /**
   * Generate a context-enriched prompt for the LLM
   */
  buildContextPrompt(_userMessage) {
    const parts = [];

    // Add topic context
    if (this.currentTopic && this.topicConfidence > 0.3) {
      parts.push(`Current conversation topic: ${this.currentTopic} (confidence: ${Math.round(this.topicConfidence * 100)}%).`);
    }

    // Add entity context
    const recentEntities = [];
    for (const entity of this.entities.values()) {
      if (this.turnCount - entity.lastMentioned <= 5) {
        recentEntities.push(`${entity.type}: ${entity.value}`);
      }
    }
    if (recentEntities.length > 0) {
      parts.push(`Recently discussed: ${recentEntities.slice(0, 8).join(', ')}.`);
    }

    // Add last action context
    if (this.lastAction && this.lastAction.type !== 'chat') {
      parts.push(`Last agent action: ${this.lastAction.type}.`);
    }

    return parts.join(' ');
  }

  /**
   * Determine if a message needs clarification
   */
  needsClarification(message) {
    const text = message.trim();
    
    // Very short messages with no clear intent
    if (text.length < 5 && !/https?:\/\//.test(text)) {
      return {
        needs: true,
        reason: 'too_vague',
        suggestion: this.generateClarificationQuestion(text),
      };
    }

    // Single word that could be multiple things
    if (/^\w+$/.test(text) && text.length < 10) {
      const entity = this.findMatchingEntity(text);
      if (!entity) {
        return {
          needs: true,
          reason: 'ambiguous_word',
          suggestion: `Did you mean to ask about something specific? I see "${text}" but I'm not sure what you'd like me to do with it.`,
        };
      }
    }

    return { needs: false };
  }

  /**
   * Generate a contextual clarification question
   */
  generateClarificationQuestion(text) {
    // If we have a current topic, ask in context
    if (this.currentTopic) {
      return `I'm not sure what you mean by "${text}". Are you still asking about ${this.currentTopic}? Can you rephrase with more detail?`;
    }

    // If we have recent entities, offer them as context
    const recentPeople = this.getEntitiesByType(ENTITY_TYPES.PERSON).slice(0, 3);
    const recentRepos = this.getEntitiesByType(ENTITY_TYPES.REPOSITORY).slice(0, 3);

    if (recentPeople.length > 0 || recentRepos.length > 0) {
      const context = [
        ...recentPeople.map(p => p.value),
        ...recentRepos.map(r => r.value),
      ].join(', ');
      return `I'm not sure what you mean. Were you referring to ${context}? Or something else?`;
    }

    return `I'm not sure what you'd like me to do. Could you be more specific? For example: ask a question, request a code change, paste a URL to clone, or describe what you need.`;
  }

  /**
   * Find an entity that matches a vague term
   */
  findMatchingEntity(term) {
    const lower = term.toLowerCase();
    for (const entity of this.entities.values()) {
      if (entity.value.toLowerCase().includes(lower) || lower.includes(entity.value.toLowerCase())) {
        return entity;
      }
    }
    return null;
  }

  /**
   * Get a snapshot of the current context state
   */
  snapshot() {
    return {
      turnCount: this.turnCount,
      currentTopic: this.currentTopic,
      topicConfidence: this.topicConfidence,
      lastAction: this.lastAction,
      lastQuestion: this.lastQuestion,
      entityCount: this.entities.size,
      entities: Object.fromEntries(
        Array.from(this.entries()).map(([key, val]) => [key, { ...val }])
      ),
    };
  }

  entries() {
    return this.entities.entries();
  }

  /**
   * Reset the context engine
   */
  reset() {
    this.entities.clear();
    this.currentTopic = null;
    this.topicConfidence = 0;
    this.lastAction = null;
    this.lastQuestion = null;
    this.turnCount = 0;
  }
}

// Singleton instance
export const conversationContext = new ConversationContextEngine();

// Convenience exports
export function processConversationTurn(messages) {
  return conversationContext.processTurn(messages);
}

export function resolveVagueReferences(message) {
  return conversationContext.resolveReferences(message);
}

export function getContextPrompt(userMessage) {
  return conversationContext.buildContextPrompt(userMessage);
}

export function checkNeedsClarification(message) {
  return conversationContext.needsClarification(message);
}

export function resetContext() {
  conversationContext.reset();
}

export function getContextSnapshot() {
  return conversationContext.snapshot();
}
