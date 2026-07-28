import assert from 'node:assert/strict';
import { generatePatchProposal, isCodeChangeRequest } from '../src/agent/phase4Runner.js';

assert.equal(isCodeChangeRequest('Fix the bug in src/App.jsx'), true);
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
const proposal = await generatePatchProposal({
  provider,
  model: { id: 'coder' },
  request: 'Fix src/App.jsx',
  workspaceContext: '--- src/App.jsx ---\nold',
  toolNames: ['read_file', 'apply_patch'],
});
assert.equal(proposal.action.type, 'propose_patch');
assert.equal(proposal.generationResult.tokenCount, 40);
const directProvider = {
  async stream({ onToken }) {
    onToken('```diff\n--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -1 +1 @@\n-old\n+new\n```');
    return { tokenCount: 20 };
  },
};
const direct = await generatePatchProposal({ provider: directProvider, model: { id: 'coder' }, request: 'Fix src/App.jsx', workspaceContext: 'old' });
assert.equal(direct.action.paths[0], 'src/App.jsx');
await assert.rejects(() => generatePatchProposal({ provider, model: { id: 'coder' }, request: 'Fix it', workspaceContext: '' }), /context is required/);
console.log('phase 4 runner tests passed');
