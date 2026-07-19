# Toddler architecture and file audit

Audit date: 2026-07-19. Baseline: `c68f77e` (brief references `2a2ddc5`).

## Executive finding
The repository does not yet satisfy the v2 architecture. The most serious baseline defects are: training executes in the control-plane process; datasets and artifacts are written inline to Firestore; the web dashboard performs local vision/generative inference; three separate hard-coded model catalogs use incompatible fields; workers poll every 30 seconds; inference shares the control plane and has no rate limit; and Firebase silently accepts dummy configuration.

This pass establishes deployment separation, a dedicated rate-limited inference service, explicit CORS/Firebase configuration, canonical JSON Schema, required indexes, slow fallback polling, dual-service health endpoints, and free-tier operations guidance. It intentionally does not label the remaining migrations as complete.

## File-by-file audit

### Root/configuration
- `.env.example` — no literal production secrets; should add `VITE_INFERENCE_URL`, explicit `CORS_ORIGINS`, and rate-limit variables.
- `.gitignore` — correctly excludes env files, `temporary/`, and keystores.
- `.oxlintrc.json` — present; CI does not enforce it.
- `README.md`, `README_ANDROID.md`, `TODDLER_SPEC.md` — useful but stale against brief v2; old spec still describes 60-second heartbeat and local browser vision.
- `package.json` / lockfile — browser bundle still includes TensorFlow, WebLLM and localforage because mobile and web are not cleanly split. Supply-chain audit was not completed because `npm ci` was OOM-killed in the sandbox.
- `vite.config.js`, `vercel.json`, `capacitor.config.json`, `index.html` — no critical secret found; Vercel routing should set inference URL separately.
- `firestore.indexes.json` — added composite project/job indexes.
- `render.yaml` — added two independent services.
- `schema/model.schema.json` — added canonical catalog contract.

### Backend
- `backend/main.py` — oversized mixed-responsibility module. Fixed wildcard CORS default, added `/health`, and removed in-process agent execution. **Remaining:** old `/predict` and `/batch` routes must become authenticated thin proxies or be removed after clients move; `/train` still accepts inline CSV; completion still stores base64 artifacts; ownership is inconsistent; catalog is hard-coded and uncached; push-token/FCM dispatch and requeue failure accounting are absent; delete does not remove Cloudinary assets.
- `backend/agent.py` — correctly has a transaction-oriented worker concept, but reads inline CSV and writes inline pickle. Must download `dataset_ref`, upload `artifactRef`, and never be imported by control plane.
- `backend/agent_entry.py` — valid separate runner entry point; temporary credential file should be deleted on exit.
- `backend/hardware_audit.py` — isolated hardware detection; retain for desktop runner, validate reported values server-side.
- `backend/run.sh` — fixed so the control-plane container only runs FastAPI.
- `backend/Dockerfile` — control plane container remains heavy because ML dependencies are still installed; split requirements after legacy inference/train code is removed.
- `backend/requirements.txt` — unpinned and mixes control/inference/training packages; pin with a lock/constraints file.
- `backend/inference_service/*` — added isolated service, API-key/IP limits, `/health`, `/predict`, `/batch`, Cloudinary-reference reads, and transitional legacy reads. Add artifact caching, API-key hashing, vision support, structured logging and tests before production.

### Web/mobile source
- `src/firebase.js` — fixed dummy defaults; now fails loudly when configuration is absent.
- `src/env.js` — duplicates validation and only warns; consolidate with typed config.
- `src/cloud.js` — uses unsigned preset and JSON-only upload; replace with `/uploads/sign`, arbitrary Blob upload, resource type/folder policy, and chunked upload.
- `src/Dashboard.jsx` — owner-scoped polling exists but reads every five seconds while active. Critical remaining violation: local vision inference/retraining and simulated generative inference. Route all dashboard inference to `VITE_INFERENCE_URL`; use a narrowly scoped server state feed.
- `src/Onboarding.jsx` — critical remaining violation: web-side vision training, localforage fallback, simulated generative training, inline CSV `/train`, unauthenticated agent nudge, and one-second job polling.
- `src/MobileDashboard.jsx` — hard-coded noncanonical catalog and 5-second project polling. Local training is appropriate only on native mobile, but upload/claim/heartbeat contracts need migration.
- `src/llm.js` — separate incompatible hard-coded catalog; remove after Firestore-backed catalog/offline generated cache lands. Ensure `deleteModelInCache` is used on removal.
- `src/textML.js`, `src/visionML.js` — training code can remain in a native-only bundle but must not be reachable/importable by web builds.
- `src/nativeBridge.js`, `src/notify.js`, `src/MobileWrapper.jsx` — reasonable boundary helpers; no FCM token registration exists.
- `src/App.jsx` — media routing should use explicit platform/desktop override rather than coarse pointer.
- `src/Auth.jsx`, `src/LandingPage.jsx`, `src/components/UI.jsx`, CSS files, `main.jsx` — no architectural blocker found in static review.
- `public/byoc-worker.js` — changed 30-second polling to 150-second degraded fallback and explicit mobile claim. Still expects inline base64 CSV and lacks push-trigger messages.
- `public/widget.js` — endpoint must point to inference service and never control plane; add documented API-key handling and CSP guidance.

### Android
- `android/app/google-services.json` — Firebase client configuration is not a private credential, but environment-specific config should be injected per build.
- `MainActivity.java`, `TrainingPlugin.java`, `TrainingService.java` — native training/service structure exists; static review found no FCM service/token path. Add foreground/background lifecycle-aware heartbeat and FCM data-message handling.
- `AndroidManifest.xml` — review notification/foreground-service declarations when FCM is added.
- Gradle files/wrapper, resources and generated Capacitor plugin files — standard generated/build configuration; no architectural defect found. Pin and verify Gradle wrapper checksum in CI.
- Android tests — placeholder tests only; no training, claim, reconnect or push fallback coverage.

### Desktop
- `desktop/src/App.jsx`, `App.css`, `src-tauri/src/main.rs` — early scaffold only; no canonical catalog, hardware gating, pairing, FCM token, heartbeat, claim, download, training, or artifact upload flow.

### Workflows and generated assets
- `.github/workflows/android.yml` — inspect secrets permissions and pin actions by commit SHA before release.
- `create-keystore.yml`, `encode-keystore.yml`, `android-workflow-paste-me.yml` — legacy keystore workflows should be removed in favor of GitHub encrypted secrets; no tracked keystore was found.
- `generate_summary.py`, `toddler_project_summary.docx` — generated documentation tooling/output; not runtime code and may drift.
- Binary icons/splash images/JAR — inventoried; not source-audited byte-for-byte.

## Validation
- Python syntax compilation passed for control and inference services.
- Frontend dependency installation/build could not run: `npm ci` was killed by the sandbox memory limit. This is an unverified gate, not a passing build.

## Required next sequence
1. Revoke the exposed GitHub PAT immediately and rotate any co-exposed secrets.
2. Finish signed Cloudinary dataset/artifact references and deletion cleanup.
3. Remove legacy control-plane inference routes and all web-local ML/simulations.
4. Migrate Firestore catalog documents and generate client fallback data from the schema.
5. Add device registry, FCM token lifecycle, dispatch, 45-second failure accounting, requeue, and lifecycle-aware 5-minute heartbeat.
6. Add emulator/unit/integration tests and CI gates before deployment.
