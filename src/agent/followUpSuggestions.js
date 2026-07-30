/**
 * Follow-up Suggestions
 *
 * After an answer, propose 2-4 contextual next questions/actions — and, when the
 * conversation has touched multiple topics, propose a suggestion that BRIDGES
 * them (e.g. AI + frontend -> "build a site with an AI agent"). This makes the
 * agent feel proactive and conversational instead of one-shot.
 *
 * Pure and deterministic (no model call, no tokens). Category-driven with a
 * lightweight topic memory passed in from the caller.
 */

// Topic detection from free text → normalized topic keys.
const TOPIC_PATTERNS = [
  { key: 'ai', re: /\b(ai|artificial intelligence|llm|model|agent|machine learning|ml|neural|gpt|chatbot)\b/i },
  { key: 'frontend', re: /\b(frontend|front-end|react|vue|svelte|css|html|ui|component|website|landing page|tailwind|design)\b/i },
  { key: 'backend', re: /\b(backend|back-end|server|api|express|node|database|sql|endpoint|auth|firebase)\b/i },
  { key: 'git', re: /\b(git|github|repo|repository|commit|branch|pull request|merge)\b/i },
  { key: 'testing', re: /\b(test|testing|jest|vitest|coverage|unit test|e2e)\b/i },
  { key: 'devops', re: /\b(deploy|deployment|docker|ci\/cd|pipeline|hosting|vercel|netlify)\b/i },
  { key: 'mobile', re: /\b(mobile|android|ios|react native|capacitor|flutter)\b/i },
  { key: 'football', re: /\b(footballer|football|soccer|striker|midfielder|club|league|messi|ronaldo|vinicius)\b/i },
  { key: 'person', re: /\b(born|biography|career|born in|is a|known for)\b/i },
];

export function detectTopics(text) {
  const found = [];
  const s = String(text || '');
  for (const t of TOPIC_PATTERNS) if (t.re.test(s) && !found.includes(t.key)) found.push(t.key);
  return found;
}

// Curated per-category follow-ups.
const CATEGORY_FOLLOWUPS = {
  research: ['Want a deeper breakdown of any specific part?', 'Should I compare this with related options?', 'Want the latest news on this?'],
  code_generate: ['Want me to add tests for this?', 'Should I explain how it works line by line?', 'Want an optimized or TypeScript version?'],
  file_create: ['Want me to add styling or more sections?', 'Should I wire up the backend/logic next?', 'Want me to create tests for it?'],
  code_edit: ['Want me to run the tests to confirm the fix?', 'Should I look for similar issues elsewhere?', 'Want me to explain what was wrong?'],
  read_inspect: ['Want me to refactor or improve any of this?', 'Should I trace how it connects to the rest of the code?', 'Want a summary of the whole module?'],
  explain: ['Want a concrete code example?', 'Should I show common pitfalls?', 'Want me to build a small demo of this?'],
  git: ['Want me to run the tests after this?', 'Should I create a branch and commit the changes?', 'Want me to review the diff first?'],
  text_format: ['Want it in a different format too?', 'Should I save this to a file?', 'Want me to validate the data?'],
  chat: ['Want me to go deeper on this?', 'Should I give you some examples?'],
};

// Cross-topic bridges: when two topics co-occur, offer a connecting idea.
const BRIDGES = [
  { a: 'ai', b: 'frontend', text: 'Want to build a website powered by an AI agent? I can scaffold one in a single shot.' },
  { a: 'ai', b: 'backend', text: 'Want an AI-powered backend/endpoint? I can wire an LLM into an API for you.' },
  { a: 'ai', b: 'mobile', text: 'Want to add an on-device or cloud AI feature to a mobile app?' },
  { a: 'frontend', b: 'backend', text: 'Want me to connect the frontend to a backend so it actually works end to end?' },
  { a: 'frontend', b: 'testing', text: 'Want me to add component tests for that UI?' },
  { a: 'backend', b: 'devops', text: 'Want me to set up deployment for that backend?' },
  { a: 'git', b: 'testing', text: 'Want me to run the tests before committing?' },
  { a: 'ai', b: 'git', text: 'Want an AI agent that reviews your commits or fixes failing tests automatically?' },
];

/**
 * Build follow-up suggestions.
 *
 * @param {object} args
 * @param {string} [args.category]     the classified intent category of this turn
 * @param {string} [args.answer]       the agent's answer text (for topic mining)
 * @param {string} [args.userMessage]  the user's message this turn
 * @param {string[]} [args.priorTopics] topics seen earlier in the conversation
 * @param {number} [args.max]          max suggestions (default 4)
 * @returns {{ suggestions: string[], topics: string[] }}
 */
export function buildFollowUps({ category = 'chat', answer = '', userMessage = '', priorTopics = [], max = 4 } = {}) {
  const currentTopics = detectTopics(`${userMessage} ${answer}`);
  const allTopics = [...new Set([...priorTopics, ...currentTopics])];
  const suggestions = [];

  // 1) Cross-topic bridge first (this is the "connect AI + frontend" behavior).
  for (const bridge of BRIDGES) {
    if (allTopics.includes(bridge.a) && allTopics.includes(bridge.b)) {
      suggestions.push(bridge.text);
      break; // one bridge is enough
    }
  }

  // 2) Category-specific follow-ups.
  const catList = CATEGORY_FOLLOWUPS[category] || CATEGORY_FOLLOWUPS.chat;
  for (const s of catList) {
    if (suggestions.length >= max) break;
    if (!suggestions.includes(s)) suggestions.push(s);
  }

  return { suggestions: suggestions.slice(0, max), topics: allTopics };
}
