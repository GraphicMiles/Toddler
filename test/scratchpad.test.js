import assert from 'node:assert/strict';
import { Scratchpad } from '../src/agent/scratchpad.js';

const s = new Scratchpad('Fix the login bug');
assert.equal(s.isEmpty(), false);
assert.match(s.toPrompt(), /Goal: Fix the login bug/);

// Records tool results as completed steps; failures also become observations.
s.recordToolResult('read_file', { path: 'auth.js' }, { success: true, content: '...' });
s.recordToolResult('write_file', { path: 'auth.js' }, { success: false, error: 'permission denied' });
let prompt = s.toPrompt();
assert.match(prompt, /read_file auth\.js → ok/);
assert.match(prompt, /write_file auth\.js → failed/);
assert.match(prompt, /permission denied/);

// Open questions can be added and resolved.
s.addOpenQuestion('which auth provider?');
assert.match(s.toPrompt(), /which auth provider/);
s.resolveQuestion('which auth provider?');
assert.ok(!/which auth provider/.test(s.toPrompt()));

// Bounded: observations cap at 8 (ring buffer keeps newest).
const s2 = new Scratchpad('g');
for (let i = 0; i < 20; i++) s2.addObservation(`note ${i}`);
assert.ok(s2.observations.length <= 8);
assert.ok(s2.observations.includes('note 19'), 'keeps newest observation');
assert.ok(!s2.observations.includes('note 0'), 'drops oldest observation');

// Long items are clipped.
const s3 = new Scratchpad('g');
s3.addObservation('x'.repeat(500));
assert.ok(s3.observations[0].length <= 201);

// De-duplicates identical observations.
const s4 = new Scratchpad('g');
s4.addObservation('same').addObservation('same');
assert.equal(s4.observations.length, 1);

// Empty scratchpad produces an empty prompt.
assert.equal(new Scratchpad().toPrompt(), '');

// Serialisable.
assert.deepEqual(Object.keys(s.toJSON()).sort(), ['completed', 'goal', 'nextAction', 'observations', 'openQuestions']);

console.log('scratchpad tests passed');
