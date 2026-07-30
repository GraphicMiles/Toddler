/**
 * Eval corpus — 100+ tagged requests across every request family.
 *
 * UNDERSTAND_CASES: scored offline against the intent-understanding layer
 *   (category / vagueness / needs / reference resolution / workflow).
 * AGENTIC_CASES: scored end-to-end against the LIVE model + real agenticLoop
 *   over a mock workspace (right tools? task completed?). Needs GROQ_API_KEY.
 */

export const UNDERSTAND_CASES = [
  // ---- git (10) ----
  { id: 'g01', family: 'git', text: 'Pull my repo', expect: { category: 'git', needsIncludes: 'repository URL' } },
  { id: 'g02', family: 'git', text: 'clone https://github.com/GraphicMiles/Toddler', expect: { category: 'git', needsEmpty: true } },
  { id: 'g03', family: 'git', text: 'push my changes to main', expect: { category: 'git' } },
  { id: 'g04', family: 'git', text: 'commit everything with a good message', expect: { category: 'git' } },
  { id: 'g05', family: 'git', text: 'stash my work and checkout the dev branch', expect: { category: 'git' } },
  { id: 'g06', family: 'git', text: 'rebase onto main and resolve conflicts', expect: { category: 'git' } },
  { id: 'g07', family: 'git', text: 'grab the latest from origin', expect: { category: 'git' } },
  { id: 'g08', family: 'git', text: 'puhs my repo', expect: { category: 'git' } },
  { id: 'g09', family: 'git', text: 'get my code from github.com/me/proj', expect: { category: 'git', needsEmpty: true } },
  { id: 'g10', family: 'git', text: 'fetch and merge upstream', expect: { category: 'git' } },

  // ---- terminal (8) ----
  { id: 't01', family: 'terminal', text: 'run the tests', expect: { category: 'terminal' } },
  { id: 't02', family: 'terminal', text: 'npm install react', expect: { category: 'terminal' } },
  { id: 't03', family: 'terminal', text: 'execute the build script', expect: { category: 'terminal' } },
  { id: 't04', family: 'terminal', text: 'run npm run lint and show me the output', expect: { category: 'terminal' } },
  { id: 't05', family: 'terminal', text: 'start the dev server', expect: { category: 'terminal' } },
  { id: 't06', family: 'terminal', text: 'execute a shell command to list processes', expect: { category: 'terminal' } },
  { id: 't07', family: 'terminal', text: 'run node index.js', expect: { category: 'terminal' } },
  { id: 't08', family: 'terminal', text: 'npm test please', expect: { category: 'terminal' } },

  // ---- file_create (10) ----
  { id: 'c01', family: 'file_create', text: 'create a landing page', expect: { category: 'file_create' } },
  { id: 'c02', family: 'file_create', text: 'build me a website and create a new folder project', expect: { category: 'file_create' } },
  { id: 'c03', family: 'file_create', text: 'make a new react component called Hero', expect: { category: 'file_create' } },
  { id: 'c04', family: 'file_create', text: 'generate a readme for this project', expect: { category: 'file_create' } },
  { id: 'c05', family: 'file_create', text: 'scaffold an express server', expect: { category: 'file_create' } },
  { id: 'c06', family: 'file_create', text: 'add a config file for eslint', expect: { category: 'file_create' } },
  { id: 'c07', family: 'file_create', text: 'create a new stylesheet', expect: { category: 'file_create' } },
  { id: 'c08', family: 'file_create', text: 'build a wesbite', expect: { category: 'file_create' } },
  { id: 'c09', family: 'file_create', text: 'make me a dashboard app', expect: { category: 'file_create' } },
  { id: 'c10', family: 'file_create', text: 'create a file for me', expect: { category: 'file_create' } },

  // ---- code_edit (12) ----
  { id: 'e01', family: 'code_edit', text: 'fix the bug in src/auth/login.js', expect: { category: 'code_edit', needsEmpty: true } },
  { id: 'e02', family: 'code_edit', text: 'refactor the authentication code', expect: { category: 'code_edit' } },
  { id: 'e03', family: 'code_edit', text: 'fix the bug in the code', expect: { category: 'code_edit', needsIncludes: 'which file or function' } },
  { id: 'e04', family: 'code_edit', text: 'optimize the render function for performance', expect: { category: 'code_edit' } },
  { id: 'e05', family: 'code_edit', text: 'rename the variable foo to userCount everywhere', expect: { category: 'code_edit' } },
  { id: 'e06', family: 'code_edit', text: 'add error handling to the fetch logic', expect: { category: 'code_edit' } },
  { id: 'e07', family: 'code_edit', text: 'update the css to make the header sticky', expect: { category: 'code_edit' } },
  { id: 'e08', family: 'code_edit', text: 'fix the funtion in app.js', expect: { category: 'code_edit', needsEmpty: true } },
  { id: 'e09', family: 'code_edit', text: 'clean up the imports in index.ts', expect: { category: 'code_edit', needsEmpty: true } },
  { id: 'e10', family: 'code_edit', text: 'replace all var with const in the file', expect: { category: 'code_edit' } },
  { id: 'e11', family: 'code_edit', text: 'patch the memory leak in the component', expect: { category: 'code_edit' } },
  { id: 'e12', family: 'code_edit', text: 'correct the off-by-one error in the loop', expect: { category: 'code_edit' } },

  // ---- read_inspect (10) ----
  { id: 'r01', family: 'read_inspect', text: 'show me package.json', expect: { category: 'read_inspect' } },
  { id: 'r02', family: 'read_inspect', text: 'list the files in my project', expect: { category: 'read_inspect' } },
  { id: 'r03', family: 'read_inspect', text: 'find where handleSend is defined in the code', expect: { category: 'read_inspect' } },
  { id: 'r04', family: 'read_inspect', text: 'review the auth module', expect: { category: 'read_inspect' } },
  { id: 'r05', family: 'read_inspect', text: 'summarize the codebase structure', expect: { category: 'read_inspect' } },
  { id: 'r06', family: 'read_inspect', text: 'what does the parseConfig function do', expect: { category: 'read_inspect' } },
  { id: 'r07', family: 'read_inspect', text: 'search the code for TODO comments', expect: { category: 'read_inspect' } },
  { id: 'r08', family: 'read_inspect', text: 'open the readme and show it to me', expect: { category: 'read_inspect' } },
  { id: 'r09', family: 'read_inspect', text: 'analyze the imports in this module', expect: { category: 'read_inspect' } },
  { id: 'r10', family: 'read_inspect', text: 'trace how the login flow works in the code', expect: { category: 'read_inspect' } },

  // ---- research (10) ----
  { id: 's01', family: 'research', text: 'who is vinicius jr', expect: { category: 'research' } },
  { id: 's02', family: 'research', text: 'what is the latest version of react', expect: { category: 'research' } },
  { id: 's03', family: 'research', text: 'look up the price of bitcoin', expect: { category: 'research' } },
  { id: 's04', family: 'research', text: 'when is the next react conf', expect: { category: 'research' } },
  { id: 's05', family: 'research', text: 'search online for the best state management library 2026', expect: { category: 'research' } },
  { id: 's06', family: 'research', text: 'what is the current stable node LTS', expect: { category: 'research' } },
  { id: 's07', family: 'research', text: 'who won the champions league this year', expect: { category: 'research' } },
  { id: 's08', family: 'research', text: 'how old is Linus Torvalds', expect: { category: 'research' } },
  { id: 's09', family: 'research', text: 'google the vite documentation', expect: { category: 'research' } },
  { id: 's10', family: 'research', text: 'latest news on the openai api', expect: { category: 'research' } },

  // ---- explain (8) ----
  { id: 'x01', family: 'explain', text: 'explain how promises work', expect: { category: 'explain' } },
  { id: 'x02', family: 'explain', text: 'how do i center a div', expect: { category: 'explain' } },
  { id: 'x03', family: 'explain', text: "what's the difference between let and var", expect: { category: 'explain' } },
  { id: 'x04', family: 'explain', text: 'why does useEffect run twice', expect: { category: 'explain' } },
  { id: 'x05', family: 'explain', text: 'teach me about closures', expect: { category: 'explain' } },
  { id: 'x06', family: 'explain', text: 'describe the event loop', expect: { category: 'explain' } },
  { id: 'x07', family: 'explain', text: 'help me understand async await', expect: { category: 'explain' } },
  { id: 'x08', family: 'explain', text: 'how to debounce an input', expect: { category: 'explain' } },

  // ---- code_generate (14) ----
  { id: 'p01', family: 'code_generate', text: 'write a function to reverse a string', expect: { category: 'code_generate' } },
  { id: 'p02', family: 'code_generate', text: 'implement binary search', expect: { category: 'code_generate' } },
  { id: 'p03', family: 'code_generate', text: 'give me a regex to validate an email', expect: { category: 'code_generate' } },
  { id: 'p04', family: 'code_generate', text: 'write a sql query to get the top 5 customers by revenue', expect: { category: 'code_generate' } },
  { id: 'p05', family: 'code_generate', text: 'implement a debounce function in javascript', expect: { category: 'code_generate' } },
  { id: 'p06', family: 'code_generate', text: 'write a recursive fibonacci function', expect: { category: 'code_generate' } },
  { id: 'p07', family: 'code_generate', text: 'code a quicksort algorithm', expect: { category: 'code_generate' } },
  { id: 'p08', family: 'code_generate', text: 'give me a react hook for local storage', expect: { category: 'code_generate' } },
  { id: 'p09', family: 'code_generate', text: 'write a function that checks if a string is a palindrome', expect: { category: 'code_generate' } },
  { id: 'p10', family: 'code_generate', text: 'implement a linked list class', expect: { category: 'code_generate' } },
  { id: 'p11', family: 'code_generate', text: 'write a throttle utility', expect: { category: 'code_generate' } },
  { id: 'p12', family: 'code_generate', text: 'make me a one-liner to dedupe an array', expect: { category: 'code_generate' } },
  { id: 'p13', family: 'code_generate', text: 'write an express middleware for logging', expect: { category: 'code_generate' } },
  { id: 'p14', family: 'code_generate', text: 'give me a regular expression for phone numbers', expect: { category: 'code_generate' } },

  // ---- text_format (12) ----
  { id: 'f01', family: 'text_format', text: 'format this json', expect: { category: 'text_format' } },
  { id: 'f02', family: 'text_format', text: 'convert this csv to a markdown table', expect: { category: 'text_format' } },
  { id: 'f03', family: 'text_format', text: 'turn this list into a table', expect: { category: 'text_format' } },
  { id: 'f04', family: 'text_format', text: 'convert snake_case to camelCase', expect: { category: 'text_format' } },
  { id: 'f05', family: 'text_format', text: 'minify this css', expect: { category: 'text_format' } },
  { id: 'f06', family: 'text_format', text: 'prettify the html', expect: { category: 'text_format' } },
  { id: 'f07', family: 'text_format', text: 'make this text title case', expect: { category: 'text_format' } },
  { id: 'f08', family: 'text_format', text: 'convert this data to yaml', expect: { category: 'text_format' } },
  { id: 'f09', family: 'text_format', text: 'escape these special characters in the string', expect: { category: 'text_format' } },
  { id: 'f10', family: 'text_format', text: 'turn the following into json', expect: { category: 'text_format' } },
  { id: 'f11', family: 'text_format', text: 'normalize the date formats in this text', expect: { category: 'text_format' } },
  { id: 'f12', family: 'text_format', text: 'reformat this markdown', expect: { category: 'text_format' } },

  // ---- delete (6) ----
  { id: 'd01', family: 'delete', text: 'delete old.js', expect: { category: 'delete' } },
  { id: 'd02', family: 'code_edit', text: 'remove the unused imports', expect: { category: 'code_edit' } },
  { id: 'd03', family: 'delete', text: 'get rid of that', expect: { category: 'delete', needsIncludes: 'what to delete' } },
  { id: 'd04', family: 'delete', text: 'drop the temp folder', expect: { category: 'delete' } },
  { id: 'd05', family: 'delete', text: 'erase the log files', expect: { category: 'delete' } },
  { id: 'd06', family: 'delete', text: 'delete src/legacy/old.ts', expect: { category: 'delete' } },

  // ---- chitchat (5) ----
  { id: 'h01', family: 'chitchat', text: 'Hi', expect: { category: 'chitchat' } },
  { id: 'h02', family: 'chitchat', text: 'thanks a lot', expect: { category: 'chitchat' } },
  { id: 'h03', family: 'chitchat', text: 'good morning', expect: { category: 'chitchat' } },
  { id: 'h04', family: 'chitchat', text: 'cool, nice work', expect: { category: 'chitchat' } },
  { id: 'h05', family: 'chitchat', text: 'hey there', expect: { category: 'chitchat' } },

  // ---- vague / ambiguous (6) ----
  { id: 'v01', family: 'ambiguous', text: 'do it', expect: { vague: true } },
  { id: 'v02', family: 'ambiguous', text: 'make it better', expect: { vague: true } },
  { id: 'v03', family: 'ambiguous', text: 'continue', expect: { vague: true } },
  { id: 'v04', family: 'ambiguous', text: 'again', expect: { vague: true } },
  { id: 'v05', family: 'ambiguous', text: 'that one', expect: { vague: true } },
  { id: 'v06', family: 'ambiguous', text: 'fix that', expect: { vague: true } },

  // ---- reference resolution from history (3) ----
  { id: 'ref01', family: 'code_edit', text: 'fix it', history: [
      { role: 'user', content: 'look at src/auth/login.js' },
      { role: 'assistant', content: 'There is a bug in src/auth/login.js' },
    ], expect: { resolvedTargetIncludes: 'login.js' } },
  { id: 'ref02', family: 'read_inspect', text: 'open it again', history: [
      { role: 'assistant', content: 'I created config/settings.json for you' },
    ], expect: { resolvedTargetIncludes: 'settings.json' } },
  { id: 'ref03', family: 'git', text: 'clone it', history: [
      { role: 'user', content: 'check out https://github.com/acme/widgets' },
    ], expect: { resolvedTargetIncludes: 'github.com/acme/widgets' } },

  // ---- multi-step workflow detection (6) ----
  { id: 'w01', family: 'workflow', text: 'clone the repo, run the tests, and fix any failures', expect: { workflow: true } },
  { id: 'w02', family: 'workflow', text: 'create a component then write a test for it then run the tests', expect: { workflow: true } },
  { id: 'w03', family: 'workflow', text: 'read config.json, update the port to 4000, and save it', expect: { workflow: true } },
  { id: 'w04', family: 'workflow', text: 'build the project and deploy it', expect: { workflow: true } },
  { id: 'w05', family: 'workflow', text: 'refactor the auth module and add tests and update the docs', expect: { workflow: true } },
  { id: 'w06', family: 'workflow', text: 'search for the bug, fix it, then commit and push', expect: { workflow: true } },
];

