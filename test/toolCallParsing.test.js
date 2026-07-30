import assert from 'node:assert/strict';
import { parseToolCalls, extractNonToolText } from '../src/agent/toolSchemas.js';

// Preferred format.
let calls = parseToolCalls('```tool_call\n{"tool":"read_file","args":{"path":"a.js"}}\n```');
assert.equal(calls.length, 1);
assert.equal(calls[0].tool, 'read_file');
assert.equal(calls[0].args.path, 'a.js');

// ```json fence (very common with cloud models).
calls = parseToolCalls('Sure.\n```json\n{"tool":"write_file","args":{"path":"b.js","content":"x"}}\n```');
assert.equal(calls.length, 1);
assert.equal(calls[0].tool, 'write_file');
assert.equal(calls[0].args.content, 'x');

// Bare ``` fence with no language tag.
calls = parseToolCalls('```\n{"tool":"git_status"}\n```');
assert.equal(calls.length, 1);
assert.equal(calls[0].tool, 'git_status');

// "parameters" alias instead of "args".
calls = parseToolCalls('```tool_call\n{"tool":"create_file","parameters":{"path":"c.js","content":"y"}}\n```');
assert.equal(calls[0].args.path, 'c.js');

// "name" + "arguments" (OpenAI-ish shape).
calls = parseToolCalls('```json\n{"name":"search_code","arguments":{"query":"foo"}}\n```');
assert.equal(calls[0].tool, 'search_code');
assert.equal(calls[0].args.query, 'foo');

// Unfenced raw JSON naming a known tool.
calls = parseToolCalls('I will read it now. {"tool":"read_file","args":{"path":"d.js"}}');
assert.equal(calls.length, 1);
assert.equal(calls[0].args.path, 'd.js');

// Multiple fenced calls in sequence.
calls = parseToolCalls('```tool_call\n{"tool":"read_file","args":{"path":"a"}}\n```\nthen\n```tool_call\n{"tool":"read_file","args":{"path":"b"}}\n```');
assert.equal(calls.length, 2);
assert.deepEqual(calls.map(c => c.args.path), ['a', 'b']);

// Duplicate identical calls are de-duplicated.
calls = parseToolCalls('```tool_call\n{"tool":"git_status"}\n```\n```tool_call\n{"tool":"git_status"}\n```');
assert.equal(calls.length, 1);

// Content with braces/newlines inside a string must not break balance tracking.
calls = parseToolCalls('```json\n{"tool":"write_file","args":{"path":"x.js","content":"function f(){ return {a:1}; }\\nconst s = \\"}\\";"}}\n```');
assert.equal(calls.length, 1);
assert.match(calls[0].args.content, /function f/);

// Prose that merely mentions JSON but names no tool → no calls.
calls = parseToolCalls('Here is an example object: {"path":"a.js","content":"hi"}');
assert.equal(calls.length, 0);

// Unknown tool names are ignored (prevents treating example JSON as a call).
calls = parseToolCalls('```json\n{"tool":"launch_missiles","args":{}}\n```');
assert.equal(calls.length, 0);

// Plain answer with no tool calls.
assert.equal(parseToolCalls('Just a normal answer, no tools here.').length, 0);

// extractNonToolText strips tool JSON but keeps prose.
const mixed = 'Let me check.\n```tool_call\n{"tool":"read_file","args":{"path":"a"}}\n```\nDone.';
const nonTool = extractNonToolText(mixed);
assert.match(nonTool, /Let me check/);
assert.match(nonTool, /Done\./);
assert.ok(!nonTool.includes('read_file'));

// A ```json code sample WITHOUT a tool name is preserved as prose.
const codeSample = 'Config example:\n```json\n{"port":3000}\n```';
assert.match(extractNonToolText(codeSample), /"port":\s*3000/);

console.log('tool call parsing tests passed');

// --- Native function-calling helpers ---
import { toOpenAITools, normalizeNativeToolCalls, streamableText } from '../src/agent/toolSchemas.js';

// toOpenAITools produces the OpenAI function schema shape.
const oa = toOpenAITools();
assert.ok(Array.isArray(oa) && oa.length > 0);
assert.equal(oa[0].type, 'function');
assert.ok(oa.every(t => t.function && typeof t.function.name === 'string' && t.function.parameters));
assert.ok(oa.some(t => t.function.name === 'read_file'));

// normalizeNativeToolCalls parses string arguments into the {tool,args,id} shape.
let n = normalizeNativeToolCalls([
  { id: 'call_1', function: { name: 'read_file', arguments: '{"path":"a.js"}' } },
]);
assert.equal(n.length, 1);
assert.equal(n[0].tool, 'read_file');
assert.equal(n[0].args.path, 'a.js');
assert.equal(n[0].id, 'call_1');

// Unknown tool names are dropped.
assert.equal(normalizeNativeToolCalls([{ function: { name: 'nope', arguments: '{}' } }]).length, 0);

// Object arguments (already parsed) are accepted; malformed JSON → empty args.
assert.equal(normalizeNativeToolCalls([{ function: { name: 'git_status', arguments: { x: 1 } } }])[0].args.x, 1);
assert.deepEqual(normalizeNativeToolCalls([{ id: 'c', function: { name: 'git_status', arguments: 'not json' } }])[0].args, {});

// streamableText hides content once a fence opens (prevents tool-JSON flashing).
assert.equal(streamableText('Let me check that for you'), 'Let me check that for you');
assert.equal(streamableText('Reading now\n```tool_call\n{"tool":"read_file"'), 'Reading now');
assert.equal(streamableText('```json\n{"tool":"x"}'), '');

console.log('native tool-calling helper tests passed');
