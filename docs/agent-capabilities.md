# ForgeAI Agent — Capabilities Inventory & Debug Backlog

Grounded in code (paths + line refs). Status legend: ✅ works · ⚠️ works-but-subpar · ❌ broken/fake · 🔒 hidden-behind-gate

## 1. Instant local answers (no model, no network)
| # | Capability | Entry point | Status |
|---|-----------|-------------|--------|
| 1 | Device time / date | `src/agent/deterministicAnswers.js` | ✅ |
| 2 | Math (a + b, ×, ÷…) | `src/agent/deterministicAnswers.js` | ✅ |

## 2. Chat generation
| # | Capability | Entry point | Status |
|---|-----------|-------------|--------|
| 3 | Streaming chat (local llama.cpp GGUF / cloud providers) | `src/App.jsx` → provider.stream | ✅ |
| 4 | Response quality modes (fast / balanced / reviewed = draft→critic→revision) | `src/agent/responseQuality.js` | ⚠️ works, but "Reviewed" triples latency on 0.5B models |
| 5 | History trim + context compression | `src/App.jsx` (~493) | ✅ |
| 6 | Episodic memory recall + store | `src/memory/episodicMemory.js` | ✅ |
| 7 | Project memory prompt injection | `src/App.jsx` (projectMemoryPrompt) | ✅ |

## 3. Web research
| # | Capability | Entry point | Status |
|---|-----------|-------------|--------|
| 8 | Auto-research on news/fact queries → evidence injected into prompt | `src/agent/onlineResearch.js` + `App.jsx` | ✅ publisher extraction, relevance-ranked evidence, source cards in UI, **og:image thumbnails** (`fetchSourcePreviews`, top 4, native best-effort), clickable `[n]` citation chips |
| 9 | `research:query` / `research:scrape` registry tools | `src/tools/researchTools.js` | 🔒 registered but never invoked by the chat flow |
| 10 | URL fetch (Archive Mode) | `App.jsx` → ResearchRuntime.fetchUrl | 🔒 only via research:scrape (unwired) |

## 4. Code & workspace actions
| # | Capability | Entry point | Status |
|---|-----------|-------------|--------|
| 11 | Code-change requests → subagent patch proposal + approval card | `App.jsx` (isCodeChangeRequest) → `generatePatchProposal` | ✅ best-developed path |
| 12 | Workspace tools: read_file, write_file, create_file, search, index, rename, delete, validate/apply_patch, terminal | `src/tools/workspaceTools.js` | 🔒 reachable only via structured patch proposals; no free-form tool use in normal chat |
| 13 | Rule-based keyword planner (`AgentCore.planTask`/`proposeActions`/`processMessage`) | `src/agent/core.js` | ❌ dead code in live chat — wired only in tests |
| 14 | Workspace RAG (context files, consent dialog) | `App.jsx` retrieveRelevantContext | ✅ |

## 5. Git / GitHub / terminal (native)
| # | Capability | Entry point | Status |
|---|-----------|-------------|--------|
| 15 | git clone/status/log/fetch/pull/checkout/commit/push/rebase (JGit) | `src/agent/fullAutonomyRunner.js` → native GitRuntime | 🔒 **needs Full Autonomous** (Settings → Agent → Autonomy level). **Fixed round 7**: tool commands now get an honest gate message instead of a hallucinated refusal |
| 16 | GitHub API actions (encrypted token vault) | fullAutonomyRunner → GithubRuntime | 🔒 same gate; **fixed**: non-auto-approved runner actions now surface as chat approval cards (`onPendingActions` → ActionCard → `executeAutonomousAction`) |
| 17 | Repo archive import → workspace | `RepositoryIndexPanel` / GithubRuntime.importArchive | ✅ (via Settings → Agent panel) |
| 18 | App-sandbox terminal | workspaceTools `terminal` / fullAutonomyRunner | 🔒 simulated unless Experimental → Real Terminal is ON |
| 19 | `github:propose`, `github:run_maintenance` tools | `src/tools/githubTools.js` | ❌ registered, never surfaced to the model — dead |

## 6. Social / misc
| # | Capability | Entry point | Status |
|---|-----------|-------------|--------|
| 20 | `social:research` tool | `src/tools/advancedToolRegistry.js` | ✅ **removed** — the stub returned fabricated posts; a tool that invents data is worse than no tool |
| 21 | `fs:analyze` tool | same | ⚠️ trivial counts only, unwired |
| 22 | Social login/posting panels | `src/social/*`, `SocialMediaSettings` | ⚠️ real providers scaffolded; verify per provider |
| 23 | Autonomous task queue + proactive suggestions | `src/agent/autonomousQueue.js`, `autonomyPolicy.suggestNextActions` | ✅ runs only when user presses Run |

## Hard limits to remember
- The bundled Qwen2.5-Coder **0.5B** cannot do reliable function-calling or long factual synthesis. Some "dumb agent" behavior is the model, not the plumbing. Bigger GGUF (1.5B–3B) or a cloud provider is the real fix for answer quality.
- Without a Google CSE key + CX, research = Google News RSS + Wikipedia only, and news links are `news.google.com` redirect URLs with no thumbnails.

## Debug backlog (next rounds, in priority order)
1. ~~Research images~~ ✅ og:image per top-4 source via native fetch; thumbnails in source cards.
2. ~~GitHub approvals UX~~ ✅ runner `pending-approval` actions → real chat approval cards.
3. ~~Citation links~~ ✅ `[n]` in answer text = tappable chip opening the source.
4. ~~Dead tools~~ ✅ fake `social:research` removed. (The `agent/core.js` keyword planner is kept — exercised by tests, harmless metadata for patch prompts.)
5. Evaluate 1.5B+ model default for agent tasks (product decision — download size).
6. Optional: Google CSE key support is already in Settings → Integrations for richer search results.
