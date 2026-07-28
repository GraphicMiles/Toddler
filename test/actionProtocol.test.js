import assert from 'node:assert/strict';
import { parseStructuredActions, validateStructuredAction } from '../src/agent/actionProtocol.js';

const actions = parseStructuredActions(`\`\`\`json
{"actions":[{"type":"read_file","paths":["src/App.jsx"],"rationale":"Inspect the current component."},{"type":"search_files","paths":[],"query":"workspace provider","rationale":"Find provider usage."}]}
\`\`\``);
assert.equal(actions.length, 2);
assert.equal(actions[0].paths[0], 'src/App.jsx');
assert.equal(actions[1].query, 'workspace provider');
assert.throws(() => validateStructuredAction({ type: 'read_file', paths: ['../secret'], rationale: 'Unsafe' }), /unsafe/);
assert.throws(() => validateStructuredAction({ type: 'propose_patch', paths: ['src/App.jsx'], rationale: 'Change it', patch: 'not a diff' }), /unified diff/);
assert.equal(validateStructuredAction({
  type: 'propose_patch',
  paths: ['src/App.jsx'],
  rationale: 'Correct the greeting.',
  patch: '--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -1 +1 @@\n-old\n+new',
}).type, 'propose_patch');
const create = validateStructuredAction({ type: 'create_file', paths: ['body.css'], rationale: 'Create the requested stylesheet.', content: 'body { color: white; }' });
assert.equal(create.content, 'body { color: white; }');
assert.throws(() => validateStructuredAction({ type: 'create_file', paths: ['../body.css'], rationale: 'Unsafe', content: 'x' }), /unsafe/);
assert.equal(validateStructuredAction({ type: 'terminal', paths: [], rationale: 'Inspect app sandbox.', command: 'ls -la' }).command, 'ls -la');
assert.equal(validateStructuredAction({ type: 'git_clone', paths: [], rationale: 'Clone requested repository.', repository: 'owner/repo' }).repository, 'owner/repo');
assert.equal(validateStructuredAction({ type: 'git', paths: [], rationale: 'Update clone.', operation: 'pull', repositoryPath: '/app/repo' }).operation, 'pull');
console.log('action protocol tests passed');
