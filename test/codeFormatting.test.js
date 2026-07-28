import assert from 'node:assert/strict';
import { canFormatPath, editorExtension, formatSource } from '../src/editor/codeFormatting.js';
assert.equal(editorExtension('src/index.css'), 'css');
assert.equal(canFormatPath('src/App.jsx'), true);
assert.equal(canFormatPath('src/Main.java'), false);
const formatted = await formatSource('src/test.js', 'const x={a:1};');
assert.match(formatted, /const x = \{ a: 1 \};/);
await assert.rejects(() => formatSource('main.py', 'x=1'), /not available/);
console.log('code formatting tests passed');
