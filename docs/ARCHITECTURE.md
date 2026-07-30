# ForgeAI — Architecture & Capabilities (Current)

**Scope:** This document reflects the codebase on `main` as of the latest commit.
It describes what the agent can and cannot do, every subsystem, and exactly how a
prompt flows from the input box → intent → context → model → tools → response.

---

## 1. Capabilities & Limits

### 1.1 What the agent can do

**Conversation & knowledge**
- Streamed chat with a smooth typewriter reveal (`useTypewriter`).
- Thorough, structured answers for informational questions (depth directive in the system prompt).
- Contextual **follow-up suggestion chips** after each answer, including cross-topic bridges (e.g. AI + frontend → "build a site with an AI agent").
- Web research with source cards (native only) for "who is / latest / current" queries.

**Coding & workspace (agentic)**
- Multi-step **agentic loop**: read → plan → edit → verify → respond.
- Tools: `read_file`, `read_symbol`, `write_file`, `create_file`, `create_folder`, `delete_file`, `list_files`, `search_code`, `run_terminal`, `search_web`, `fetch_page`, `git_clone/status/commit/push/diff/log`, `ask_user`, `respond`.
- **Native function-calling** for cloud models (real `tools` API), with graceful fallbacks.
- Auto-creates parent folders; overwrites existing files instead of hard-failing.
- **Mission planner** (cloud models): turns a request into an ordered plan before executing.
- **Auto-verification** before declaring "done": reads written files back; if a write didn't stick, feeds the discrepancy back to fix.
- **Root-cause self-correction**: classifies failures and tries a different approach, not blind retries.
- Skeleton-first reads for large files (outline + `read_symbol`) to save tokens.

**Intelligence discipline**
- **Intent understanding layer**: typo normalization, vagueness detection, reference resolution ("fix it" → last file), and classification across ~11 families.
- **Evidence-based confidence** → proceed / clarify / confirm (never model self-rating).
- **Bounded scratchpad**: hidden working memory across loop steps.
- **Semantic vector memory**: cosine-similarity recall of past episodes (typo-tolerant).

**Providers & reliability**
- 17 built-in OpenAI-compatible cloud providers + custom.
- **Automatic failover** to the next provider on quota/rate-limit/server/network errors, ordered **strongest model first**.
- Per-provider cooldowns; transient-error retry with backoff; malformed-SSE-chunk tolerance.
- On-device GGUF models (Android, via llama.cpp) and Ollama (browser dev).

**Safety & control**
- Autonomy levels, automation tiers, and a 4-level safety policy.
- Skills system with security scanning of imported `SKILL.md`.
- Deterministic zero-token answers for time/date/math and text formatting (JSON/CSV/case).

### 1.2 What the agent cannot do (limits)

- **Model ceiling.** Intelligence is bounded by the chosen model. On-device GGUF (sub-1B) is weak; Groq Llama-3.3-70B is good but not frontier (Claude/GPT-5). Scaffolding cannot exceed the base model's reasoning.
- **Tools require Android native mode.** Terminal, Git, and native research only run on-device (`isNative`); browser/desktop mode has no real terminal/git.
- **Tools require a selected workspace folder** and **execution enabled** (Autonomy = Full or Automation tier > Assisted).
- **No live repository knowledge graph.** `projectIndexer` builds a symbol/import index on demand, not continuously; there's no persistent call-graph. (Deferred — see `DESKTOP_ROADMAP.md`.)
- **No real-time filesystem watching, codebase-health model, or predictive assistance** (desktop-only, deferred).
- **Rule-based intent** (not an LLM parser) — novel phrasings can slip the fast-path classifier.
- **Web research is native-only** and depends on the provider/Google CSE; source relevance can occasionally mismatch.
- **Mobile context limits** — small models have 2K–8K context; long tasks rely on compaction.
- **No multimodal input** (image understanding) in the current build.

---

## 2. High-Level Architecture

