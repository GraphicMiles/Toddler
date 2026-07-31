/**
 * Provider Failover
 *
 * When the active cloud provider exhausts its quota (or rate-limits / errors),
 * transparently route the same request to the next available provider so the
 * user isn't stopped mid-task. Failed providers are put on a short cooldown so
 * we don't keep hammering an exhausted one within the same session.
 *
 * Only failover-SAFE errors trigger a switch:
 *   - quota_exceeded, rate_limited, server_error, network_error
 * A bad API key (invalid_api_key) or a missing model (model_not_found) is
 * provider-specific and NOT worth retrying elsewhere with the same request —
 * those surface immediately. Aborts never fail over.
 */

const FAILOVER_CODES = new Set(['quota_exceeded', 'rate_limited', 'server_error', 'network_error']);

// Rough capability ranking so failover prefers the STRONGEST available model
// first (best → lowest), independent of the order providers were added. Higher
// score = more capable. Based on model id substrings.
const MODEL_TIERS = [
  // "small" markers first so gpt-4o-mini / flash-lite / *-instant don't match a
  // bigger tier by a substring like "gpt-4o".
  { re: /(mini|nano|flash-lite|-lite\b|instant|\b1\.5b|\b3b\b|\b7b\b|\b8b\b|\b9b\b|small)/i, score: 40 },
  // Frontier proprietary.
  { re: /\b(gpt-?5|o[34]|claude.*(opus|sonnet)|opus|sonnet|grok-?4)\b/i, score: 100 },
  // Very large open / flagship (200B+ params, 400B+, MoE flagships, top reasoning).
  { re: /(2[0-9]{2}b|[3-9][0-9]{2}b|\b1t\b|671b|480b|405b|235b|deepseek.*(v[34]|r1|reasoner)|llama.*4|gemini.*(2\.5|3).*pro|mistral-large|command-a|nemotron.*(ultra|super)|maverick)/i, score: 90 },
  // Strong mid (70B-class, 120B MoE, flagship flash, coding specialists).
  { re: /(70b|72b|gpt-oss-120b|49b|glm-4|qwen-?3-?32b|qwen3-32b|gemini.*(flash|2\.5)|mixtral|codestral|devstral|command-r-plus|gpt-4o|gpt-4\.1)/i, score: 75 },
  // Small-mid.
  { re: /(30b|32b|gpt-oss-20b|gemma|command-r\b|qwen2\.5-coder)/i, score: 60 },
];

export function modelQualityScore(modelId = '') {
  const id = String(modelId);
  for (const tier of MODEL_TIERS) if (tier.re.test(id)) return tier.score;
  return 50; // unknown → mid
}
// Cooldown after a provider fails over (ms). Quota resets are slow; rate limits fast.
const COOLDOWN_MS = { quota_exceeded: 6 * 60 * 60 * 1000, rate_limited: 60 * 1000, server_error: 2 * 60 * 1000, network_error: 30 * 1000 };

// In-memory cooldown map: connectionId -> timestamp when it becomes usable again.
const cooldowns = new Map();

export function isOnCooldown(connectionId, now = Date.now()) {
  const until = cooldowns.get(connectionId);
  return typeof until === 'number' && until > now;
}

export function markCooldown(connectionId, code, now = Date.now()) {
  const ms = COOLDOWN_MS[code] ?? 60 * 1000;
  cooldowns.set(connectionId, now + ms);
}

export function clearCooldown(connectionId) {
  cooldowns.delete(connectionId);
}

export function clearAllCooldowns() {
  cooldowns.clear();
}

export function isFailoverError(code) {
  return FAILOVER_CODES.has(code);
}

/**
 * Order the candidate providers: the currently-selected one first, then the rest
 * by ascending `priority` (then creation order), skipping any on cooldown.
 *
 * @param {Array} providers   full cloud provider list (connection objects)
 * @param {string} activeId   the connectionId the user selected
 * @returns {Array} ordered, cooldown-filtered candidates (may include the active
 *                  one even if on cooldown — we always try the user's pick first)
 */
export function orderCandidates(providers = [], activeId, now = Date.now()) {
  const withKey = providers.filter(p => p && p.apiKey && p.baseUrl && p.modelId);
  const active = withKey.find(p => p.id === activeId);
  // Fallbacks are ordered STRONGEST MODEL FIRST (best → lowest), so when a
  // provider is exhausted we drop to the next most capable one rather than a
  // random/weaker model. An explicit low `priority` (pinning) still wins.
  const rest = withKey
    .filter(p => p.id !== activeId)
    .filter(p => !isOnCooldown(p.id, now))
    .sort((a, b) => {
      const ap = a.priority, bp = b.priority;
      const aPinned = Number.isFinite(ap) && ap < 1e6;
      const bPinned = Number.isFinite(bp) && bp < 1e6;
      // If the user explicitly pinned priorities differently, honor them.
      if (aPinned && bPinned && ap !== bp) return ap - bp;
      // Otherwise sort by model capability (desc), then creation order.
      const q = modelQualityScore(b.modelId) - modelQualityScore(a.modelId);
      if (q !== 0) return q;
      return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });
  return active ? [active, ...rest] : rest;
}

/**
 * Run a streaming request with automatic failover.
 *
 * @param {object} opts
 * @param {Array}    opts.providers        all configured cloud connections
 * @param {string}   opts.activeId         user-selected connectionId
 * @param {Function} opts.makeProvider     (connection) => provider instance (with .stream)
 * @param {Function} opts.buildModel       (connection) => model object passed to stream
 * @param {object}   opts.streamArgs       { messages, tools, onToken, signal, ... }
 * @param {boolean}  [opts.enabled=true]   whether failover is allowed
 * @param {Function} [opts.onFailover]     ({ from, to, code }) => void  (UI notice)
 * @returns {Promise<object>} the stream result, augmented with { usedProvider }
 */
export async function streamWithFailover({
  providers = [], activeId, makeProvider, buildModel, streamArgs = {}, enabled = true, onFailover,
}) {
  const candidates = orderCandidates(providers, activeId);
  if (candidates.length === 0) throw new Error('No cloud provider is configured. Add one in My Collection → Cloud.');

  const chain = enabled ? candidates : candidates.slice(0, 1);
  let lastError;

  for (let i = 0; i < chain.length; i++) {
    const conn = chain[i];
    const provider = makeProvider(conn);
    const model = buildModel(conn);
    try {
      // Disable the per-provider network/429 retry when we have a NEXT provider
      // to try — failing over is faster than backing off in place. The last
      // provider in the chain keeps its normal retries.
      const isLast = i === chain.length - 1;
      const result = await provider.stream({
        ...streamArgs,
        model,
        ...(isLast ? {} : { maxRetries: 0 }),
      });
      clearCooldown(conn.id);
      return { ...result, usedProvider: { id: conn.id, label: conn.label, provider: conn.provider } };
    } catch (error) {
      lastError = error;
      const code = error?.code || 'cloud_error';
      if (error?.name === 'AbortError' || code === 'aborted') throw error;
      // Non-failover errors (bad key, missing model) surface immediately.
      if (!isFailoverError(code)) throw error;
      markCooldown(conn.id, code);
      const next = chain[i + 1];
      if (next && enabled) {
        onFailover?.({ from: { id: conn.id, label: conn.label }, to: { id: next.id, label: next.label }, code });
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('All providers failed.');
}
