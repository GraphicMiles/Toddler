# Android Phases 6–8

Desktop/Tauri, stdio MCP, Docker, shell execution, and desktop command runners are explicitly deferred.

## Phase 6 — Android Skills Kernel

Implemented:

- modular built-in skill manifests;
- enable/disable lifecycle in Settings;
- external single-file `SKILL.md` picker through Android SAF;
- YAML frontmatter/body parser;
- static security scanner before installation;
- critical findings reject installation;
- warning findings require confirmation;
- external skills install disabled by default;
- external skill removal and persistence;
- external skills cannot replace built-ins, request network access, or request execution;
- lexical on-demand routing with tool allow-lists;
- all skill scripts remain inert and are never executed on Android;
- built-in Requirements Echo, Scope Creep Detector, Patch Reviewer, Security Reviewer, and Test Planner.

External Android skill packages intentionally support one `SKILL.md` file first. Multi-file references/scripts can be added later only with a signed archive manifest and per-file digest policy.

## Phase 7 — Smarter Local Agent Roles and Memory

Implemented:

- Planner, Context Scout, Coder, Reviewer, and Verifier role contracts;
- same loaded local model reused across roles to avoid multiple model residency;
- deterministic scope/security/test review of every generated patch;
- one bounded model critic pass;
- at most one coder revision;
- high-severity deterministic findings block approval after revision;
- Requirements Echo stops long/reversing requests before code action;
- richer file context includes symbols, imports, calls, and bounded local import-edge following;
- project memory persists only approved user facts and mechanically verified facts;
- task memory records request, files, proposal, skills, review, approval/rejection, apply failure, and verification status;
- task timeline UI exposes the local event ledger in Settings;
- memory is local and bounded; raw workspace file contents are not persisted as facts.

Potential later Android intelligence work:

- a complete repository-wide symbol-reference index for large projects;
- user UI to approve/edit durable project facts;
- optional local embedding/reranking model only after RAM/storage profiling.

## Phase 8 — Suggested and Bounded Autonomous Work

Implemented policy levels:

- Off;
- Suggest only;
- Automatic read-only context;
- Prepare patches for approval.

Implemented presentation:

- proactive suggestion chips above chat input;
- failed-task review suggestion;
- focused-test suggestion after verified patches;
- missing-README suggestion;
- one tap pre-fills the suggested prompt but never sends it automatically.

Restricted-mode Android rules:

- no automatic writes;
- no automatic deletes/renames;
- no command or shell execution;
- no tool can elevate its own permission;
- prepared patches still require exact user approval;
- network remains disabled for external local skills.

A later explicit Full Autonomous mode overrides the first three restrictions for the app sandbox and app-private JGit clones; see `ANDROID_FULL_AUTONOMY.md`.

## Android Workspace Editor

- SAF file creation selects MIME from the requested extension, preventing `index.css` from becoming `index.css.txt`;
- unknown filenames use a ForgeAI custom text MIME so providers do not append `.txt`;
- CodeMirror editor with line numbers, keyword highlighting, active line, folding, search, completion, multi-selection, bracket matching, and mobile scrolling;
- lazy-loaded syntax support for JS/JSX, TS/TSX, JSON, CSS, HTML, Markdown, Python, Java/Kotlin, C/C++, PHP, Rust, SQL, XML, and YAML;
- lazy-loaded Prettier formatting for JS/TS/JSON/CSS/SCSS/Less/HTML/Markdown/YAML;
- Java, Kotlin, Python, C/C++, PHP, Rust, and SQL are highlighted but not automatically reformatted without a safe language-specific formatter.