```
Capacitor (Android) / Browser (dev)
        │
   React UI  ── ChatContainer, Message, MyCollection, Settings, Workspace
        │
   App.jsx  ── handleSendMessage()  ← the central orchestrator
        │
 ┌──────┴────────────────────────────────────────────────────┐
 │ PRE-PROCESS → INTENT ROUTE → CONTEXT ASSEMBLE → GENERATE   │
 └──────┬────────────────────────────────────────────────────┘
        │
   Providers (modelProvider.js + providerFailover.js)
        │
   ┌────┴─────┬──────────────┬─────────────────┐
 On-device   Ollama      OpenAI-compatible cloud (+ failover)
 (llama.cpp) (dev)       (Groq, Cerebras, Gemini, …)
        │
   nativeBridge.js ── Capacitor plugins: Workspace(SAF), Terminal, Git,
                      Research, GitHub, Credential vault, GGUF runtime
```

**Runtime detection:** `nativeBridge.js` exposes `isNative`, `isAndroid`, `isDesktop`. Many capabilities branch on `isNative`.

---

## 3. The Message Pipeline (how a prompt is processed)

Everything runs in **`App.jsx → handleSendMessage(text)`**. Order of operations:

### 3.1 Pre-processing (before any model call)
1. **Requirements echo** — `shouldEchoRequirements` → structured brief (skill).
2. **Pending intent resolution** — `tryResolvePendingIntent`: if the agent last asked a question (e.g. "which repo URL?"), this message is parsed as the answer (`intentRouter.js`).
3. **Entity resolution** — `resolveEntityFromContext`: short/ambiguous terms disambiguated from history (e.g. "mess" → "Messi") with Levenshtein tolerance.
4. **GitHub URL auto-detect** — a bare GitHub URL becomes `clone <url>` (native).
5. **Conversation context** — `processConversationTurn` updates the entity/topic engine (`conversationContext.js`).
6. **Intent understanding** — `understand()` (`intentUnderstanding.js`): normalizes typos, detects vagueness, resolves references, classifies the family, flags workflows. Vague references get the last concrete filename/URL attached.
7. **Clarification** — `checkNeedsClarification` (browser only) may ask instead of guessing.
8. **Deterministic answers (zero-token)** — `deterministicDeviceFact` (time/date), `deterministicAnswer` (math), `deterministicFormat` (JSON pretty/minify, case conversion, CSV→table). If any returns a value, we answer instantly with **no model call**.
9. **Filename resolution** — `needsCreationFilename`: "create the file" with no name reuses a recently discussed filename (`recentFilenameFromMessages`) or asks.

### 3.2 Intent routing (the decision tree)
After pre-processing, `handleSendMessage` chooses a path:

```
if isCodeChangeRequest AND NOT routeCodeChangeToAgent:
      → phase4Runner (single-shot create_file / propose_patch, approval card)
else:
   fullAutonomy = autonomy==FULL ; toolExecutionEnabled = fullAutonomy || tier>assisted
   if native & !toolExecutionEnabled & isActionableToolRequest:
        → blocked message ("enable execution")   (remembers request for "try again")
   elif native & toolExecutionEnabled & isGitRequestWithoutRepo:
        → ask for repo URL (sets pending intent)
   elif native & toolExecutionEnabled &
        (isAutonomousToolRequest OR (supportsToolUse & (isWorkspaceActionRequest OR isCodeChangeRequest))):
        → MISSION PLANNER (cloud) → runAgenticLoop  (multi-step tools)
   else:
        → generateQualityResponse  (chat; may trigger web research)
```

`routeCodeChangeToAgent` = `provider.supportsToolUse && (Full || tier>assisted) && isNative` — so **capable cloud models build files through the agentic loop**, while small/local models use the safer single-shot proposal path.

