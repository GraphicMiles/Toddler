import assert from 'node:assert/strict';
import { extractSkeleton, shouldUseSkeleton, extractSymbolBody } from '../src/agent/codeSkeleton.js';

const sample = `import React from 'react';
import { useState } from 'react';
const helper = require('./helper');

export function computeTotal(a, b) {
  const x = a + b;
  return x;
}

export const greet = (name) => {
  return 'hi ' + name;
};

export default class Widget {
  constructor() { this.n = 0; }
  render() {
    return null;
  }
}

export interface Props { id: number; }
`;

const { skeleton, symbols, lines } = extractSkeleton(sample);
// imports captured
assert.match(skeleton, /import React/);
assert.match(skeleton, /require\('\.\/helper'\)/);
// declarations captured with line numbers
assert.match(skeleton, /computeTotal/);
assert.match(skeleton, /greet/);
assert.match(skeleton, /class Widget/);
assert.match(skeleton, /interface Props/);
// symbol list
assert.ok(symbols.includes('computeTotal'));
assert.ok(symbols.includes('greet'));
assert.ok(symbols.includes('Widget'));
// line count reflects source
assert.equal(lines, sample.split('\n').length);
// skeleton is smaller than source
assert.ok(skeleton.length < sample.length);

// shouldUseSkeleton
assert.equal(shouldUseSkeleton('a\n'.repeat(200)), true);
assert.equal(shouldUseSkeleton('short\nfile'), false);

// extractSymbolBody: pulls just the function body with balanced braces
const body = extractSymbolBody(sample, 'computeTotal');
assert.match(body, /const x = a \+ b/);
assert.match(body, /return x/);
assert.ok(!/greet/.test(body), 'should not bleed into the next function');

// class extraction
const wbody = extractSymbolBody(sample, 'Widget');
assert.match(wbody, /constructor/);
assert.match(wbody, /render/);

// missing symbol → null
assert.equal(extractSymbolBody(sample, 'doesNotExist'), null);

// non-code file degrades gracefully (head slice)
const prose = Array.from({ length: 10 }, (_, i) => `line ${i}`).join('\n');
const pskel = extractSkeleton(prose);
assert.ok(pskel.skeleton.length > 0);

console.log('code skeleton tests passed');
