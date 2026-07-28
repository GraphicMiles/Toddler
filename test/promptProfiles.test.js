import assert from 'node:assert/strict';
import { formatPrompt, profileForModel } from '../src/models/promptProfiles.js';
assert.equal(profileForModel({ id: 'qwen2.5-coder-1.5b' }).promptTemplate, 'chatml');
assert.match(formatPrompt([{ role: 'user', content: 'hello' }], profileForModel({ id: 'qwen' })), /<\|im_start\|>user/);
assert.match(formatPrompt([{ role: 'user', content: 'hello' }], profileForModel({ id: 'smollm' })), /<\|im_start\|>user\nhello<\|im_end\|>/);
assert.equal(profileForModel({ profile: { contextTokens: 3072 } }).contextTokens, 3072);
console.log('prompt profile tests passed');
