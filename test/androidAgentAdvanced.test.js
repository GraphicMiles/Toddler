import assert from 'node:assert/strict';
import { AgentRunBudget, emitSubagentStage } from '../src/agent/subagentOrchestrator.js';
import { deterministicAnswer } from '../src/agent/deterministicAnswers.js';
import { RESPONSE_QUALITY, generateQualityResponse } from '../src/agent/responseQuality.js';
import { enqueueAutonomousTask, readAutonomousQueue, removeAutonomousTask, updateAutonomousTask } from '../src/agent/autonomousQueue.js';
import { buildRepositoryIndex, queryRepositoryIndex } from '../src/context/repositoryIndex.js';

const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: key => store.delete(key),
};

assert.equal(deterministicAnswer('What is 4 plus 4?'), '4 + 4 = 8');
assert.equal(deterministicAnswer('10 divided by 0'), 'Division by zero is undefined.');
assert.equal(deterministicAnswer('Explain this code'), null);

const budget = new AgentRunBudget({ maxModelCalls: 2, maxFiles: 2, maxDurationMs: 1000 });
budget.beforeModelCall();
budget.addFiles(['a.js']);
assert.equal(budget.snapshot().modelCalls, 1);
const stages = [];
emitSubagentStage(stage => stages.push(stage), 'planning', { role: 'planner' });
assert.equal(stages[0].role, 'planner');
assert.throws(() => emitSubagentStage(() => {}, 'desktop-shell'), /Unknown subagent/);

let calls = 0;
const provider = {
  async stream({ onToken }) {
    calls++;
    onToken(calls === 1 ? 'draft' : calls === 2 ? '- issue' : 'final');
    return { tokenCount: 1 };
  },
};
let final = '';
await generateQualityResponse({ provider, model: { id: 'm', task: 'chat' }, messages: [{ role: 'user', content: 'Question' }], quality: RESPONSE_QUALITY.REVIEWED, onToken: token => { final += token; } });
assert.equal(calls, 3);
assert.equal(final, 'final');

const queueTask = enqueueAutonomousTask('workspace', { type: 'tests', prompt: 'Suggest tests', reason: 'Patch verified' });
assert.equal(readAutonomousQueue('workspace')[0].status, 'queued');
updateAutonomousTask('workspace', queueTask.id, 'running');
assert.equal(readAutonomousQueue('workspace')[0].status, 'running');
removeAutonomousTask('workspace', queueTask.id);
assert.equal(readAutonomousQueue('workspace').length, 0);

const tree = [{ name: 'src', path: 'src', type: 'folder', children: [
  { name: 'App.jsx', path: 'src/App.jsx', type: 'file' },
  { name: 'helper.js', path: 'src/helper.js', type: 'file' },
] }];
const contents = {
  'src/App.jsx': "import helper from './helper';\nexport function App(){ return helper(); }",
  'src/helper.js': 'export default function helper(){ return true; }',
};
const repositoryIndex = await buildRepositoryIndex({ workspaceId: 'workspace', workspaceTree: tree, workspaceProvider: { readText: async path => contents[path] } });
assert.equal(repositoryIndex.filesIndexed, 2);
assert.ok(queryRepositoryIndex(repositoryIndex, 'helper').length >= 2);

delete globalThis.localStorage;
console.log('advanced Android agent tests passed');
