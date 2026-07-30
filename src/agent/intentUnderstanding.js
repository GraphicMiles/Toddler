/**
 * Intent Understanding Layer
 *
 * A robust, deterministic pre-router that turns vague, colloquial, or
 * typo-ridden human input into a normalized, actionable interpretation BEFORE
 * the keyword gates / agentic loop see it. The goal is that the agent
 * understands what a person *means*, not just the literal words.
 *
 * It classifies a message across many request families and returns:
 *   { category, action, confidence, normalized, needs, reasons }
 *
 * This is intentionally rule-based (not an extra model call): it runs instantly,
 * offline, and is exhaustively testable across every request type. It augments
 * the LLM — the agentic loop still does the real work — but it removes the
 * "computer says what?" literalism that makes an agent feel dumb.
 */

// ---- normalization -------------------------------------------------------

// Common typos / shorthand → canonical words. Keeps matching robust to how
// people actually type on a phone.
const TYPO_MAP = {
  repo: 'repository', repos: 'repositories', reply: 'reply',
  funtion: 'function', functon: 'function', fucntion: 'function',
  compnent: 'component', compoent: 'component', comonent: 'component',
  databse: 'database', datbase: 'database', dependancy: 'dependency',
  authetication: 'authentication', autentication: 'authentication',
  navigaton: 'navigation', navber: 'navbar', wesbite: 'website',
  webiste: 'website', pge: 'page', flie: 'file', fiel: 'file',
  claer: 'clear', delelte: 'delete', delet: 'delete', remvoe: 'remove',
  updaet: 'update', udpate: 'update', instal: 'install', instll: 'install',
  commmit: 'commit', comit: 'commit', puhs: 'push', psuh: 'push',
};

export function normalizeText(message = '') {
  let text = String(message).trim();
  // Collapse whitespace.
  text = text.replace(/\s+/g, ' ');
  // Token-wise typo correction (case-insensitive, preserve nothing fancy).
  text = text.replace(/[a-z]+/gi, word => {
    const lower = word.toLowerCase();
    return TYPO_MAP[lower] || word;
  });
  return text;
}

// ---- reference / vagueness detection ------------------------------------

const VAGUE_PRONOUNS = /\b(it|that|this|these|those|them|the file|the code|the repo|the repository|the project|the function|the bug|the error|the page|the site|the app)\b/i;
const IMPERATIVE_ONLY = /^(fix|change|update|improve|make|do|run|build|create|add|remove|delete|refactor|optimi[sz]e|clean|redo|redesign|continue|retry|again)\b/i;

