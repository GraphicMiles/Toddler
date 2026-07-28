import assert from 'node:assert/strict';
import { createAgentTask, projectMemoryPrompt, readProjectMemory, rememberProjectFact, removeProjectFact, updateAgentTask, updateProjectFact } from '../src/memory/agentMemory.js';

const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: key => store.delete(key),
};

const workspace = 'virtual:test';
assert.throws(() => rememberProjectFact(workspace, { text: 'model guess', provenance: 'model', approved: true }), /Only approved/);
const fact = rememberProjectFact(workspace, { text: 'Android stays local-only.', provenance: 'user', approved: true });
assert.match(projectMemoryPrompt(workspace), /Android stays local-only/);
updateProjectFact(workspace, fact.id, 'Android remains local-only.');
assert.match(projectMemoryPrompt(workspace), /remains local-only/);
removeProjectFact(workspace, fact.id);
assert.equal(readProjectMemory(workspace).facts.length, 0);
const task = createAgentTask(workspace, 'Fix src/App.jsx');
updateAgentTask(workspace, task.id, { status: 'proposed', files: ['src/App.jsx'], event: { type: 'patch-proposed' } });
const memory = readProjectMemory(workspace);
assert.equal(memory.tasks[0].status, 'proposed');
assert.deepEqual(memory.tasks[0].files, ['src/App.jsx']);
delete globalThis.localStorage;
console.log('agent memory tests passed');
