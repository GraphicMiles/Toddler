import assert from 'node:assert/strict';
import { AgentCore } from '../src/agent/core.js';
import { ToolRegistry } from '../src/tools/toolRegistry.js';
import { ApprovalGate } from '../src/tools/toolApproval.js';

const calls = [];
const tools = new ToolRegistry()
  .register({
    name: 'read_file',
    permission: 'read',
    execute: async ({ path }) => {
      calls.push(['read_file', path]);
      return { type: 'read', path, content: 'contents' };
    },
  })
  .register({
    name: 'write_file',
    permission: 'write',
    execute: async ({ path, content }) => {
      calls.push(['write_file', path, content]);
      return { type: 'write_file', path };
    },
  })
  .register({
    name: 'delete',
    permission: 'dangerous',
    execute: async ({ path }) => ({ type: 'delete', path }),
  })
  .register({
    name: 'apply_patch',
    permission: 'write',
    execute: async ({ patch }) => ({ type: 'patch_apply', patch }),
  })
  .register({
    name: 'create_file',
    permission: 'write',
    execute: async ({ path, content }) => ({ type: 'create_file', path, content }),
  });

const gate = new ApprovalGate();
const agent = new AgentCore({ toolRegistry: tools, approvalGate: gate });
const workspace = {
  path: 'workspace',
  selectedPath: 'src/App.jsx',
  tree: [{ name: 'src', path: 'src', type: 'folder', children: [{ name: 'App.jsx', path: 'src/App.jsx', type: 'file' }] }],
};

agent.setWorkspace(workspace);
const approvedWrite = gate.request('write_file', { path: 'src/App.jsx', content: 'updated' });
await agent.executeApprovedAction(approvedWrite.id);
assert.equal(agent.context.previousActions.at(-1).type, 'write_file');
const safeWritePlan = await agent.processMessage({ message: 'update the selected file', workspace });
assert.equal(safeWritePlan.proposedActions.some(action => action.type === 'write_file'), false, 'keyword planning must not fabricate whole-file writes');

// Regression: planTask previously referenced an undeclared lastAction after a completed action.
const readPlan = await agent.processMessage({ message: 'read the selected file', workspace });
const readAction = readPlan.proposedActions.find(action => action.type === 'read_file');
assert.ok(readAction, 'read action should be proposed after a completed write');
await agent.executeApprovedAction(readAction.id);
assert.deepEqual(calls.at(-1), ['read_file', 'src/App.jsx']);

const deletePlan = await agent.processMessage({ message: 'delete the selected file', workspace });
const deleteAction = deletePlan.proposedActions.find(action => action.type === 'delete');
assert.ok(deleteAction, 'delete action should be proposed');
assert.ok(gate.list().some(request => request.id === deleteAction.id));
agent.discardAction(deleteAction.id);
assert.equal(gate.list().some(request => request.id === deleteAction.id), false);
assert.equal(agent.context.review.status, 'discarded');

const structured = agent.proposeStructuredModelActions(JSON.stringify({
  actions: [{
    type: 'propose_patch',
    paths: ['src/App.jsx'],
    rationale: 'Update the selected component safely.',
    patch: '--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -1 +1 @@\n-old\n+new',
  }],
}));
assert.equal(structured[0].type, 'apply_patch');
assert.deepEqual(structured[0].diffSummary, [{ path: 'src/App.jsx', additions: 1, deletions: 1 }]);
agent.discardAction(structured[0].id);
const createActions = agent.proposeStructuredModelActions(JSON.stringify({
  actions: [{ type: 'create_file', paths: ['body.css'], rationale: 'Create stylesheet.', content: 'body { margin: 0; }' }],
}));
assert.equal(createActions[0].type, 'create_file');
assert.equal(createActions[0].path, 'body.css');
agent.discardAction(createActions[0].id);

console.log('agent core tests passed');
