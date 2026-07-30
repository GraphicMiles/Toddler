/**
 * Intent Router
 * 
 * Replaces the pre-LLM keyword/regex gate with LLM-driven intent classification.
 * The model decides what the user wants using full conversation context, not just
 * regex patterns on the current message.
 * 
 * Also maintains a pending-intent slot: when the agent asks a clarifying question,
 * the next user message is parsed as an answer to that question first.
 */

// Pending intent state - tracks what the agent is waiting for
let pendingIntent = null;

export function setPendingIntent(intent) {
  pendingIntent = intent;
}

export function getPendingIntent() {
  return pendingIntent;
}

export function clearPendingIntent() {
  pendingIntent = null;
}

// Check if a message looks like an answer to a pending question
export function tryResolvePendingIntent(message) {
  if (!pendingIntent) return null;
  
  const text = String(message).trim();
  const { expecting, context } = pendingIntent;
  
  // URL was requested, check if message contains one
  if (expecting === 'github_url') {
    const urlMatch = text.match(/https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?/i);
    if (urlMatch) {
      const resolved = {
        type: 'git_clone',
        repository: urlMatch[0],
        originalRequest: context.originalRequest || '',
        branch: '',
      };
      clearPendingIntent();
      return resolved;
    }
  }
  
  // Filename was requested
  if (expecting === 'filename') {
    const fileMatch = text.match(/\b[\w.-]+\.(js|jsx|ts|tsx|json|py|java|kt|cpp|css|html|md|txt|yml|yaml)\b/i);
    if (fileMatch) {
      const resolved = {
        type: 'create_file_with_name',
        filename: fileMatch[0],
        originalRequest: context.originalRequest || '',
      };
      clearPendingIntent();
      return resolved;
    }
  }
  
  // Confirmation expected
  if (expecting === 'confirmation') {
    if (/^(yes|yeah|yep|sure|ok|okay|go ahead|do it|proceed|continue|y)[\s.!]*$/i.test(text)) {
      const resolved = { type: 'confirmed', originalRequest: context.originalRequest || '' };
      clearPendingIntent();
      return resolved;
    }
    if (/^(no|nope|nah|cancel|stop|don'?t)[\s.!]*$/i.test(text)) {
      clearPendingIntent();
      return { type: 'cancelled' };
    }
  }
  
  // Pending intent didn't match - clear it after 2 failed attempts
  if (!pendingIntent.attempts) pendingIntent.attempts = 0;
  pendingIntent.attempts++;
  if (pendingIntent.attempts >= 2) clearPendingIntent();
  
  return null;
}

// LLM-driven intent classification
export async function classifyIntent(provider, model, messages, signal) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const systemPrompt = `You are an intent classifier for a coding assistant. Given the conversation and the user's latest message, determine what action to take.

Current date: ${currentDate}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "intent": "chat" | "research" | "git" | "terminal" | "github_api" | "code_change" | "clarification",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "params": {} // intent-specific parameters
}

Intent guidelines:
- "research": Questions about current events, schedules, scores, recent facts, "when is", "who won", "latest", "currently", time-sensitive queries, or anything that needs up-to-date information. Include { "query": "optimized search query" } in params.
- "git": Requests to clone, pull, push, commit, fetch, rebase, checkout, or any git operation. Include { "operation": "...", "repository": "URL if present" } in params.
- "terminal": Requests to run shell commands, execute scripts, or system operations. Include { "command": "..." } in params.
- "github_api": GitHub API operations (issues, PRs, workflows, etc). Include { "method": "...", "path": "..." } in params.
- "code_change": Requests to create, modify, fix, or refactor code files. Include { "description": "..." } in params.
- "clarification": Message is too ambiguous to act on, needs a follow-up question. Include { "question": "what to ask" } in params.
- "chat": General conversation, explanations, or questions that don't need tools.

Entity resolution: If the message is short/ambiguous (e.g., "how old is mess"), check recent conversation for context. If the conversation was about football/Messi/Ronaldo, "mess" likely means "Messi". Prefer the contextually obvious interpretation over a literal reading. Set intent accordingly and note the resolution in reasoning.`;

  let response = '';
  try {
    const result = await provider.stream({
      model,
      signal,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-6), // Last 6 messages for context
      ],
      onToken: (token) => { response += token; },
    });
    
    // Parse the JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: parsed.intent || 'chat',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
        params: parsed.params || {},
        provider: result,
      };
    }
  } catch (error) {
    console.warn('Intent classification failed, falling back to chat:', error);
  }
  
  return { intent: 'chat', confidence: 0.5, reasoning: 'Fallback to chat', params: {} };
}

// Check if a query needs current/live information (for research triggering)
export function needsCurrentInformation(message) {
  const text = String(message).toLowerCase();
  
  // Time-sensitive keywords
  const timeSensitivePatterns = [
    /\b(when is|when does|when will|when was)\b/i,
    /\b(latest|current|today|now|recently|newest)\b/i,
    /\b(who won|score|result|standing|champion)\b/i,
    /\b(2024|2025|2026|this year|last year|this season|last season)\b/i,
    /\b(start|start(s|ed|ing)|begin|release|launch|premiere)\b.*\b(date|when|time)\b/i,
    /\b(how old is|age of|born)\b/i,
    /\b(still|currently|now)\b.*\b(play|work|live|coach|manage)\b/i,
  ];
  
  return timeSensitivePatterns.some(pattern => pattern.test(text));
}

// Resolve entities from conversation context
export function resolveEntityFromContext(message, recentMessages) {
  const text = String(message).trim().toLowerCase();
  
  // If message is very short (< 15 chars) and ambiguous, check context
  if (text.length > 15) return null;
  
  // Look for named entities in recent messages
  const contextText = recentMessages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-6)
    .map(m => m.content)
    .join(' ')
    .toLowerCase();
  
  // Common entity corrections/ambiguities
  const entityMap = {
    'mess': 'Messi',
    'ronaldo': 'Cristiano Ronaldo',
    'cr7': 'Cristiano Ronaldo',
    'mbappe': 'Kylian Mbappé',
    'neymar': 'Neymar Jr',
  };
  
  for (const [ambiguous, resolved] of Object.entries(entityMap)) {
    if (text.includes(ambiguous) && contextText.includes(resolved.toLowerCase())) {
      return { original: ambiguous, resolved, confidence: 0.8 };
    }
  }
  
  // Check if any word in the message is close to a word in context (typo tolerance)
  const messageWords = text.split(/\s+/).filter(w => w.length > 2);
  const contextWords = new Set(contextText.split(/\s+/).filter(w => w.length > 3));
  
  for (const word of messageWords) {
    for (const contextWord of contextWords) {
      if (levenshteinDistance(word, contextWord) <= 2 && contextWord.length > 4) {
        return { original: word, resolved: contextWord, confidence: 0.7 };
      }
    }
  }
  
  return null;
}

// Simple Levenshtein distance for typo detection
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
