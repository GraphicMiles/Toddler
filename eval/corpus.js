/**
 * Eval corpus — tagged requests across every request family.
 *
 * Two kinds of cases:
 *  - "understand": scored offline against the intent-understanding layer
 *    (category / vagueness / needs / reference resolution). Deterministic.
 *  - "agentic": scored end-to-end against the LIVE model + real agentic loop
 *    (did it call the right tools / finish the task?). Requires GROQ_API_KEY.
 */

export const UNDERSTAND_CASES = [
  // family: git
  { id: 'u01', family: 'git', text: 'Pull my repo', expect: { category: 'git', needsIncludes: 'repository URL' } },
  { id: 'u02', family: 'git', text: 'clone https://github.com/GraphicMiles/Toddler', expect: { category: 'git', needsEmpty: true } },
  { id: 'u03', family: 'git', text: 'push my changes to main', expect: { category: 'git' } },
  { id: 'u04', family: 'git', text: 'commit everything with a message', expect: { category: 'git' } },
  // family: terminal
  { id: 'u05', family: 'terminal', text: 'run the tests', expect: { category: 'terminal' } },
  { id: 'u06', family: 'terminal', text: 'npm install react', expect: { category: 'terminal' } },
  { id: 'u07', family: 'terminal', text: 'execute the build script', expect: { category: 'terminal' } },
  // family: file_create
  { id: 'u08', family: 'file_create', text: 'create a landing page', expect: { category: 'file_create' } },
  { id: 'u09', family: 'file_create', text: 'build me a website and create a new folder project', expect: { category: 'file_create' } },
  { id: 'u10', family: 'file_create', text: 'make a new react component called Hero', expect: { category: 'file_create' } },
  { id: 'u11', family: 'file_create', text: 'generate a readme for this project', expect: { category: 'file_create' } },
  // family: code_edit
  { id: 'u12', family: 'code_edit', text: 'fix the bug in src/auth/login.js', expect: { category: 'code_edit', needsEmpty: true } },
  { id: 'u13', family: 'code_edit', text: 'refactor the authentication code', expect: { category: 'code_edit' } },
  { id: 'u14', family: 'code_edit', text: 'fix the bug in the code', expect: { category: 'code_edit', needsIncludes: 'which file or function' } },
  // family: read_inspect
  { id: 'u15', family: 'read_inspect', text: 'show me package.json', expect: { category: 'read_inspect' } },
  { id: 'u16', family: 'read_inspect', text: 'list the files in my project', expect: { category: 'read_inspect' } },
  { id: 'u17', family: 'read_inspect', text: 'find where handleSend is defined in the code', expect: { category: 'read_inspect' } },
  { id: 'u18', family: 'read_inspect', text: 'review the auth module', expect: { category: 'read_inspect' } },
  // family: research
  { id: 'u19', family: 'research', text: 'who is vinicius jr', expect: { category: 'research' } },
  { id: 'u20', family: 'research', text: 'what is the latest version of react', expect: { category: 'research' } },
  // family: explain
  { id: 'u21', family: 'explain', text: 'explain how promises work', expect: { category: 'explain' } },
  { id: 'u22', family: 'explain', text: 'how do i center a div', expect: { category: 'explain' } },
  // family: delete
  { id: 'u23', family: 'delete', text: 'delete old.js', expect: { category: 'delete' } },
  { id: 'u24', family: 'delete', text: 'get rid of that', expect: { category: 'delete', needsIncludes: 'what to delete' } },
  // family: chitchat
  { id: 'u25', family: 'chitchat', text: 'Hi', expect: { category: 'chitchat' } },
  { id: 'u26', family: 'chitchat', text: 'thanks a lot', expect: { category: 'chitchat' } },
  // typos / shorthand robustness
  { id: 'u27', family: 'git', text: 'puhs my repo', expect: { category: 'git' } },
  { id: 'u28', family: 'file_create', text: 'build a wesbite', expect: { category: 'file_create' } },
  { id: 'u29', family: 'code_edit', text: 'fix the funtion in app.js', expect: { category: 'code_edit', needsEmpty: true } },
  // vagueness + reference resolution
  { id: 'u30', family: 'ambiguous', text: 'do it', expect: { vague: true } },
  { id: 'u31', family: 'ambiguous', text: 'make it better', expect: { vague: true } },
  { id: 'u32', family: 'code_edit', text: 'fix it', history: [
      { role: 'user', content: 'look at src/auth/login.js' },
      { role: 'assistant', content: 'There is a bug in src/auth/login.js' },
    ], expect: { resolvedTargetIncludes: 'login.js' } },
];

export const AGENTIC_CASES = [
  {
    id: 'a01', family: 'read', text: 'Read the file config.json and tell me the value of the "name" field.',
    files: { 'config.json': '{"name":"toddler-app","version":"1.0.0"}' },
    expectTools: ['read_file'],
    expectAnswer: /toddler-app/i,
  },
  {
    id: 'a02', family: 'create', text: 'Create a file called hello.txt containing exactly: Hello World',
    files: {},
    expectTools: ['create_file'],
    expectFile: { path: 'hello.txt', includes: 'Hello World' },
  },
  {
    id: 'a03', family: 'create_nested', text: 'Create a website: make a folder called site and put an index.html inside it with a basic HTML5 page.',
    files: {},
    expectTools: ['create_file'],
    expectFileAny: [{ path: 'site/index.html', includes: '<html' }],
  },
  {
    id: 'a04', family: 'edit', text: 'The file greet.js has a bug. Read it, then fix it so it exports a function that returns "hi". Write the corrected file.',
    files: { 'greet.js': 'export function greet() { return "bye"; }' },
    expectTools: ['read_file', 'write_file'],
    expectFile: { path: 'greet.js', includes: 'hi' },
  },
  {
    id: 'a05', family: 'list', text: 'List the files in the workspace and tell me how many there are.',
    files: { 'a.js': '1', 'b.js': '2', 'c.js': '3' },
    expectTools: ['list_files'],
    expectAnswer: /\b3\b|three/i,
  },
  {
    id: 'a06', family: 'search', text: 'Search the code for where the function "computeTotal" is defined and tell me which file it is in.',
    files: { 'utils.js': 'export function computeTotal(a,b){return a+b;}', 'main.js': 'import {computeTotal} from "./utils.js";' },
    expectTools: ['search_code'],
    expectAnswer: /utils\.js/i,
  },
  {
    id: 'a07', family: 'multi', text: 'Create two files: sum.js exporting add(a,b), and index.js that imports and uses it.',
    files: {},
    expectTools: ['create_file'],
    expectFileAny: [{ path: 'sum.js', includes: 'add' }, { path: 'index.js', includes: 'import' }],
    minToolCalls: 2,
  },
  {
    id: 'a08', family: 'clarify', text: 'fix it',
    files: {},
    // Ambiguous with no context — a smart agent asks rather than guesses.
    expectAsksOrResponds: true,
  },
];
