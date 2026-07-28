import assert from 'node:assert/strict';
import { retrieveRelevantContext, shouldRetrieveWorkspaceContext } from '../src/utils/rag.js';

const reads = [];
const workspaceProvider = {
  async readText(path) {
    reads.push(path);
    return path === 'src/App.jsx' ? 'export default function App() {}' : 'other';
  },
};
const tree = [{
  name: 'src',
  path: 'src',
  type: 'folder',
  children: [
    { name: 'App.jsx', path: 'src/App.jsx', type: 'file' },
    { name: 'index.js', path: 'src/index.js', type: 'file' },
  ],
}];

const context = await retrieveRelevantContext({
  query: 'App.jsx',
  workspaceTree: tree,
  selectedPath: 'src/App.jsx',
  workspaceProvider,
  maxFiles: 1,
});
assert.equal(context.length, 1);
assert.equal(context[0].path, 'src/App.jsx');
assert.deepEqual(reads, ['src/App.jsx']);
assert.deepEqual(await retrieveRelevantContext({ workspaceTree: tree }), []);
assert.equal(shouldRetrieveWorkspaceContext('Hi', 'src/App.jsx'), false);
assert.equal(shouldRetrieveWorkspaceContext('Explain the selected code', 'src/App.jsx'), true);
assert.equal(shouldRetrieveWorkspaceContext('What is wrong with App.jsx?', 'src/App.jsx'), true);

console.log('rag tests passed');
