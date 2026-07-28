# Phase 4–5 Execution Plan

## Product decisions

- **Model strategy:** strictly local; no cloud model provider.
- **Order:** finish Phase 4 on Android before building the desktop shell.
- **Desktop command policy:** every command requires individual approval.

## Quality expectation

ForgeAI will target a Claude/ChatGPT-like **coding workflow**: strong context selection, plans, structured actions, exact diffs, review, rollback, and validation. Model reasoning quality remains bounded by the local GGUF selected by the user. A 135M smoke-test model cannot approach frontier-model reasoning. Desktop users will need capable 7B/14B+ coding GGUF models and sufficient RAM for materially stronger results.

## Phase 4 milestones

### 4.1 Structured action protocol — implemented

- JSON-only action envelope.
- Schema validation for `read_file`, `search_files`, `propose_patch`, and `plan`.
- Relative workspace paths only.
- Action/path/patch size limits.
- Invalid or free-form actions rejected before tool registration.

### 4.2 Context engine — initial implementation complete

- Query tokenization and path/name relevance scoring.
- Selected-file priority without injecting code into greetings.
- Entry-file, test-file, and package/build intent weighting.
- Basic JS/TS/Python symbol extraction.
- Bounded RAG routed through the ranked context engine.

Next context work:

- import/dependency graph;
- symbol references and call sites;
- chunking by functions/classes instead of first N characters;
- repository map and rolling conversation summary;
- diagnostics and test-failure retrieval;
- context budget accounting using native tokenization.

### 4.3 Unified diff workflow and approved file creation — implemented

- Parse and validate unified diffs.
- Reject traversal, file deletion/creation, implicit rename, duplicate sections, malformed counts, and context mismatch.
- Preview additions/deletions by file.
- Apply only after approval through `apply_patch`.
- Read and prepare every file before writing.
- Roll back already-written files if a later file fails.
- `create_file` proposals carry one exact relative path and complete content, require approval, reject existing paths, write through the workspace provider, reread verification, and support Undo.
- Ambiguous requests such as “write a landing page” ask for an exact filename before generation.

Next patch work:

- line-by-line visual diff review;
- selected-hunk approval;
- explicit create/delete/rename transaction schemas;
- post-apply reread and hash verification;
- patch history browser and multi-step undo.

### 4.4 Agent loop — initial Android patch loop implemented

```text
User request
→ context engine builds repository map
→ model returns structured read/search/plan actions
→ app validates and executes read-only actions
→ model receives tool results
→ model proposes unified diff
→ app validates exact patch
→ user reviews and approves
→ app applies recoverable transaction
→ app rereads files and requests reviewer pass
```

Safety rules:

- bounded turns, tokens, files, and elapsed time;
- no shell on Android;
- no write without exact diff approval;
- model cannot grant itself tools;
- stop/cancel propagates through the loop;
- repeated invalid actions terminate the run.

### 4.5 Review and history — next

- planner, coder, and reviewer roles using the same local model initially;
- separate role prompts and context budgets;
- reviewer cannot apply changes;
- visible task timeline;
- checkpoints, receipts, diagnostics, and undo.

## Phase 5 milestones

Phase 5 begins after the Android Phase 4 acceptance flow works end-to-end.

1. Add Tauri 2 shell for Windows first during implementation, then validate macOS/Linux.
2. Implement Tauri `WorkspaceProvider` with canonical paths and symlink containment.
3. Add desktop llama.cpp runtime/sidecar lifecycle.
4. Support larger GGUF profiles and CPU/GPU capability detection.
5. Add per-command approval dialog showing exact command, arguments, working directory, timeout, and environment changes.
6. Execute without a shell where possible; use argument arrays and allow-listed executables.
7. Stream stdout/stderr, enforce timeout/cancel, and store receipts.
8. Add signed installer, update, SBOM, license, diagnostics, and CI matrix work.

## Phase 4 exit criteria

A user can ask for a small code change, inspect which files were read, review a validated exact diff, approve it, apply it, see verification, and undo it. No action can escape the selected workspace.

## Phase 5 exit criteria

Signed desktop applications can use larger local GGUF models, open a contained project, complete the Phase 4 loop, and run an exact individually approved validation command with streamed output and cancellation.