### 3.3 Context assembly (before the model call)
1. **Token budget** — history trimmed to `contextTokens − maxOutputTokens − ragTokens − 128`.
2. **Context compression** — `contextCompressor.compress` keeps first-2 + last-4, summarizes the middle.
3. **Episodic memory recall** — `episodicMemory.recall` (semantic + token, relevance-floored) injects relevant past experiences.
4. **RAG** — `shouldRetrieveWorkspaceContext` → `retrieveRelevantContext` reads relevant files (with a user confirm) and injects them.
5. **Project + persistent memory** — `projectMemoryPrompt`, `persistentMemory.getMemoryPrompt`.
6. **Conversation context prompt** — `getContextPrompt` (entities/topics/references).
7. **Depth directive** — a system message asking for thorough, structured answers.

### 3.4 Generation
- **Agentic path:** `runAgenticLoop` (see §5).
- **Chat path:** `generateQualityResponse` (Fast/Balanced/Reviewed) streams tokens to the message; web research evidence injected if triggered.

### 3.5 Post-processing
- File actions & activity steps attached to the message (rendered by `FileActionResult`, `AgentActivityLog`).
- Research **source cards** attached; og:image previews fetched (native).
- **Episodic memory** stored on success.
- **Follow-up suggestions** computed (`buildFollowUps`) with rolling topic memory and attached as chips.

---

## 4. Providers, Prompt Passing & Failover

**Files:** `src/providers/modelProvider.js`, `cloudProviderStore.js`, `providerFailover.js`.

### 4.1 Provider classes (shared `stream()` interface)
- **OnDeviceProvider** — GGUF via llama.cpp JNI (`runOnDeviceChat`). `supportsToolUse=false`.
- **OllamaProvider** — browser dev endpoint. `supportsToolUse=true`.
- **OpenAICompatibleProvider** — cloud. `supportsToolUse=true`. Streams SSE from `{baseUrl}/chat/completions`.

### 4.2 How a prompt is sent to a cloud model
`_streamOnce` builds the body:
```
{ model, messages: [...mapped...], stream: true,
  max_tokens?: <intent-based cap>,
  tools?: [...OpenAI tool schemas...], tool_choice: 'auto' }
```
- `mapMessageForApi` preserves `role:'tool'` (with `tool_call_id`) and assistant `tool_calls` across turns.
- SSE chunks are parsed defensively (a malformed chunk is skipped, not fatal).
- Native `tool_calls` are accumulated from streamed deltas and returned.
- Recovery: on Groq/Llama `tool_use_failed`, the intended `<function=…>` call is salvaged; an invented tool name is fed back with the valid list.

### 4.3 Error normalization
`normalizeCloudError` maps HTTP/status/text → codes: `invalid_api_key`, `quota_exceeded`, `rate_limited`, `model_not_found`, `server_error`, `network_error`, `aborted`.

### 4.4 Failover (no mid-task stops)
`createFailoverCloudProvider` wraps the cloud provider (drop-in `stream()`), delegating to `streamWithFailover`:
- Orders candidates: **active first**, then remaining by **model capability (strongest first)** unless the user pinned priorities; cooldown'd providers skipped.
- On a **failover-safe** error (quota/rate/server/network) it switches to the next provider (disabling in-place retries while a next exists). Bad key / missing model / abort surface immediately.
- Exhausted providers get a cooldown (quota ~6h, rate-limit ~60s, …). Emits an `onFailover` UI notice.
- Toggle: Settings → Integrations → "Cloud provider failover".

---

## 5. The Agentic Loop (tool calling & execution)

**File:** `src/agent/agenticLoop.js`.

### 5.1 Setup
- `createToolExecutor(workspaceProvider, {isNative})` maps tool names → real operations.
- Tool schemas: `toOpenAITools()` (native) or `formatToolSchemasForPrompt()` (prompt-based). **Never both** — mixing them caused the historic `not in request.tools` bug.
- **Dynamic tool subsetting** — `selectRelevantTools` sends only the tools a request plausibly needs (chat = none; read = read tools; control tools always kept).
- System prompt + optional **mission plan** + last 8 turns + user message.

