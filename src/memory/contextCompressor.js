/**
 * Context Compression System
 * Keeps conversations coherent on small models
 */

export class ContextCompressor {
  constructor(maxTokens = 2500) {
    this.maxTokens = maxTokens;
  }

  /**
   * Compress conversation history
   */
  compress(messages, maxTokens = this.maxTokens) {
    if (!messages || messages.length === 0) return [];

    const userAssistant = messages.filter(m => 
      m.role === 'user' || m.role === 'assistant'
    );

    if (userAssistant.length <= 4) return userAssistant;

    // Simple but effective strategy:
    // Keep first 2 + last 4 messages, summarize middle
    const keepFirst = userAssistant.slice(0, 2);
    const keepLast = userAssistant.slice(-4);

    const middle = userAssistant.slice(2, -4);
    let summary = null;

    if (middle.length > 0) {
      const topics = this.extractTopics(middle);
      summary = {
        role: 'system',
        content: `[Context Summary] Previous discussion covered: ${topics.join(', ')}. Key outcomes: ${this.summarizeOutcomes(middle)}`,
      };
    }

    const compressed = [...keepFirst];
    if (summary) compressed.push(summary);
    compressed.push(...keepLast);

    return compressed;
  }

  extractTopics(messages) {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    const keywords = ['code', 'file', 'bug', 'feature', 'refactor', 'test', 'git', 'research'];
    return keywords.filter(kw => text.includes(kw));
  }

  summarizeOutcomes(messages) {
    const successes = messages.filter(m => 
      m.content.toLowerCase().includes('success') || 
      m.content.toLowerCase().includes('done') ||
      m.content.toLowerCase().includes('completed')
    ).length;

    return successes > 0 ? `${successes} successful actions` : 'ongoing work';
  }
}

export const contextCompressor = new ContextCompressor();