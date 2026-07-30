import assert from 'node:assert/strict';
import { embed, cosineSimilarity, textSimilarity } from '../src/memory/semanticVector.js';

// Identical text → similarity 1.
assert.ok(Math.abs(textSimilarity('build a nav bar', 'build a nav bar') - 1) < 1e-9);

// Related text → high similarity.
assert.ok(textSimilarity('build me a navigation bar', 'create a nav bar component') > 0.15);

// Typo tolerance via character trigrams (this is the upgrade over substring match).
assert.ok(textSimilarity('navigaton bar', 'navigation bar') > 0.5, 'typos should still match');

// Unrelated text → low similarity.
assert.ok(textSimilarity('how old is Messi', 'enable all the automated filters') < 0.1);

// Empty text → empty vector → zero similarity, no crash.
assert.equal(Object.keys(embed('')).length, 0);
assert.equal(cosineSimilarity(embed(''), embed('anything')), 0);
assert.equal(cosineSimilarity(null, null), 0);

console.log('  ✓ semantic vector similarity');

// --- Semantic recall via EpisodicMemory ---
const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};
const { EpisodicMemory } = await import('../src/memory/episodicMemory.js');
const mem = new EpisodicMemory();
mem.clear();
mem.store({ task: 'Fixed the authentication bug in the login component', outcome: 'ok', tags: ['code'] });
mem.store({ task: 'Styled the navigation bar with flexbox', outcome: 'ok', tags: ['code'] });

// Query with different wording + a typo still recalls the auth memory semantically.
const r = mem.recall('help with the authentcation flow');
assert.ok(r.length >= 1, 'semantic recall should find the auth memory despite typo/wording');
assert.match(r[0].task, /authentication/);

// Embedding is persisted on store.
assert.ok(mem.memories[0].embedding && typeof mem.memories[0].embedding === 'object');

// Unrelated meta message still recalls nothing (no leak).
assert.equal(mem.recall('enabled all the automated filters so i can work').length, 0);
mem.clear();
delete globalThis.localStorage;
console.log('  ✓ semantic episodic recall');
console.log('semantic memory tests passed');