### 5.2 Loop (max 12 iterations)
```
while iteration < 12:
   compact old tool results (compactToolResults) + inject scratchpad
   stream model response (native tools or prompt convention)
   parse tool calls:  native tool_calls → parseToolCalls → parseLlamaFunctionSyntax
   if invalid tool name → feed valid-tools list back, continue
   if no tool calls → final response, break
   for each call:
        execute via createToolExecutor
        record into scratchpad + writtenFiles
        if 'respond':  auto-verify written files → if bad, feed back & continue; else return
        if 'ask_user': return awaiting input
        push assistant turn + tool result back into messages
```

### 5.3 Tool executor highlights
- `read_file`: large files return an **outline** (imports + signatures + line numbers) unless `full:true`.
- `read_symbol`: extract one function/class body (balanced-brace matching).
- `create_file`: ensures parent folders, overwrites existing (reported), verifies.
- `run_terminal` / `git_*`: require `isNative`; operate on the last cloned repo path.
- `search_web` / `fetch_page`: via research provider.

---

## 6. Intent Understanding

**File:** `src/agent/intentUnderstanding.js` (+ `fullAutonomyRunner.js`, `phase4Runner.js`, `onlineResearch.js` gates).

- `normalizeText` — mobile typo/shorthand correction.
- `isVague` — detects "fix it", "make it better", "continue".
- `understand()` returns `{ category, action, confidence, normalized, resolvedTarget, needs, vague, workflow, estimatedSteps }`.
- Families: **git, terminal, file_create, code_edit, read_inspect, research, explain, code_generate, text_format, delete, chitchat, ambiguous**.
- `detectWorkflow` — flags chained multi-step requests + estimates steps.
- Reference resolution — a vague message resolves to the last concrete filename/URL/repo from history.
- Keyword gates in `fullAutonomyRunner.js` (`isAutonomousToolRequest`, `isActionableToolRequest`, `isWorkspaceActionRequest`, `isGitRequestWithoutRepo`) drive the App routing tree.

---

## 7. Context & Memory

| System | File | Purpose |
|---|---|---|
| Conversation context | `context/conversationContext.js` | Entities, topics, pronoun/reference resolution |
| Context engine | `context/contextEngine.js` | Code relationship analysis |
| Repository index | `context/repositoryIndex.js`, `agent/projectIndexer.js` | Symbol/import index (on-demand) |
| Episodic memory | `memory/episodicMemory.js` | Per-session experiences; semantic recall |
| Semantic vectors | `memory/semanticVector.js` | Dependency-free cosine similarity (typo-tolerant) |
| Project memory | `memory/agentMemory.js` | Per-workspace approved facts |
| Persistent memory | `agent/persistentMemory.js` | Cross-session memory |
| Context compressor | `memory/contextCompressor.js` | History summarization |
| Scratchpad | `agent/scratchpad.js` | Hidden per-task working memory |
| RAG | `utils/rag.js` | Retrieve relevant workspace files |
| Token budget | `agent/tokenBudget.js` | estimate, compact tool results, subset tools, cap output |

---

## 8. Reasoning Discipline Modules (Cognitive OS)

The agent runs an adaptive cognitive pipeline: an **Adaptive Thinking Budget**
sizes each request and decides which stages wake, so most turns stay cheap and
only hard tasks get the full depth (keeps token overhead small on mobile).

