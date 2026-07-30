import assert from 'node:assert/strict';
import { diagnoseRootCause, buildRootCausePrompt, isToolError } from '../src/agent/selfCorrection.js';

// Root-cause classification steers toward a different approach, not blind retry.
assert.equal(diagnoseRootCause({ error: 'ENOENT: no such file' }).category, 'missing_file');
assert.equal(diagnoseRootCause({ output: 'Permission denied' }).category, 'permission');
assert.equal(diagnoseRootCause({ error: 'No workspace selected' }).category, 'no_workspace');
assert.equal(diagnoseRootCause({ output: 'SyntaxError: Unexpected token' }).category, 'syntax');
assert.equal(diagnoseRootCause({ output: 'bash: foo: command not found' }).category, 'command_not_found');
assert.equal(diagnoseRootCause({ error: 'Failed to fetch' }).category, 'network');
assert.equal(diagnoseRootCause({ error: 'EEXIST: file already exists' }).category, 'already_exists');
assert.equal(diagnoseRootCause({ output: '2 failing tests, expected 3 received 4' }).category, 'test_failure');
assert.equal(diagnoseRootCause({ output: 'oxlint: no-unused-vars' }).category, 'lint_error');
assert.equal(diagnoseRootCause({ error: 'something weird' }).category, 'unknown');

// Each category carries an actionable hint.
assert.match(diagnoseRootCause({ error: 'ENOENT' }).hint, /create/i);
assert.match(diagnoseRootCause({ error: 'EEXIST' }).hint, /write_file/i);

// The prompt embeds the root cause + suggested fix.
const prompt = buildRootCausePrompt({ tool: 'write_file', args: { path: 'x' }, error: 'ENOENT: no such file', output: '' }, 'create the file', 0);
assert.match(prompt, /LIKELY ROOT CAUSE: missing_file/);
assert.match(prompt, /SUGGESTED FIX:/);
assert.match(prompt, /do not repeat/i);

// isToolError still detects failures.
assert.equal(isToolError({ success: false }), true);
assert.equal(isToolError({ error: 'boom' }), true);
assert.equal(isToolError({ output: 'all good' }), false);
assert.equal(isToolError({ success: true }), false);

console.log('self-correction tests passed');
