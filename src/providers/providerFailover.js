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
  const rest = withKey
    .filter(p => p.id !== activeId)
    .filter(p => !isOnCooldown(p.id, now))
    .sort((a, b) => (a.priority ?? 1e9) - (b.priority ?? 1e9) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
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
