import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};

// ---------- thinkingBudget ----------
const { assessThinkingBudget, budgetLevelRank } = await import('../src/agent/thinkingBudget.js');

// trivial: chit-chat runs nothing heavy
let b = assessThinkingBudget({ message: 'hi', category: 'chitchat' });
assert.equal(b.level, 'trivial');
assert.equal(b.stages.plan, false);
assert.equal(b.stages.skeptic, false);

// simple factual lookup stays light
b = assessThinkingBudget({ message: 'what is the capital of France', category: 'explain' });
assert.ok(['small', 'medium'].includes(b.level));

// a code change wakes plan + skeptic + verify
b = assessThinkingBudget({ message: 'fix the login bug in auth.js', category: 'code_edit', isCodeChange: true });
assert.ok(budgetLevelRank(b.level) >= budgetLevelRank('medium'));
assert.equal(b.stages.skeptic, true);
assert.equal(b.stages.verify, true);

// building a whole app is large/massive with hypotheses
b = assessThinkingBudget({ message: 'build me a full authentication system with UI, validation and tests across multiple files', category: 'file_create', isCodeChange: true, workflow: true, estimatedSteps: 6 });
assert.ok(['large', 'massive'].includes(b.level));
assert.equal(b.stages.hypotheses, true);

// tool-incapable (small local) models never run planner/skeptic regardless
b = assessThinkingBudget({ message: 'refactor the whole architecture', category: 'code_edit', isCodeChange: true, toolCapable: false });
assert.equal(b.stages.plan, false);
assert.equal(b.stages.skeptic, false);
console.log('  ✓ thinking budget');

// ---------- skeptic ----------
const { critiqueChange, formatCritiqueForRevision } = await import('../src/agent/skeptic.js');
const reviseProvider = { async stream({ onToken }) { onToken('{"risks":["null deref on user"],"assumptions":["user is always defined"],"mustFix":["guard against null user"],"verdict":"revise","confidence":0.8}'); } };
let crit = await critiqueChange({ provider: reviseProvider, model: {}, request: 'fix login', artifact: 'function f(u){return u.name}', kind: 'file', path: 'a.js' });
assert.equal(crit.verdict, 'revise');
assert.ok(crit.mustFix.length >= 1);
let rev = formatCritiqueForRevision(crit);
assert.match(rev, /guard against null user/);

const shipProvider = { async stream({ onToken }) { onToken('{"risks":[],"assumptions":[],"mustFix":[],"verdict":"ship","confidence":0.9}'); } };
crit = await critiqueChange({ provider: shipProvider, model: {}, request: 'x', artifact: 'ok' });
assert.equal(crit.verdict, 'ship');
assert.equal(formatCritiqueForRevision(crit), '');

// never throws → permissive ship
const throwing = { async stream() { throw new Error('net'); } };
crit = await critiqueChange({ provider: throwing, model: {}, request: 'x', artifact: 'y' });
assert.equal(crit.verdict, 'ship');
// mustFix presence forces revise even if model said ship
const sneaky = { async stream({ onToken }) { onToken('{"mustFix":["x"],"verdict":"ship"}'); } };
assert.equal((await critiqueChange({ provider: sneaky, model: {}, request: 'x', artifact: 'y' })).verdict, 'revise');
console.log('  ✓ skeptic');

// ---------- mistakeMemory ----------
const { MistakeMemory } = await import('../src/agent/mistakeMemory.js');
const mm = new MistakeMemory();
mm.clear();
mm.record({ problem: 'write_file failed with permission denied on config', rootCause: 'wrote outside workspace root', fix: 'use a relative path inside the workspace' });
mm.record({ problem: 'tests failed: undefined is not a function', rootCause: 'missing import', fix: 'add the import' });
let hits = mm.recall('permission denied writing a file');
assert.ok(hits.length >= 1);
assert.match(hits[0].problem, /permission denied/);
assert.match(mm.getPrompt('permission denied writing a file'), /LESSONS FROM PAST MISTAKES/);
assert.equal(mm.getPrompt('completely unrelated quantum physics'), '');
mm.clear();
console.log('  ✓ mistake memory');

// ---------- preferenceMemory ----------
const { PreferenceMemory } = await import('../src/agent/preferenceMemory.js');
const pm = new PreferenceMemory();
pm.clear();
pm.learnFromMessage('I want production-ready code, no placeholders, and use React with TypeScript and Tailwind');
let prompt = pm.getPrompt();
assert.match(prompt, /production-ready/);
assert.match(prompt, /React \+ TypeScript \+ Tailwind/);
pm.learnFromMessage('just do it, don\'t ask me first');
assert.match(pm.getPrompt(), /prefers autonomy/);
pm.clear();
assert.equal(pm.getPrompt(), '');
console.log('  ✓ preference memory');

// ---------- cognition glue ----------
const { cognitiveState, buildCognitiveDirectives, seniorEngineerDirective } = await import('../src/agent/cognition.js');
assert.equal(cognitiveState('planning'), 'Planning the approach');
assert.equal(cognitiveState('unknown-stage'), 'Thinking');
assert.ok(seniorEngineerDirective().length > 0);
let dirs = buildCognitiveDirectives({ plan: true, hypotheses: true });
assert.ok(dirs.length === 3); // senior + hypotheses + expansion
dirs = buildCognitiveDirectives({});
assert.equal(dirs.length, 1); // just senior directive
console.log('  ✓ cognition glue');

delete globalThis.localStorage;
console.log('cognition suite passed');
