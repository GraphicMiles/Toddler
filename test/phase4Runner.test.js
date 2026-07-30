import assert from 'node:assert/strict';
import { generatePatchProposal, isCodeChangeRequest, isFileCreationRequest, needsCreationFilename, requestedFilePath, recentFilenameFromMessages } from '../src/agent/phase4Runner.js';

// recentFilenameFromMessages: recover a just-discussed filename so a bare
// "create the file" follow-up reuses it instead of re-asking.
assert.equal(
  recentFilenameFromMessages([
    { role: 'user', content: 'Create a file called homer.jsx' },
    { role: 'assistant', content: 'Here is a simple example in a file called `homer.jsx`.' },
  ]),
  'homer.jsx',
);
// Newest mention wins.
assert.equal(
  recentFilenameFromMessages([
    { role: 'user', content: 'look at styles.css' },
    { role: 'assistant', content: 'Updated App.jsx for you.' },
  ]),
  'App.jsx',
);
// No filename anywhere → empty string.
assert.equal(recentFilenameFromMessages([{ role: 'user', content: 'build me a nav bar' }]), '');
assert.equal(recentFilenameFromMessages([]), '');
// Non-array / malformed input is safe.
assert.equal(recentFilenameFromMessages(null), '');

assert.equal(isCodeChangeRequest('Fix the bug in src/App.jsx'), true);
assert.equal(isFileCreationRequest('Create body.css in the workspace'), true);
assert.equal(isFileCreationRequest('Create a landing page'), true); // Project keyword inference
assert.equal(requestedFilePath('Create body.css in the toddler workspace'), 'body.css');
assert.equal(requestedFilePath('Create a landing page'), 'index.html'); // Inferred from keyword
assert.equal(requestedFilePath('Build a React component'), 'Component.jsx'); // Inferred from keyword
assert.equal(needsCreationFilename('Write a landing page for me'), false); // Now infers 'index.html' from 'landing page'
assert.equal(needsCreationFilename('Create index.html'), false);
assert.equal(needsCreationFilename('Create a file for me'), true); // Has project keyword but no inferred path
assert.equal(isCodeChangeRequest('Explain src/App.jsx'), false);
assert.equal(isCodeChangeRequest('Hello'), false);

const response = JSON.stringify({
  actions: [{
    type: 'propose_patch',
    paths: ['src/App.jsx'],
    rationale: 'Correct the greeting.',
    patch: '--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -1 +1 @@\n-old\n+new',
  }],
});
const provider = {
  async stream({ onToken }) {
    onToken(response.slice(0, 30));
    onToken(response.slice(30));
    return { tokenCount: 40 };
  },
};
const stages = [];
const proposal = await generatePatchProposal({
  provider,
  model: { id: 'coder' },
  request: 'Fix src/App.jsx',
  workspaceContext: '--- src/App.jsx ---\nold',
  toolNames: ['read_file', 'apply_patch'],
  onStage: stage => stages.push(stage.stage),
});
assert.equal(proposal.action.type, 'propose_patch');
assert.equal(proposal.generationResult.tokenCount, 40);
assert.ok(proposal.activeSkills.includes('patch-reviewer'));
assert.equal(proposal.review.deterministic.verdict, 'pass');
assert.deepEqual(stages, ['planning', 'context', 'coding', 'reviewing', 'verifying', 'waiting-approval']);
assert.equal(proposal.budget.modelCalls, 2);
const directProvider = {
  async stream({ onToken }) {
    onToken('```diff\n--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -1 +1 @@\n-old\n+new\n```');
    return { tokenCount: 20 };
  },
};
const direct = await generatePatchProposal({ provider: directProvider, model: { id: 'coder' }, request: 'Fix src/App.jsx', workspaceContext: 'old' });
assert.equal(direct.action.paths[0], 'src/App.jsx');
let createCalls = 0;
const createProvider = {
  async stream({ onToken }) {
    createCalls++;
    onToken(createCalls === 1
      ? JSON.stringify({ actions: [{ type: 'create_file', paths: ['toddler/body.css'], rationale: 'Create stylesheet.', content: 'body { color: white; }' }] })
      : JSON.stringify({ verdict: 'pass', issues: [] }));
    return { tokenCount: 20 };
  },
};
const created = await generatePatchProposal({ provider: createProvider, model: { id: 'coder' }, request: 'Create body.css in the toddler workspace', workspaceContext: '' });
assert.equal(created.action.type, 'create_file');
assert.deepEqual(created.action.paths, ['body.css']);
assert.match(created.action.content, /color: white/);
await assert.rejects(() => generatePatchProposal({ provider, model: { id: 'coder' }, request: 'Fix it', workspaceContext: '' }), /context is required/);
console.log('phase 4 runner tests passed');
