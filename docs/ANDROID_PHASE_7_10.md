# Android Phases 7–10 Completion Scope

Desktop, Tauri, shell commands, Docker, stdio MCP, and desktop integrations remain deferred.

## Phase 7 — Repository Intelligence and Memory

Implemented:

- on-demand bounded repository index;
- maximum 150 code/text files and 2 MiB source analysis per build;
- persisted metadata only: paths, symbols, imports, calls, definitions, and callers;
- repository-index query contributes candidates to RAG;
- bounded local import-edge following;
- approved project-memory UI to add, edit, and remove facts;
- only user-approved or mechanically verified facts enter durable memory;
- raw workspace contents and model guesses are not stored as project facts;
- task event timeline with files, role stages, review, approval, failure, and verification.

## Phase 8 — Bounded Subagent Orchestration

Implemented local roles:

- Planner;
- Context Scout;
- Coder;
- Reviewer;
- Verifier.

All roles reuse the single loaded local GGUF. The orchestrator enforces:

- maximum three model calls per patch task;
- maximum six files;
- five-minute foreground budget;
- explicit stage events;
- one critic pass;
- at most one coder revision;
- deterministic scope/security/test checks;
- high-severity findings block approval;
- exact diff approval remains mandatory.

## Phase 9 — Smarter Responses

Implemented response modes:

- Fast: one local generation;
- Balanced: normal streamed generation;
- Reviewed: draft, critic, and final revision.

Reviewed mode uses three generations and is slower. The 135M smoke-test model always uses one pass. Approved project memory is inserted into normal and coding-agent prompts. A deterministic arithmetic path handles simple add/subtract/multiply/divide questions without relying on tiny-model arithmetic.

## Phase 10 — User-Controlled Autonomous Queue

Implemented:

- persistent per-workspace foreground task queue;
- proactive suggestions can be added to the queue;
- every queued task requires the user to press Run;
- visible queued/running/waiting-approval/completed/failed/cancelled states;
- patch tasks stop at waiting approval;
- approval marks a queued patch complete only after apply and reread verification;
- rejection marks it cancelled;
- queue items can be removed.

Restricted modes retain these limits:

- no automatic writes, deletes, or renames;
- no command execution;
- no background unattended model loop;
- no permission escalation;
- no network for external skills;
- no desktop or MCP dependency.

Full Autonomous mode is an explicit separate opt-in with app-sandbox terminal, network research, autonomous workspace changes, app-private JGit operations, and GitHub writes. It remains foreground-only and cannot gain root or other-app access. See `ANDROID_FULL_AUTONOMY.md`.

These phases are complete for the defined Android-safe scope. Further quality gains depend primarily on larger local models, device performance, and physical-device UX testing.
