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
  });

const gate = new ApprovalGate();
const agent = new AgentCore({ toolRegistry: tools, approvalGate: gate });
const workspace = {
  path: 'workspace',
  selectedPath: 'src/App.jsx',
  tree: [{ name: 'src', path: 'src', type: 'folder', children: [{ name: 'App.jsx', path: 'src/App.jsx', type: 'file' }] }],
};

const writePlan = await agent.processMessage({ message: 'update the selected file', workspace });
const writeAction = writePlan.proposedActions.find(action => action.type === 'write_file');
assert.ok(writeAction, 'write action should be proposed');
await agent.executeApprovedAction(writeAction.id);
assert.equal(agent.context.previousActions.at(-1).type, 'write_file');

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

console.log('agent core tests passed');
