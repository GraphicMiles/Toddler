import assert from 'node:assert/strict';
import { escapeRegExp } from '../src/utils/escapeRegExp.js';
import { extractSymbolBody } from '../src/agent/codeSkeleton.js';

// Escapes all regex metacharacters so new RegExp never throws.
const specials = ['foo(bar', 'arr[0]', 'a.b*c', 'x{2}', 'a|b', 'end$', '^start', 'a+b', 'q?', 'back\\slash'];
for (const s of specials) {
  const escaped = escapeRegExp(s);
  // Must not throw when used to build a RegExp.
  const re = new RegExp(escaped);
  // And must literally match the original string.
  assert.ok(re.test(s), `escaped pattern should match its source: ${s}`);
}

// null/undefined safe
assert.equal(escapeRegExp(null), '');
assert.equal(escapeRegExp(undefined), '');
assert.equal(escapeRegExp(123), '123');

// Regression: extractSymbolBody with a special-char symbol name must not throw.
assert.doesNotThrow(() => extractSymbolBody('function foo(){}', 'foo(bar['));
assert.equal(extractSymbolBody('function foo(){}', 'foo(bar['), null);
// Normal symbol still works.
assert.ok(extractSymbolBody('export function myFn(){ return 1; }', 'myFn'));

console.log('escapeRegExp tests passed');
