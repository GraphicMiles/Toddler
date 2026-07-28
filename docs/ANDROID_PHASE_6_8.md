# Android Phases 6–8

Desktop/Tauri, stdio MCP, Docker, shell execution, and desktop command runners are explicitly deferred.

## Phase 6 — Android Skills Kernel

Implemented foundation:

- modular built-in skill manifests;
- enable/disable lifecycle in Settings;
- lexical on-demand routing with tool allow-lists;
- Android manifest validation rejects execution permission;
- static skill package scanner for remote-shell, dynamic execution, credentials, undeclared networking, environment enumeration, and obfuscation;
- all external script files remain inert on Android;
- built-in Requirements Echo, Scope Creep Detector, Patch Reviewer, Security Reviewer, and Test Planner.

Next before external skill import is exposed:

- SAF skill-folder picker;
- immutable package digest and provenance manifest;
- scanner report UI and explicit install approval;
- trigger-case import/evaluation;
- app-private skill package storage and uninstall cleanup.

## Phase 7 — Smarter Local Agent Roles and Memory

Implemented foundation:

- Planner, Context Scout, Coder, Reviewer, and Verifier role contracts;
- same loaded local model reused across roles to avoid multiple model residency;
- deterministic scope/security/test review of every generated patch;
- one bounded model critic pass;
- at most one coder revision;
- high-severity deterministic findings block approval after revision;
- Requirements Echo stops long/reversing requests before code action;
- project memory persists only approved user facts and mechanically verified facts;
- task memory records request, files, proposal, skills, review, approval/rejection, apply failure, and verification status;
- memory is local and bounded; raw workspace file contents are not persisted as facts.

Next intelligence work:

- import graph and symbol-reference index;
- function/class-level context chunks;
- rolling conversation summary;
- user UI to approve/edit project facts;
- task timeline and review ledger UI;
- optional local embedding/reranking model only after RAM/storage profiling.

## Phase 8 — Suggested and Bounded Autonomous Work

Implemented safety policy:

- Off;
- Suggest only;
- Automatic read-only context;
- Prepare patches for approval.

Hard Android rules:

- no automatic writes;
- no automatic deletes/renames;
- no command or shell execution;
- no tool can elevate its own permission;
- prepared patches still require exact user approval;
- network remains disabled for local skills unless a future explicit Android network-tool policy is designed.

Current suggestion engine can recommend failure review, focused tests after verified patches, and missing project documentation. Broader proactive work remains opt-in and bounded.
