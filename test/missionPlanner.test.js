import assert from 'node:assert/strict';
import { planMission, shouldPlanMission, formatPlanForPrompt } from '../src/agent/missionPlanner.js';

// Gating: only tool-capable providers, and not trivial/short messages.
assert.equal(shouldPlanMission({ toolCapable: true, message: 'Fix the login bug in auth.js and add tests' }), true);
assert.equal(shouldPlanMission({ toolCapable: false, message: 'Fix the login bug in auth.js' }), false);
assert.equal(shouldPlanMission({ toolCapable: true, message: 'hi' }), false);

// planMission parses a well-formed JSON plan from the model.
const planJson = JSON.stringify({
  goal: 'Fix the login bug',
  confidence: 0.94,
  requires: ['read_files', 'terminal', 'tests'],
  missing: ['error log'],
  complexity: 'medium',
  steps: ['Read auth.js', 'Fix the token check', 'Run tests', 'Verify'],
  risks: ['could break session handling'],
});
const goodProvider = { async stream({ onToken }) { onToken('Here is the plan:\n' + planJson); return {}; } };
const plan = await planMission({ provider: goodProvider, model: {}, request: 'Fix the login bug' });
assert.equal(plan.goal, 'Fix the login bug');
assert.equal(plan.confidence, 0.94);
assert.equal(plan.complexity, 'medium');
assert.equal(plan.steps.length, 4);
assert.deepEqual(plan.requires, ['read_files', 'terminal', 'tests']);

// formatPlanForPrompt produces an injectable block with the steps.
const prompt = formatPlanForPrompt(plan);
assert.match(prompt, /MISSION PLAN/);
assert.match(prompt, /1\. Read auth\.js/);
assert.match(prompt, /verify/i);

// Malformed model output → safe fallback plan (never throws).
const badProvider = { async stream({ onToken }) { onToken('sorry I cannot'); return {}; } };
const fallback = await planMission({ provider: badProvider, model: {}, request: 'Do the thing' });
assert.equal(typeof fallback.goal, 'string');
assert.ok(fallback.confidence >= 0 && fallback.confidence <= 1);
assert.ok(['trivial', 'low', 'medium', 'high'].includes(fallback.complexity));
assert.ok(Array.isArray(fallback.steps));

// Provider that throws → still returns a fallback, no exception.
const throwing = { async stream() { throw new Error('network'); } };
const safe = await planMission({ provider: throwing, model: {}, request: 'Build login' });
assert.equal(typeof safe.goal, 'string');

// Confidence is clamped to [0,1].
const wildProvider = { async stream({ onToken }) { onToken(JSON.stringify({ goal: 'x', confidence: 5, steps: ['a'] })); return {}; } };
const clamped = await planMission({ provider: wildProvider, model: {}, request: 'x' });
assert.ok(clamped.confidence <= 1);

console.log('mission planner tests passed');
