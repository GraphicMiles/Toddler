# Phase 2–3 Acceptance

## Phase 2 implementation contract

### Runtime states

```text
IDLE → LOADING → READY → GENERATING → CANCELLING → READY
              ↘ ERROR
READY → UNLOADING → IDLE
```

Only one model and one generation may be active. A generation has a cryptographically random request ID. Cancellation is stored in Java before native start and is also forwarded to a request-matching native cancellation flag. llama.cpp receives a CPU abort callback for cancellation during prefill/decode.

### Streaming events

```text
generationStarted  { requestId, modelId, contextTokens, maxOutputTokens }
generationToken    { requestId, modelId, token }
generationComplete { requestId, modelId, tokenCount, promptTokens, prefillMs,
                     generationMs, tokensPerSecond, prefillTokensPerSecond,
                     contextTokens, threads, cancelled }
generationError    { requestId, modelId, code, message, ...metrics }
```

A request emits exactly one `generationComplete` or `generationError` terminal event.

### Stable generation codes

```text
EMPTY_PROMPT
INVALID_REQUEST
RUNTIME_BUSY
MODEL_NOT_LOADED
MODEL_MISMATCH
PROMPT_TOO_LONG
TOKENIZE_FAILED
CONTEXT_CREATE_FAILED
PREFILL_FAILED
DECODE_FAILED
STREAM_CALLBACK_FAILED
MODEL_LOAD_FAILED
```

### Release catalog

`src/models/catalog.js` is the only official model catalog used by Model Zoo and device compatibility logic. Release validation rejects floating URLs, missing source/license/revision/profile/size, and missing SHA-256 values.

## Phase 3 implementation contract

- UI, RAG, search/index, and agent tools use one scoped `WorkspaceProvider`.
- Tools receive relative paths only.
- Root read/write/rename/delete and traversal are rejected.
- Sensitive/internal/generated paths are filtered and blocked.
- Binary and oversized text reads are rejected.
- RAG discloses candidate files and destination before prompt inclusion.
- Writes use verified temporary content, app-private backup, rollback, and undo.
- Rename creates an undo record.
- Delete is recoverable through hidden SAF trash and undo; expired trash is physically removed.
- Model-source deletion explicitly uses permanent deletion so model files do not consume hidden trash storage.
- Browser virtual workspace implements equivalent write/rename/delete recovery.

## Automated acceptance

```bash
npm ci
npm run lint
npm test
npm run catalog:validate-release
npm run build
npm audit --omit=dev
```

GitHub Actions additionally performs the Android SDK/NDK/CMake preflight, Capacitor sync, and native APK build.

## Required physical-device sign-off

These checks cannot be proven by CI:

1. Install the APK on real ARM64 Android hardware.
2. Download each intended release model and verify mismatch rejection with a deliberately wrong test digest.
3. Enable airplane mode and observe incremental tokens.
4. Cancel before native start, during prefill, and during generation.
5. Confirm one terminal event and no tokens appear in another request.
6. Switch models and confirm an already loaded model is reused.
7. Record load, prefill, generation, ABI, context, and thread benchmark values.
8. Save, rename, delete, restart the app, and undo each workspace operation.
9. Repeat SAF tests with at least Google Files and a manufacturer document provider.
10. Attempt root paths, traversal, encoded traversal, sensitive files, large files, and binary files.

Phase 2 and Phase 3 are implementation-complete only when the current `main` APK builds. They are release-accepted only after this physical-device checklist is recorded.