- **Thinking budget** — `agent/thinkingBudget.js`: `assessThinkingBudget` → level (trivial→massive) + which stages run (plan/skeptic/hypotheses/verify/curiosity + maxIterations). Tool-incapable models stay lean regardless.
- **Mission planner** — `agent/missionPlanner.js` (cloud-gated): structured plan before execution.
- **Skeptic** — `agent/skeptic.js`: pre-apply "why would this fail?" pass (reverse-thinking + devil's advocate + future-simulation merged); its `mustFix` items feed the phase4 revision loop. Gated by the thinking budget (write/edit turns).
- **Confidence engine** — `agent/confidenceEngine.js`: evidence-based proceed/clarify/confirm.
- **Self-correction** — `agent/selfCorrection.js`: `diagnoseRootCause` + `verifyChanges`.
- **Mistake memory** — `agent/mistakeMemory.js`: records failure→cause→fix; recalls relevant lessons (semantic) to avoid repeats.
- **Preference memory** — `agent/preferenceMemory.js`: user-confirmed style facts (stack, completeness, explanation style, autonomy, verbosity) injected as a tiny prompt.
- **Cognition glue** — `agent/cognition.js`: cognitive-state labels for the UI + senior-engineer / N=2-hypothesis (single call) / gated intent-expansion prompt directives.
- **Response quality** — `agent/responseQuality.js`: Fast / Balanced / Reviewed.
- **Sub-agent orchestration** — `agent/subagentOrchestrator.js`, `agentRoles.js`: planner→coder→reviewer roles used by `phase4Runner`.
- **Follow-ups** — `agent/followUpSuggestions.js`.

---

## 9. Tools, Workspace & Safety

- **Workspace** — `workspace/workspaceProvider.js` (SAF on Android, `virtualWorkspace.js` in browser), `workspacePolicy.js` + `safePath.js` (path/size guards).
- **Tool registries** — `tools/toolRegistry.js`, `advancedToolRegistry.js`, `workspaceTools.js`, `toolApproval.js` (permission: read/write/dangerous).
- **Native bridge** — `nativeBridge.js`: Capacitor plugins for Workspace, Terminal, Git, Research, GitHub API, Credential vault (GitHub PAT never returned to JS), GGUF runtime, haptics, notifications.
- **Autonomy** — `agent/autonomyPolicy.js`: Off / Suggest / Read-only / Prepare / Full.
- **Automation tiers** — `agent/automation/automationTiers.js`: Assisted / Semi / Full-auto / Workflow.
- **Safety policy** — `safety/SafetyPolicy.js`: Strict / Moderate / Minimal / Unrestricted (skill scanning, patch validation, terminal allow/block lists, path guards).
- **Skills** — `skills/*`: routing, security scanning of imported `SKILL.md`, deterministic patch/file review.

---

## 10. UI Components (key)

| Component | Role |
|---|---|
| `App.jsx` | State + `handleSendMessage` orchestrator |
| `ChatContainer.jsx` | Chat layout, rAF auto-scroll, streaming pin |
| `Message.jsx` | Message render, typewriter, citations, suggestion chips |
| `AgentReasoningPanel.jsx` | Live "thinking" / reasoning steps |
| `AgentActivityLog.jsx` | Step-by-step tool timeline |
| `FileActionResult.jsx` | Clickable file previews |
| `MyCollection.jsx` | Cloud providers (add/failover), local models |
| `Settings.jsx` | Autonomy, automation, safety, failover toggle, integrations |
| `Workspace.jsx` / `CodeEditor.jsx` | File browser + editor |

---

## 11. Providers Quick Reference

17 OpenAI-compatible presets in `cloudProviderStore.js`, each with `keyUrl`, `docs`, `howTo`, `freeTier`, `keyPrefix`, `card`:
Groq, Cerebras, Google Gemini, OpenRouter, Mistral, GitHub Models, Cloudflare Workers AI, DeepSeek, NVIDIA NIM, SambaNova, Cohere, Together, Fireworks, OpenAI, xAI, Nebius, Ollama Cloud, + Custom.

To use one: add it in **My Collection → Cloud** with your own API key (most need no credit card). Add several to benefit from **automatic failover**.

---

## 12. Persistence (localStorage keys)

`forgeai_cloud_providers_v1`, `forgeai_provider_failover_v1`, `forgeai_autonomy_level`, `forgeai_automation_tier`, `forgeai_response_quality`, `forgeai_safety_policy`, `forgeai_skills_v1`, `forgeai_episodic_memory`, `forgeai_agent_memory_v1`, `forgeai_persistent_memory_v2`, `forgeai_last_git_repo`, `forgeai_research_settings`, `forgeai_custom_profiles`, `forgeai_error_log`, and more.

---

*See also: `DESKTOP_ROADMAP.md` (deferred features), `eval/` (measured intent + agentic evals).*
