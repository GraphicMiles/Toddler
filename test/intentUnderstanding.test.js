import assert from 'node:assert/strict';
import { understand, normalizeText, isVague } from '../src/agent/intentUnderstanding.js';

// ---- normalization: typos & shorthand ----
assert.equal(normalizeText('pull my repo'), 'pull my repository');
assert.equal(normalizeText('fix the  funtion'), 'fix the function');
assert.match(normalizeText('build a wesbite'), /website/);
assert.match(normalizeText('comit and puhs'), /commit and push/);

// ---- vagueness detection ----
assert.equal(isVague('fix it'), true);
assert.equal(isVague('make it better'), true);
assert.equal(isVague('continue'), true);
assert.equal(isVague('fix the bug in src/App.jsx'), false); // concrete file
assert.equal(isVague('clone https://github.com/a/b'), false); // url
assert.equal(isVague('build me a full landing page with a contact form'), false);

// helper to assert category
const cat = (msg, ctx) => understand(msg, ctx).category;

// ---- git family (the screenshot case) ----
assert.equal(cat('Pull my repo'), 'git');
assert.equal(cat('clone https://github.com/GraphicMiles/Toddler'), 'git');
assert.equal(cat('push my changes'), 'git');
assert.equal(cat('commit everything'), 'git');
// "Pull my repo" with no URL should flag the missing repository URL.
let u = understand('Pull my repo');
assert.equal(u.category, 'git');
assert.deepEqual(u.needs, ['repository URL']);
// With a URL present, nothing missing.
assert.deepEqual(understand('clone https://github.com/a/b').needs, []);

// ---- terminal family ----
assert.equal(cat('run the tests'), 'terminal');
assert.equal(cat('npm install'), 'terminal');
assert.equal(cat('execute the build script'), 'terminal');

// ---- file creation family ----
assert.equal(cat('create a landing page'), 'file_create');
assert.equal(cat('build me a website and create a new folder project'), 'file_create');
assert.equal(cat('make a new component'), 'file_create');
assert.equal(cat('generate a readme'), 'file_create');

// ---- code edit family ----
assert.equal(cat('fix the bug in the login function'), 'code_edit');
assert.equal(cat('refactor the auth code'), 'code_edit');
assert.equal(cat('update the css styles'), 'code_edit');
// Edit without a named target should ask which file/function.
assert.deepEqual(understand('fix the bug in the code').needs, ['which file or function']);

// ---- read / inspect family ----
assert.equal(cat('show me package.json'), 'read_inspect');
assert.equal(cat('list the files in my project'), 'read_inspect');
assert.equal(cat('find where handleSend is defined in the code'), 'read_inspect');
assert.equal(cat('review the auth module'), 'read_inspect');

// ---- research family ----
assert.equal(cat('who is vinicius jr'), 'research');
assert.equal(cat('what is the latest react version'), 'research');
assert.equal(cat('look up the price of bitcoin'), 'research');

// ---- explain family ----
assert.equal(cat('explain how promises work'), 'explain');
assert.equal(cat('how do i center a div'), 'explain');

// ---- delete family ----
assert.equal(cat('delete old.js'), 'delete');
assert.equal(cat('remove the unused imports'), 'delete');
assert.deepEqual(understand('delete that').needs, ['what to delete']);

// ---- chitchat ----
assert.equal(cat('Hi'), 'chitchat');
assert.equal(cat('thanks'), 'chitchat');
assert.ok(understand('hello').confidence >= 0.9);

// ---- ambiguous (vague, no match) ----
let amb = understand('do it');
assert.equal(amb.vague, true);
assert.ok(amb.confidence <= 0.5);

// ---- reference resolution from history (vague → concrete) ----
let resolved = understand('fix it', { history: [
  { role: 'user', content: 'look at src/auth/login.js' },
  { role: 'assistant', content: 'I see a bug in src/auth/login.js' },
] });
assert.equal(resolved.resolvedTarget, 'src/auth/login.js');
assert.match(resolved.normalized, /login\.js/);
assert.ok(resolved.confidence >= 0.7, 'resolving a reference should raise confidence');

// ---- confidence sanity: clear request high, vague low ----
assert.ok(understand('clone https://github.com/a/b').confidence >= 0.85);
assert.ok(understand('make it nicer').confidence <= 0.5);

console.log('intent understanding tests passed');
