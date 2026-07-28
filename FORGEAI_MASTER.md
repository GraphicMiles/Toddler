# ForgeAI Master Documentation

**Project:** ForgeAI (Toddler)  
**Last Updated:** 2026-07-28  
**Version:** 1.0 — Enterprise + Advanced Mobile Features

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Enterprise Briefs (7/7 Complete)](#enterprise-briefs-77-complete)
3. [Advanced Mobile Features (Top 5)](#advanced-mobile-features-top-5)
4. [Architecture & Android Feasibility](#architecture--android-feasibility)
5. [Implementation Status](#implementation-status)
6. [How to Use Key Features](#how-to-use-key-features)
7. [Limitations & Future Work](#limitations--future-work)

---

## Project Overview

ForgeAI is a **local-first coding assistant** for Android with a browser/Ollama development preview. It runs GGUF models directly through JNI and a pinned llama.cpp revision.

This master document consolidates all implemented enterprise and advanced agent capabilities.

---

## Enterprise Briefs (7/7 Complete)

### Brief #1: Configurable Safety Policy System

**Status:** ✅ Complete

**Features:**
- Four tiers: `strict` (default), `moderate`, `minimal`, `unrestricted`
- Loads from `config/safety_policy.json`
- **Developer Mode** toggle in Settings with warning dialog
- Controls: Skill scanning, Patch validation, Terminal restrictions, Workspace safety

**Files:**
- `src/safety/SafetyPolicy.js`
- `config/safety_policy.json`

---

### Brief #2: Custom Prompt Profile System + Raw Mode

**Status:** ✅ Complete

**Features:**
- Create custom profiles for any model
- Configurable: System prompt (including empty), User template, Stop tokens, Context, Temperature, Top-P
- **Raw Mode** toggle (completely disables system prompt injection)
- Saved to localStorage

**Files:**
- `src/models/customPromptProfiles.js`
- `src/components/CustomProfileModal.jsx`

---

### Brief #3: Full Autonomous Execution Mode

**Status:** ✅ Complete

**Features:**
- 4 Automation Tiers: `assisted`, `semi-autonomous`, `full-auto`, `workflow`
- Per-action whitelist (git, terminal, file edits)
- Workflow logging + revert checkpoints
- Prominent Full-Auto indicator in Chat

**Files:**
- `src/agent/automation/automationTiers.js`
- `src/components/AutomationSettings.jsx`

---

### Brief #4: Pluggable Skill Validation

**Status:** ✅ Complete

**Features:**
- `SkillValidator` interface with 3 implementations
- `StrictSecurityScanner`, `BasicSyntaxChecker`, `PassthroughValidator`
- Trusted Sources + `// @forgeai-trusted` pragma

**Files:**
- `src/skills/validators/`
- `src/components/SkillValidatorSettings.jsx`

---

### Brief #5: Unfiltered Research Pipeline

**Status:** ✅ Complete

**Features:**
- 3 Depth levels: `standard`, `comprehensive`, `raw`
- Archive Mode, Source Verification toggle, Proxy support

**Files:**
- `src/research/ResearchProvider.js`
- `src/components/ResearchSettings.jsx`

---

### Brief #6: Automated GitHub Integration

**Status:** ✅ Complete

**Features:**
- 4 tiers: `manual`, `suggested`, `auto-commit`, `auto-deploy`
- Maintenance Bot + Dry-run mode

**Files:**
- `src/github/GitHubAutomation.js`
- `src/components/GitHubAutomationSettings.jsx`

---

### Brief #7: Social Media Automation

**Status:** ✅ Complete

**Features:**
- Platforms: Twitter/X, LinkedIn, Reddit
- Research Mode (public scraping)
- Encrypted credential storage (placeholder)

**Files:**
- `src/social/SocialMediaManager.js`
- `src/components/SocialMediaSettings.jsx`

---

## Advanced Mobile Features (Top 5)

### 1. Episodic Memory with Vector Search

**Status:** ✅ Complete & Integrated

**Capabilities:**
- Long-term storage of tasks, outcomes, and lessons
- Semantic recall of past experiences
- Automatic storage after successful tasks

**Files:**
- `src/memory/episodicMemory.js`

---

### 2. Context Compression & Management

**Status:** ✅ Complete & Integrated

**Capabilities:**
- Automatic summarization of old messages
- Key point extraction
- Maintains coherence on 3B–7B models

**Files:**
- `src/memory/contextCompressor.js`

---

### 3. File System Intelligence

**Status:** ✅ Complete

**Capabilities:**
- Project structure analysis
- Semantic file search
- Git-aware operations

**Files:**
- `src/fs/fileSystemIntelligence.js`

---

### 4. Multi-Step Planning (Simplified)

**Status:** ✅ Complete

**Capabilities:**
- Linear planning with limited backtracking
- Max 5–7 steps (Android optimized)

**Files:**
- `src/planning/multiStepPlanner.js`

---

### 5. Self-Healing & Error Recovery

**Status:** ✅ Complete

**Capabilities:**
- Automatic error diagnosis
- Smart retry logic
- Battery-aware execution

**Files:**
- `src/memory/selfHealing.js`

---

## Architecture & Android Feasibility

### Android-Optimized Design

| Constraint          | Solution                              |
|---------------------|---------------------------------------|
| 4–8GB RAM           | 3B–7B quantized models                |
| No Docker           | No sandbox execution                  |
| Background limits   | Battery-aware + charging-only tasks   |
| Thermal throttling  | Simplified planning + compression     |

### Hybrid Architecture Support

The system is designed to support future hybrid mode (Android app + self-hosted server for heavy tasks).

---

## Implementation Status

### Fully Wired into Agent Core

- Research tools (`research:query`, `research:scrape`)
- GitHub tools (`github:propose`, `github:run_maintenance`)
- File System tools (`fs:analyze`)
- Social research tools
- Episodic Memory (recall + auto-store)
- Context Compression (runs on every message)

### Files Modified/Added

- `src/App.jsx` — Context compression + memory integration
- `src/agent/core.js` — Advanced tool registry + memory
- `src/tools/advancedToolRegistry.js` — New tool registration
- Multiple memory, planning, and fs modules

---

## How to Use Key Features

| Feature                    | Location in UI                  | How to Activate                     |
|---------------------------|----------------------------------|-------------------------------------|
| Safety Policy             | Settings → Safety Policy        | Choose tier or enable Developer Mode |
| Research Pipeline         | Settings → Research Pipeline    | Select depth + Archive Mode         |
| Automation Tiers          | Settings → Autonomous Automation Tiers | Choose tier + whitelist     |
| Custom Prompt Profiles    | My Collection → Model → Profile | Create per model                    |
| Social Media              | Settings → Social Media Automation | Add accounts + test            |
| GitHub Automation         | Settings → GitHub Automation    | Select tier + enable Maintenance Bot |

---

## Limitations & Future Work

### Current Limitations (Android)

- No Docker sandbox
- Limited to 3B–7B models
- No deep Tree-of-Thoughts
- Background execution restricted

### Recommended Next Steps

1. Create native Capacitor plugins for real web/social APIs
2. Add WorkManager for background tasks
3. Implement vector database (SQLite-VSS)
4. Add more agent tool integrations

---

**This is the single source of truth for ForgeAI features.**

All other `.md` files are now considered historical or supplementary.