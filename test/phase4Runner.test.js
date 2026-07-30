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

// --- Regression: create_file must never write a JSON action-envelope as the file ---
// The model returns the whole {"actions":[{action,path,content}]} envelope. The
// created file must contain the INNER html content, not the JSON wrapper.
const envelopeOutput = JSON.stringify({
  actions: [{
    action: 'create_file',
    path: 'landing-page.html',
    content: '<!DOCTYPE html><html><head><title>Landing</title></head><body><h1>Hi</h1></body></html>',
  }],
});
const envProvider = {
  async stream({ messages, onToken }) {
    // Coder turn returns the envelope; reviewer turn passes.
    const isReview = messages.some(m => /Return JSON only: \{"verdict"/.test(m.content || ''));
    onToken(isReview ? '{"verdict":"pass","issues":[]}' : envelopeOutput);
    return { tokenCount: 10 };
  },
};
const envProposal = await generatePatchProposal({
  provider: envProvider,
  model: { id: 'coder' },
  request: 'Create a landing page',
  workspaceContext: '',
  toolNames: ['create_file'],
});
assert.equal(envProposal.action.type, 'create_file');
assert.equal(envProposal.action.paths[0], 'index.html');
assert.match(envProposal.action.content, /<!DOCTYPE html>/);
assert.match(envProposal.action.content, /<h1>Hi<\/h1>/);
assert.ok(!/"actions"/.test(envProposal.action.content), 'file content must not be the JSON envelope');
assert.ok(!/"action":\s*"create_file"/.test(envProposal.action.content), 'no protocol leakage into file');

// Singular "path" (instead of "paths") is normalized by validateStructuredAction.
import { validateStructuredAction } from '../src/agent/actionProtocol.js';
const singular = validateStructuredAction({ type: 'create_file', path: 'a.js', content: 'x', rationale: 'r' });
assert.deepEqual(singular.paths, ['a.js']);

console.log('phase4 create-file corruption regression passed');
