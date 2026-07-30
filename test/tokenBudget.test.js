import assert from 'node:assert/strict';
import { estimateTokens, estimateMessagesTokens, compactToolResults, selectRelevantTools, maxTokensForIntent } from '../src/agent/tokenBudget.js';

// estimateTokens ~ len/4
assert.equal(estimateTokens('abcd'), 1);
assert.equal(estimateTokens('a'.repeat(400)), 100);
assert.equal(estimateTokens(''), 0);

// estimateMessagesTokens sums content + tool_calls
const msgs = [{ role: 'user', content: 'a'.repeat(40) }, { role: 'assistant', content: '', tool_calls: [{ function: { name: 'x', arguments: '{}' } }] }];
assert.ok(estimateMessagesTokens(msgs) >= 10);

// --- compactToolResults ---
const history = [
  { role: 'system', content: 'sys' },
  { role: 'user', content: 'do a thing' },
  { role: 'tool', tool_call_id: 't1', content: JSON.stringify({ success: true, path: 'a.js', content: 'x'.repeat(5000) }) },
  { role: 'tool', tool_call_id: 't2', content: JSON.stringify({ success: true, path: 'b.js', content: 'y'.repeat(5000) }) },
  { role: 'tool', tool_call_id: 't3', content: JSON.stringify({ success: false, error: 'boom' }) },
  { role: 'tool', tool_call_id: 't4', content: JSON.stringify({ success: true, path: 'd.js' }) },
];
const compacted = compactToolResults(history, { keepFull: 2 });
// original untouched
assert.ok(history[2].content.length > 4000);
// oldest two tool results compacted, newest two kept full
assert.match(compacted[2].content, /compacted/);
assert.match(compacted[2].content, /ok a\.js/);
assert.match(compacted[3].content, /compacted/);
assert.ok(!/compacted/.test(compacted[4].content), 'newest kept full');
assert.ok(!/compacted/.test(compacted[5].content), 'newest kept full');
// compaction actually reduces size
assert.ok(estimateMessagesTokens(compacted) < estimateMessagesTokens(history));
// non-tool messages preserved
assert.equal(compacted[0].content, 'sys');
assert.equal(compacted[1].content, 'do a thing');

// "Tool \"x\" result:" style user messages also compact
const h2 = [
  { role: 'user', content: 'Tool "read_file" result:\n' + 'z'.repeat(3000) },
  { role: 'user', content: 'Tool "read_file" result:\n' + 'z'.repeat(3000) },
  { role: 'user', content: 'Tool "read_file" result:\n' + 'z'.repeat(3000) },
  { role: 'user', content: 'Tool "read_file" result:\n' + 'z'.repeat(3000) },
];
const c2 = compactToolResults(h2, { keepFull: 1 });
assert.match(c2[0].content, /compacted/);
assert.ok(!/compacted/.test(c2[3].content));

// few results → unchanged
const few = [{ role: 'tool', content: '{"success":true}' }];
assert.deepEqual(compactToolResults(few, { keepFull: 3 }), few);

// --- selectRelevantTools ---
const ALL = ['read_file', 'list_files', 'search_code', 'create_file', 'create_folder', 'write_file', 'delete_file', 'git_clone', 'git_status', 'git_commit', 'git_push', 'git_diff', 'git_log', 'run_terminal', 'search_web', 'fetch_page', 'ask_user', 'respond'];
// pure chat → null (no tools)
assert.equal(selectRelevantTools('hello there', ALL), null);
// read request → read + control, no git/terminal
let rt = selectRelevantTools('show me package.json', ALL);
assert.ok(rt.includes('read_file') && rt.includes('respond'));
assert.ok(!rt.includes('git_push'));
// git request includes git tools
let gt = selectRelevantTools('clone my repo', ALL);
assert.ok(gt.includes('git_clone'));
// create request includes write tools
let ct = selectRelevantTools('create a landing page', ALL);
assert.ok(ct.includes('create_file') && ct.includes('write_file'));
// research includes web
let wt = selectRelevantTools('who is vinicius jr', ALL);
assert.ok(wt.includes('search_web'));
// control tools always present when any tools selected
assert.ok(rt.includes('ask_user') && rt.includes('respond'));
// only returns registered names
let limited = selectRelevantTools('clone my repo', ['git_clone', 'respond']);
assert.deepEqual(limited.sort(), ['git_clone', 'respond'].sort());

// --- maxTokensForIntent ---
assert.equal(maxTokensForIntent('hi', 'chitchat'), 128);
assert.ok(maxTokensForIntent('which file has the bug') <= 256);
assert.ok(maxTokensForIntent('build me a complete website', 'file_create') >= 2048);
assert.ok(maxTokensForIntent('explain how promises work') >= 512);

console.log('token budget tests passed');
