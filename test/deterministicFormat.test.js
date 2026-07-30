import assert from 'node:assert/strict';
import { deterministicFormat } from '../src/agent/deterministicFormat.js';

// JSON pretty-print
let r = deterministicFormat('format this json: {"a":1,"b":[2,3]}');
assert.match(r, /"a": 1/);
assert.match(r, /```json/);

// JSON minify
r = deterministicFormat('minify json: { "a" : 1 }');
assert.match(r, /\{"a":1\}/);

// invalid JSON → null (fall through to model)
assert.equal(deterministicFormat('format this json: {not valid}'), null);

// case conversions (quoted payload after colon)
assert.equal(deterministicFormat('make this uppercase: hello world'), 'HELLO WORLD');
assert.equal(deterministicFormat('convert to lowercase: HELLO'), 'hello');
assert.equal(deterministicFormat('title case: the quick brown fox'), 'The Quick Brown Fox');
assert.equal(deterministicFormat('to snake_case: myVariableName'), 'my_variable_name');
assert.equal(deterministicFormat('to camelCase: my_variable_name'), 'myVariableName');
assert.equal(deterministicFormat('to kebab-case: My Variable Name'), 'my-variable-name');

// CSV → markdown table
r = deterministicFormat('convert csv to a markdown table: name,age\\nAda,36\\nLinus,54');
assert.match(r, /\| name \| age \|/);
assert.match(r, /\| --- \| --- \|/);
assert.match(r, /\| Ada \| 36 \|/);

// non-formatting request → null
assert.equal(deterministicFormat('write me a function to sort an array'), null);
assert.equal(deterministicFormat('who is vinicius jr'), null);

console.log('deterministic format tests passed');