// A message is "vague" if it references something without naming it and gives no
// concrete target (no filename, url, or explicit noun).
export function isVague(message = '') {
  const text = String(message).trim();
  if (!text) return true;
  const words = text.split(/\s+/).filter(Boolean);
  const hasConcreteTarget = /\.[a-z0-9]{1,5}\b/i.test(text) // filename
    || /https?:\/\//i.test(text) // url
    || /[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(text); // owner/repo or path
  if (hasConcreteTarget) return false;
  if (words.length <= 2 && IMPERATIVE_ONLY.test(text)) return true;
  if (VAGUE_PRONOUNS.test(text) && !hasConcreteTarget && words.length <= 6) return true;
  return false;
}

// ---- category classification --------------------------------------------

// Ordered families: the first match wins. Each has a canonical action + the info
// it typically needs to proceed.
const FAMILIES = [
  {
    category: 'git',
    action: 'git_operation',
    test: t => /\b(clone|pull|push|fetch|commit|rebase|checkout|merge|stage|stash)\b/i.test(t)
      || /\b(my|the)\s+(repo|repository)\b/i.test(t)
      || /https?:\/\/(github|gitlab|bitbucket)\.com\//i.test(t),
    needs: t => (/https?:\/\/|[\w.-]+\/[\w.-]+/.test(t) ? [] : ['repository URL']),
  },
  {
    category: 'terminal',
    action: 'run_terminal',
    test: t => /\b(run|execute)\b.{0,20}\b(command|script|terminal|shell|npm|node|tests?|build|lint)\b/i.test(t)
      || /\bnpm (install|run|tests?|start|build)\b/i.test(t),
    needs: () => [],
  },
  {
    category: 'file_create',
    action: 'create',
    test: t => /\b(create|make|add|new|generate|scaffold|build)\b/i.test(t)
      && /\b(file|folder|directory|component|page|website|landing page|app|script|stylesheet|readme|config|project|module|class|test)\b/i.test(t),
    needs: () => [],
  },
  {
    category: 'code_edit',
    action: 'edit',
    test: t => /\b(fix|change|update|modify|refactor|replace|patch|correct|optimi[sz]e|remove|rename|improve|clean up|rewrite|implement|add)\b/i.test(t)
      && /\b(code|file|function|method|class|component|bug|error|feature|logic|import|export|variable|style|css|html|test)\b/i.test(t),
    needs: t => (/\.[a-z0-9]{1,5}\b/i.test(t) ? [] : ['which file or function']),
  },
  {
    category: 'read_inspect',
    action: 'read',
    test: t => /\b(read|open|show|view|display|list|find|locate|search|look at|inspect|check|review|analy[sz]e|summari[sz]e|explain|trace|understand|where is|what does)\b/i.test(t)
      && /\b(file|files|folder|code|codebase|project|repo|function|method|class|component|module|package\.json|readme|config|import|structure)\b/i.test(t),
    needs: () => [],
  },
  {
    category: 'research',
    action: 'web_search',
    test: t => /\b(who is|what is|when is|where is|latest|current|news|today|price of|how old|search online|look up|google)\b/i.test(t),
    needs: () => [],
  },
  {
    category: 'explain',
    action: 'answer',
    test: t => /\b(explain|how do i|how to|what'?s the difference|why does|help me understand|teach me|describe)\b/i.test(t),
    needs: () => [],
  },
  {
    category: 'delete',
    action: 'delete',
    test: t => /\b(delete|remove|drop|erase|get rid of)\b/i.test(t),
    needs: t => (/\.[a-z0-9]{1,5}\b|\b[\w-]+\/[\w-]+/i.test(t) ? [] : ['what to delete']),
  },
  {
    category: 'chitchat',
    action: 'answer',
    test: t => /^(hi|hey|hello|yo|sup|good (morning|afternoon|evening)|thanks|thank you|ok(ay)?|cool|nice|great)\b/i.test(t),
    needs: () => [],
  },
];

/**
 * Understand a user message. Returns a normalized interpretation.
 *
 * @param {string} message
 * @param {object} [ctx]
 * @param {Array}  [ctx.history]  prior messages (for reference resolution)
 * @returns {{category,action,confidence,normalized,needs,vague,reasons}}
 */
export function understand(message = '', ctx = {}) {
  const normalized = normalizeText(message);
  const reasons = [];
  const vague = isVague(normalized);
  if (vague) reasons.push('message is vague / references something unnamed');

  // Reference resolution: if vague and history has a concrete anchor, attach it.
  let resolvedTarget = '';
  if (vague && Array.isArray(ctx.history)) {
    resolvedTarget = lastConcreteTarget(ctx.history);
    if (resolvedTarget) reasons.push(`resolved reference to "${resolvedTarget}" from context`);
  }

  let matched = null;
  for (const family of FAMILIES) {
    if (family.test(normalized)) { matched = family; break; }
  }

  const category = matched?.category || (vague ? 'ambiguous' : 'chat');
  const action = matched?.action || 'answer';
  const needs = matched ? matched.needs(normalized) : (vague ? ['a concrete goal or target'] : []);

  // Confidence: strong when a family matched and nothing is missing; weak when
  // vague with no resolvable target.
  let confidence = 0.5;
  if (matched) confidence = needs.length === 0 ? 0.9 : 0.6;
  if (vague && !resolvedTarget) confidence = Math.min(confidence, 0.4);
  if (vague && resolvedTarget) { confidence = Math.max(confidence, 0.7); }
  if (category === 'chitchat') confidence = 0.95;

  return {
    category,
    action,
    confidence: Math.max(0, Math.min(1, confidence)),
    normalized: resolvedTarget && vague ? `${normalized} (${resolvedTarget})` : normalized,
    resolvedTarget: resolvedTarget || undefined,
    needs,
    vague,
    reasons,
  };
}

// Find the most recent concrete target (filename, url, owner/repo) in history.
function lastConcreteTarget(history) {
  for (let i = history.length - 1; i >= 0; i--) {
    const content = typeof history[i]?.content === 'string' ? history[i].content : '';
    const file = content.match(/\b(?:[\w.-]+\/)*[\w.-]+\.(?:js|jsx|ts|tsx|json|css|scss|html|md|py|java|kt|go|rs|rb|php|c|cpp|h|yml|yaml|sh|txt)\b/i);
    if (file) return file[0];
    const url = content.match(/https?:\/\/[^\s]+/i);
    if (url) return url[0];
    const repo = content.match(/\b[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\b/);
    if (repo) return repo[0];
  }
  return '';
}
