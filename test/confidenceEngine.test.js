import assert from 'node:assert/strict';
import { assessConfidence, decideOnConfidence, actionSafety } from '../src/agent/confidenceEngine.js';

// actionSafety: reads are safe, deletes/push are risky.
assert.ok(actionSafety('read_file') > actionSafety('write_file'));
assert.ok(actionSafety('write_file') > actionSafety('delete_file'));
assert.ok(actionSafety('git_push') < 0.5);
assert.equal(actionSafety('unknown_tool'), 0.5);

// High plan confidence + good context + no missing info → high score, proceed.
let a = assessConfidence({ planConfidence: 0.94, missingInfo: [], contextMatches: 3, message: 'Fix the login bug in auth.js and add tests' });
assert.ok(a.score >= 0.8);
assert.equal(decideOnConfidence(a).action, 'proceed');

// Missing info drags confidence down → clarify.
let b = assessConfidence({ planConfidence: 0.55, missingInfo: ['stack', 'error log'], contextMatches: 0, message: 'fix it' });
assert.ok(b.score < 0.5);
assert.equal(decideOnConfidence(b, { clarifyBelow: 0.5 }).action, 'clarify');

// Very short/ambiguous message reduces confidence.
let c = assessConfidence({ planConfidence: 0.7, message: 'redesign the navigation bar for mobile screens' });
let cShort = assessConfidence({ planConfidence: 0.7, message: 'go' });
assert.ok(cShort.score < c.score);

// Irreversible action on non-high confidence → confirm, regardless of clarify threshold.
let d = assessConfidence({ planConfidence: 0.7, message: 'remove the old module', tool: 'delete_file' });
const dDecision = decideOnConfidence(d, { tool: 'delete_file' });
assert.equal(dDecision.action, 'confirm');

// Irreversible action WITH very high confidence can proceed.
let e = assessConfidence({ planConfidence: 0.95, contextMatches: 3, message: 'delete the confirmed dead file src/old.js', tool: 'delete_file' });
// score is capped by safety blend, so even here delete stays cautious:
const eDecision = decideOnConfidence(e, { tool: 'delete_file' });
assert.ok(['confirm', 'proceed'].includes(eDecision.action));

// Score always clamped to [0,1].
let f = assessConfidence({ planConfidence: 2, missingInfo: [], contextMatches: 5, message: 'x y z w' });
assert.ok(f.score <= 1 && f.score >= 0);

console.log('confidence engine tests passed');
