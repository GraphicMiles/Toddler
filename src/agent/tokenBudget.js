/**
 * Token Budget utilities
 *
 * Practical, offline heuristics that reduce how many tokens the agentic loop
 * spends per task — giving mobile/cloud users more runtime per quota:
 *
 *  - estimateTokens: cheap char-based token estimate.
 *  - compactToolResults: rolling compaction of OLD tool results in the message
 *    history so a long multi-step task doesn't carry every full result forever.
 *  - selectRelevantTools: expose only the tools plausibly needed for a request
 *    (a chat turn needs none; a read/plan phase doesn't need git_push), cutting
 *    the schema overhead re-sent every iteration.
 *  - maxTokensForIntent: dynamic output cap by request type (a filename needs
 *    ~50 tokens, not 2000).
 */

// ~4 chars per token is the standard rough estimate for English/code.
export function estimateTokens(text) {
  return Math.ceil(String(text ?? '').length / 4);
}

export function estimateMessagesTokens(messages = []) {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content ?? ''));
    if (Array.isArray(m?.tool_calls)) total += estimateTokens(JSON.stringify(m.tool_calls));
  }
  return total;
}

/**
 * Rolling compaction: keep the last `keepFull` tool-result messages verbatim,
 * and replace older ones with a one-line summary. This is the biggest silent
 * token sink in agentic loops — a read_file result from step 1 does not need to
 * persist in full through step 12.
 *
 * A tool-result message is identified as role 'tool' OR a user message whose
 * content starts with 'Tool "'.
 *
 * @param {Array} messages
 * @param {object} [opts]
 * @param {number} [opts.keepFull=3] how many most-recent tool results to keep whole
 * @param {number} [opts.summaryMax=160] max chars for a compacted summary
 * @returns {Array} new messages array (input not mutated)
 */
export function compactToolResults(messages = [], { keepFull = 3, summaryMax = 160 } = {}) {
  const isToolResult = m =>
    m?.role === 'tool' ||
    (m?.role === 'user' && typeof m?.content === 'string' && m.content.startsWith('Tool "'));

  const indices = [];
  messages.forEach((m, i) => { if (isToolResult(m)) indices.push(i); });
  if (indices.length <= keepFull) return messages.slice();

  const compactSet = new Set(indices.slice(0, indices.length - keepFull));
  return messages.map((m, i) => {
    if (!compactSet.has(i)) return m;
    const raw = typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '');
    return { ...m, content: summarizeToolResult(raw, summaryMax) };
  });
}

function summarizeToolResult(raw, max) {
  const text = String(raw);
  // Try to pull an outcome signal.
  const ok = /"success"\s*:\s*true/.test(text);
  const fail = /"success"\s*:\s*false|"error"/.test(text);
  const pathMatch = text.match(/"path"\s*:\s*"([^"]+)"/);
  const status = fail ? 'failed' : ok ? 'ok' : 'done';
  const where = pathMatch ? ` ${pathMatch[1]}` : '';
  const head = text.replace(/\s+/g, ' ').slice(0, max);
  return `[earlier tool result compacted — ${status}${where}] ${head}${text.length > max ? '…' : ''}`;
}

// Which tools are plausibly relevant for a request. Empty for pure chat.
const TOOL_GROUPS = {
  read: ['read_file', 'list_files', 'search_code'],
  write: ['create_file', 'create_folder', 'write_file', 'delete_file'],
  git: ['git_clone', 'git_status', 'git_commit', 'git_push', 'git_diff', 'git_log'],
  terminal: ['run_terminal'],
  web: ['search_web', 'fetch_page'],
  control: ['ask_user', 'respond'],
};

/**
 * Select a relevant subset of tool names for a request, always including the
 * control tools. Returns null to mean "no tools needed" (pure chat).
 *
 * @param {string} message
 * @param {string[]} allToolNames  the full set actually registered
 * @returns {string[]|null}
 */
export function selectRelevantTools(message, allToolNames = []) {
  const t = String(message).toLowerCase();
  const wanted = new Set(TOOL_GROUPS.control);
  let any = false;

  const add = group => { for (const n of TOOL_GROUPS[group]) wanted.add(n); any = true; };

  if (/\b(read|open|show|view|list|find|search|look|inspect|review|analy|summar|where|what does|explain the|trace)\b/.test(t)) add('read');
  if (/\b(create|make|add|new|generate|scaffold|build|write|implement|fix|change|update|modify|refactor|replace|patch|edit|rename|delete|remove)\b/.test(t)) { add('read'); add('write'); }
  if (/\b(clone|pull|push|commit|fetch|rebase|checkout|merge|stash|repo|repository|branch|github|gitlab)\b/.test(t)) { add('git'); add('read'); }
  if (/\b(run|execute|npm|node|terminal|shell|command|test|lint|build|install|deploy|server)\b/.test(t)) add('terminal');
  if (/\b(who is|what is|latest|current|news|search online|look up|google|price of|when is|how old)\b/.test(t)) add('web');

  if (!any) return null; // pure chat — no tools

  // Preserve only names that actually exist in the registry.
  const allowed = new Set(allToolNames.length ? allToolNames : [...wanted]);
  return [...wanted].filter(n => allowed.has(n));
}

/**
 * Dynamic output-token cap by request shape. Short factual answers and single
 * tool calls don't need a big budget; generation does.
 */
export function maxTokensForIntent(message, category = '') {
  const t = String(message).toLowerCase();
  if (category === 'chitchat' || /^(hi|hey|hello|thanks|thank you|ok|okay|yes|no)\b/.test(t)) return 128;
  if (/\b(what is the|how many|which file|yes or no|true or false|version|name of)\b/.test(t)) return 256;
  if (category === 'code_generate' || category === 'file_create' || /\b(build|create|website|landing page|implement|full|complete|component|app)\b/.test(t)) return 2048;
  return 1024;
}