export const AGENTIC_CASES = [
  // ---- read / inspect ----
  { id: 'a01', family: 'read', text: 'Read the file config.json and tell me the value of the "name" field.',
    files: { 'config.json': '{"name":"toddler-app","version":"1.0.0"}' }, expectTools: ['read_file'], expectAnswer: /toddler-app/i },
  { id: 'a05', family: 'list', text: 'List the files in the workspace and tell me how many there are.',
    files: { 'a.js': '1', 'b.js': '2', 'c.js': '3' }, expectTools: ['list_files'], expectAnswer: /\b3\b|three/i },
  { id: 'a06', family: 'search', text: 'Search the code for where the function "computeTotal" is defined and tell me which file it is in.',
    files: { 'utils.js': 'export function computeTotal(a,b){return a+b;}', 'main.js': 'import {computeTotal} from "./utils.js";' }, expectTools: ['search_code'], expectAnswer: /utils\.js/i },

  // ---- create (simple, nested, multi) ----
  { id: 'a02', family: 'create', text: 'Create a file called hello.txt containing exactly: Hello World',
    files: {}, expectTools: ['create_file'], expectFile: { path: 'hello.txt', includes: 'Hello World' } },
  { id: 'a03', family: 'create_nested', text: 'Create a website: make a folder called site and put an index.html inside it with a basic HTML5 page.',
    files: {}, expectTools: ['create_file'], expectFileAny: [{ path: 'site/index.html', includes: '<html' }] },
  { id: 'a07', family: 'multi', text: 'Create two files: sum.js exporting add(a,b), and index.js that imports and uses it.',
    files: {}, expectTools: ['create_file'], expectFileAny: [{ path: 'sum.js', includes: 'add' }, { path: 'index.js', includes: 'import' }], minToolCalls: 2 },

  // ---- edit / fix ----
  { id: 'a04', family: 'edit', text: 'The file greet.js has a bug. Read it, then fix it so it exports a function that returns "hi". Write the corrected file.',
    files: { 'greet.js': 'export function greet() { return "bye"; }' }, expectTools: ['read_file', 'write_file'], expectFile: { path: 'greet.js', includes: 'hi' } },
  { id: 'a09', family: 'edit_logic', text: 'In calc.js the add function wrongly subtracts. Read it and fix add to actually add, then write it back.',
    files: { 'calc.js': 'export function add(a,b){ return a-b; }' }, expectTools: ['read_file', 'write_file'], expectFile: { path: 'calc.js', includes: 'a + b' } },
  { id: 'a10', family: 'edit_bugfix', text: 'sum.js has an off-by-one bug in its loop that should total 1..n inclusive. Read and fix it.',
    files: { 'sum.js': 'export function total(n){let s=0;for(let i=1;i<n;i++)s+=i;return s;}' }, expectTools: ['read_file', 'write_file'], expectFile: { path: 'sum.js', includes: 'i <= n' } },

  // ---- complex code logic (generate into a file) ----
  { id: 'a11', family: 'logic', text: 'Create palindrome.js that exports isPalindrome(str) ignoring case and non-alphanumerics. Include the implementation.',
    files: {}, expectTools: ['create_file'], expectFile: { path: 'palindrome.js', includes: 'isPalindrome' } },
  { id: 'a12', family: 'logic', text: 'Create fib.js exporting fib(n) that returns the nth Fibonacci number iteratively.',
    files: {}, expectTools: ['create_file'], expectFileAny: [{ path: 'fib.js', includes: 'fib' }] },

  // ---- text formatting (produce a file / answer) ----
  { id: 'a13', family: 'format', text: 'Here is minified JSON: {"a":1,"b":[2,3],"c":{"d":4}} — write it pretty-printed (2-space indent) to pretty.json',
    files: {}, expectTools: ['create_file'], expectFile: { path: 'pretty.json', includes: '"a": 1' } },
  { id: 'a14', family: 'format', text: 'Convert this CSV to a markdown table and write it to table.md: name,age\\nAda,36\\nLinus,54',
    files: {}, expectTools: ['create_file'], expectFileAny: [{ path: 'table.md', includes: '|' }] },

  // ---- workflow (multi-step) ----
  { id: 'a15', family: 'workflow', text: 'Read version.txt, then create released.txt containing exactly the same content prefixed with "v".',
    files: { 'version.txt': '1.2.3' }, expectTools: ['read_file', 'create_file'], expectFile: { path: 'released.txt', includes: 'v1.2.3' }, minToolCalls: 2 },
  { id: 'a16', family: 'workflow', text: 'List the files, then read the one named notes.md and tell me its first line.',
    files: { 'notes.md': 'First line here\\nsecond line', 'other.js': 'x' }, expectTools: ['read_file'], expectAnswer: /first line here/i },

  // ---- clarify on ambiguity ----
  { id: 'a08', family: 'clarify', text: 'fix it', files: {}, expectAsksOrResponds: true },
];
