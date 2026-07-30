import assert from 'node:assert/strict';
import { runAgenticLoop } from '../src/agent/agenticLoop.js';

// In-memory workspace that can simulate a write NOT sticking, to prove the loop
// verifies before declaring success.
function makeWorkspace({ dropWrites = false } = {}) {
  const files = new Map();
  return {
    async readText(path) {
      if (!files.has(path)) throw new Error('not found: ' + path);
      return files.get(path);
    },
    async writeText(path, content) { if (!dropWrites) files.set(path, content); },
    async createFile(path) { if (!files.has(path)) files.set(path, ''); },
    async inspect(path) { if (!files.has(path)) throw new Error('missing'); return { path }; },
    _files: files,
  };
}

// A scripted provider that emits a sequence of native tool_calls, one per turn.
function scriptedProvider(turns) {
  let i = 0;
  return {
    supportsToolUse: true,
    async loadModel() { return { loaded: true }; },
    async stream({ onToken }) {
      const turn = turns[Math.min(i, turns.length - 1)];
      i++;
      if (turn.text) onToken?.(turn.text);
      return turn.toolCalls ? { toolCalls: turn.toolCalls } : {};
    },
  };
}

const tc = (name, args, id) => ({ id: id || `c${Math.random().toString(36).slice(2, 6)}`, type: 'function', function: { name, arguments: JSON.stringify(args) } });

// --- Case 1: successful write verifies and completes ---
{
  const ws = makeWorkspace();
  const provider = scriptedProvider([
    { toolCalls: [tc('create_file', { path: 'hello.js', content: 'export const hi = 1;' })] },
    { toolCalls: [tc('respond', { message: 'Created hello.js' })] },
  ]);
  const result = await runAgenticLoop({ provider, model: {}, userMessage: 'make hello.js', workspaceProvider: ws, isNative: true });
  assert.equal(result.success, true);
  assert.equal(result.verified, true, 'file write should be verified');
  assert.equal(result.response, 'Created hello.js');
  assert.equal(ws._files.get('hello.js'), 'export const hi = 1;');
}
console.log('  ✓ verified successful write');

// --- Case 2: write that does NOT stick is caught; model gets a chance to fix ---
{
  const ws = makeWorkspace({ dropWrites: true });
  let respondedTooEarly = false;
  const provider = scriptedProvider([
    { toolCalls: [tc('create_file', { path: 'ghost.js', content: 'nope' })] },
    { toolCalls: [tc('respond', { message: 'Done!' })] }, // premature success
    { text: 'Acknowledging failure', toolCalls: [tc('respond', { message: 'Could not persist the file.' })] },
  ]);
  const result = await runAgenticLoop({ provider, model: {}, userMessage: 'make ghost.js', workspaceProvider: ws, isNative: true });
  // The loop must not have accepted the premature "Done!" since the file is missing.
  assert.notEqual(result.response, 'Done!', 'must not falsely report success when write did not stick');
  const verifyStep = result.toolCalls.find(t => t.tool === 'verify_changes');
  assert.ok(verifyStep, 'a verification step should be recorded');
  assert.equal(verifyStep.result.passed, false);
  void respondedTooEarly;
}
console.log('  ✓ caught write that did not persist');

// --- Case 3: mission plan is injected as a system message ---
{
  const ws = makeWorkspace();
  let sawPlan = false;
  const provider = {
    supportsToolUse: true,
    async loadModel() { return {}; },
    async stream({ messages, onToken }) {
      if (messages.some(m => m.role === 'system' && /MISSION PLAN/.test(m.content || ''))) sawPlan = true;
      onToken?.('ok');
      return { toolCalls: [tc('respond', { message: 'done' })] };
    },
  };
  await runAgenticLoop({ provider, model: {}, userMessage: 'do it', workspaceProvider: ws, isNative: true, missionPlan: 'MISSION PLAN\nGoal: test' });
  assert.equal(sawPlan, true, 'mission plan should be injected into the model messages');
}
console.log('  ✓ mission plan injected into loop');

console.log('agentic verify tests passed');
