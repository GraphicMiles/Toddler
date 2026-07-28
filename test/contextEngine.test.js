import assert from 'node:assert/strict';
import { extractCodeSymbols, rankWorkspaceFiles } from '../src/context/contextEngine.js';

const tree = [
  { name: 'package.json', path: 'package.json', type: 'file' },
  { name: 'src', path: 'src', type: 'folder', children: [
    { name: 'App.jsx', path: 'src/App.jsx', type: 'file' },
    { name: 'workspaceProvider.js', path: 'src/workspace/workspaceProvider.js', type: 'file' },
  ] },
];
const ranked = rankWorkspaceFiles({ query: 'Fix workspace provider', workspaceTree: tree, selectedPath: 'src/App.jsx' });
assert.equal(ranked[0].path, 'src/workspace/workspaceProvider.js');
assert.ok(ranked.some(file => file.path === 'src/App.jsx'));
const symbols = extractCodeSymbols('export function alpha() {}\nclass Beta {}\nconst gamma = () => 1;', 'js');
assert.deepEqual(symbols.map(symbol => symbol.name), ['alpha', 'Beta', 'gamma']);
console.log('context engine tests passed');
