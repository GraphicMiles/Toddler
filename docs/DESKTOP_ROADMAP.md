# ForgeAI — Desktop / Future Roadmap (Pending)

**Status:** Deferred. These capabilities are valuable but are a poor fit for the
current platform (Capacitor + on-device GGUF on Android, or a cloud API), where
CPU, battery, context window, and the sandboxed SAF filesystem are hard limits.
They are archived here to be implemented on a **desktop build (e.g. Tauri)** —
or once a capable local runtime + real filesystem access exist — where idle
GPU/CPU and unrestricted file watching make them practical.

Guiding principle for everything below:

> **Reasoning depth must scale with model capability and platform budget.**
> Deep, always-on analysis belongs on desktop with a capable model; mobile keeps
> lean, capability-gated, on-demand behaviour (see `provider.supportsToolUse`).

---

## Deferred to desktop

### D1. Continuous filesystem watching / real-time indexing
- **Why deferred:** Android SAF has no reliable, low-cost file-watch API; a
  real-time watcher is a battery/CPU sink on mobile.
- **Desktop plan:** Native FS watcher → incremental symbol/import/graph/embedding
  updates on save. On mobile, use index-on-open / index-on-save instead (see the
  shipped incremental indexer work).

### D2. Codebase Health Model (always-updated)
Track duplicate code, dead code, oversized files, complex functions, circular
imports, unused packages, slow functions, security issues, memory leaks, race
conditions.
- **Why deferred:** Continuous whole-repo static analysis is too heavy for a
  phone CPU and delivers little there.
- **Desktop plan:** Background analysis workers; surface a health dashboard.

### D3. Predictive Assistance (Cursor-style)
Predict next files, likely tools, related bugs, likely dependencies, potential
failures while the user types.
- **Why deferred:** Assumes idle GPU + an IDE editing surface; low ROI in a
  mobile chat UI.
- **Desktop plan:** Editor-integrated prediction with a warm local model.

### D4. Full Project Knowledge Graph (call graph + complexity + ownership)
Files → functions → classes → variables → imports → references → call graph →
ownership → complexity, kept live.
- **Why deferred (full version):** Live whole-repo graph is memory-heavy on
  mobile. A **lite** symbol + import + references index ships on mobile; the
  full call-graph/complexity/ownership layer is desktop-only.
- **Desktop plan:** Persisted graph DB, incremental updates via D1.

### D5. Full 7-stage Multi-Agent Pipeline
Planner → Researcher → Coder → Reviewer → Security → Performance → Tester, each
reviewing the previous.
- **Why deferred (full version):** 7 sequential model passes = ~7× latency and
  context blow-up on a mobile model. Mobile keeps the existing 3-role pipeline
  (planner → coder → reviewer + skills), cloud-gated.
- **Desktop plan:** Full pipeline with parallel reviewers on a capable model.

### D6. Self-reflection on *every* response (#12)
- **Why deferred (always-on):** Doubles latency/tokens. Mobile reserves
  reflection for write/dangerous actions only.
- **Desktop plan:** Full reflective pass on every turn with a fast local model.

### D7. Repository-scale continuous understanding (#18)
Continuously generated architecture map, dependency graph, API map, DB schema,
routes, components, state flow, permissions, configuration.
- **Why deferred:** Same cost profile as D2/D4; needs background workers + FS
  access.
- **Desktop plan:** Generated on index + refreshed via the FS watcher.

---

## Shipping on mobile now (not deferred — tracked here for context)

These are the capability-gated, low-cost versions being implemented on the
current platform:

- **Mission planner before each task** (cloud-gated) — plan → execute → verify.
- **Auto-verification before "done"** — read-back + lint/test/build gate.
- **Capability-gated reasoning depth** — via `provider.supportsToolUse`.
- **Evidence-based confidence** (reversibility/test/RAG signals, *not* model
  self-rated) + clarify-when-uncertain.
- **Bounded scratchpad** (structured goals/open-questions/next-action).
- **Root-cause self-correction** (diagnose-then-vary, upgrading blind retry).
- **Incremental symbol/import index** (lite D4).
- **Semantic vector memory + reranking** — already shipped (`semanticVector.js`).

---

*Archived from the "Improvements and feedback" review. Revisit when a desktop
(Tauri) build or a capable local runtime with real filesystem access exists.*
