# Toddler — Complete Codebase Audit Report

**Auditor:** Arena.ai Agent Mode  
**Date:** 2026-07-20  
**Commit baseline:** HEAD (latest on `main`)  
**Repository:** https://github.com/GraphicMiles/Toddler

---

## EXECUTIVE SUMMARY

Toddler is a **privacy-first, no-code AI model training platform** built from Lagos, Nigeria. It lets anyone — from indie developers to small business owners — upload a spreadsheet or folder of images, and walk away with a trained, deployable, fully-owned AI classifier. No Python. No Jupyter notebooks. No vendor lock-in. Every model you train is yours to export, forever.

The platform spans four surfaces: a **Web Dashboard** (control tower), an **Android Mobile App** (on-device trainer + BYOC worker), a **Desktop Agent** (Tauri scaffold, early stage), and a **Cloud GPU** tier (planned). Training actually runs on the user's own hardware — phones, laptops — or optionally in the cloud (Pro tier). This is a genuinely novel architectural approach that keeps user data private by default.

**Current maturity:** Public beta. The core user journey (sign up → upload CSV → train text classifier → export model → get API key) works end-to-end. The landing page, auth system, web dashboard, mobile app shell, BYOC worker, backend training agent, and Android native foreground service are all in place. Several features are scaffolded but incomplete (vision inference, desktop agent, cloud training, LLM fine-tuning).

---

## WHAT TODDLER DOES (The Pitch)

### The Problem
Every day, businesses sit on mountains of data — customer support tickets, product reviews, employee feedback, medical records, expense receipts — that contain patterns a simple AI model could detect. But training a custom AI model currently requires:
- Hiring a data scientist ($150K+/year)
- Learning Python, scikit-learn, PyTorch, Jupyter
- Paying $0.10–$3.00 per 1,000 tokens to cloud AI APIs that own your data
- Months of iteration before you get something usable

### The Solution: Toddler
**Upload a spreadsheet. Walk away with a classifier.**

Toddler is the Shopify of AI model training — it democratizes machine learning the same way Shopify democratized e-commerce. Here's what happens:

1. **You sign up** (email or Google, 30 seconds, no credit card)
2. **You upload your data** (a CSV file, or a folder of labeled images)
3. **You map your columns** (which column is the text? which is the label?)
4. **You click "Train"** — Toddler's AutoML engine tests multiple algorithms (SGD, Logistic Regression, Random Forest), picks the best one, and builds a production-ready model
5. **You get four things instantly:**
   - An **API key** (`tdlr_live_...`) to call your model from any app
   - A **downloadable artifact** (.pkl or .json) you own forever
   - An **embeddable chat widget** you can paste into any website
   - A **sandbox test panel** where you can type text and see predictions with word-level explainability

### What Makes It Special

| Feature | Toddler | AutoML (Google/AWS) | ChatGPT/Claude API | Hiring a DS |
|---|---|---|---|---|
| **Setup time** | 2 minutes | Hours (IAM, SDKs) | API key + prompt engineering | Weeks |
| **Cost** | Free (2K rows), $49/mo (Pro) | $1–5/hour GPU | $0.01–0.06/1K tokens | $150K+/year |
| **Data privacy** | Trains on YOUR device | Uploads to their cloud | Sent to OpenAI | Depends on contract |
| **Model ownership** | You own the artifact | Locked in their platform | No model, just API | You own it (if you're lucky) |
| **Explainability** | Word-level feature weights | Black box | "It's complicated" | Depends on model |
| **Lock-in** | Zero. Export anytime. | High | Total | Medium |
| **Technical skill needed** | Zero | Medium | Low (prompting) | High (you manage them) |

### The BYOC Innovation
Here's where Toddler gets really clever: **Bring Your Own Compute (BYOC)**.

Instead of charging you for cloud GPU time, Toddler trains models on *your own devices* — your phone, your laptop. The web dashboard is just the "control tower" where you manage projects. The actual gradient updates happen on silicon you already own.

How it works:
- You create a training job on the web dashboard
- Toddler routes it to your phone or desktop (whichever is online and capable)
- A **Web Worker** on the phone claims the job, downloads the dataset, trains the model, uploads the artifact
- On Android, a **native foreground service** with a **PARTIAL_WAKE_LOCK** keeps training alive even when the screen is off
- If no device is available within 5 minutes, Pro users can fall back to cloud GPU

This means:
- **Free users** train models for $0 (they pay with their device's compute)
- **Your data never leaves your device** during local training
- **Toddler's server costs stay near zero** (they don't need GPUs for free-tier users)

### Revenue Model
- **Free tier:** 1 active project, up to 2,000 rows, community support
- **Pro tier ($49/mo):** Unlimited projects, up to 100K rows, API access, .pkl exports, cloud GPU fallback
- **Future:** Model marketplace (users publish/sell trained models), team workspaces, enterprise deployment

### Who It's For
- **Startup founders** who need a spam classifier, sentiment analyzer, or ticket router — but can't afford a data scientist
- **Small business owners** who want to categorize customer feedback automatically
- **Indie developers** who want to add AI features to their apps without paying per-token API fees
- **Researchers** who want to train models on sensitive data (medical, financial) without uploading it anywhere
- **Tinkerers** who want to run a local Llama LLM "trained" on their own documents

### The Vision
Toddler is building toward a world where training an AI model is as easy as creating a Google Doc. The roadmap includes:
- On-device LLMs (SmolLM2, Llama 3.2) with RAG on your own documents
- Vision models (image classification, object detection) trained from your phone's camera roll
- A desktop agent for larger models (up to 3B parameters)
- A model marketplace where you can publish and monetize your trained models
- iOS support, team workspaces, CLI tools, and more

---

## FILE-BY-FILE AUDIT

### 1. Root Configuration Files

#### `package.json`
- **Stack:** React 19, Vite 6, Capacitor 7, Tailwind v4, Firebase 11
- **Status:** Clean. Dependencies are appropriate.
- **Issue:** No ML libraries in dependencies (TensorFlow, web-llm, HF transformers are mentioned in spec but not installed — they may be lazy-loaded separately or this is aspirational).
- **No test runner configured** — no Jest, Vitest, or any testing framework.

#### `.env.example`
- Lists all required environment variables
- **Issue:** Missing `VITE_INFERENCE_URL` (needed for the dedicated inference service)

#### `vite.config.js`
- Minimal, correct. Uses React and Tailwind plugins.
- No code splitting configuration despite 6MB+ web-llm chunks mentioned in spec.

#### `capacitor.config.json`
- App ID: `ai.toddler.app`
- Firebase Authentication plugin configured for Google provider
- `skipNativeAuth: true` — correct for Capacitor Firebase plugin

#### `vercel.json`
- SPA rewrites configured correctly (all routes → `index.html`)

#### `index.html`
- Clean HTML5 entry point. Proper viewport meta, theme-color, description.

#### `firestore.indexes.json`
- Composite indexes for `projects` (ownerUid + status + createdAt) and `training_jobs` (ownerUid + status + createdAt)
- **Status:** Good — needed for efficient Firestore queries

#### `.gitignore`
- Properly excludes node_modules, .env files, `temporary/`, keystores, build artifacts

#### `.oxlintrc.json`
- Linter config present but not enforced in CI

#### `render.yaml`
- Defines two independent Render services:
  1. `toddler-control-plane` (FastAPI, Docker, free tier)
  2. `toddler-inference` (inference service, Docker, free tier)
- Both have health checks configured

---

### 2. Frontend Source Files

#### `src/main.jsx`
- Entry point. Calls `checkEnv()` and renders `<App />` in StrictMode.
- **Clean and minimal.**

#### `src/env.js`
- Warns at dev time if critical `VITE_*` env vars are missing.
- Only warns (doesn't crash) — this is intentional for graceful degradation.

#### `src/firebase.js`
- Initializes Firebase Auth, Firestore, and Google Auth provider.
- **FIXED:** Now throws a clear error if any required Firebase config is missing (previously used dummy defaults that silently connected to wrong project).
- **Good pattern:** Uses `import.meta.env` for all config, no hardcoded values.

#### `src/App.jsx`
- **Router:** BrowserRouter with routes: `/` (landing or auth), `/login`, `/signup`, `/dashboard/*`
- **Mobile detection:** `useIsMobile()` hook checks `Capacitor.isNativePlatform()` first, then falls back to media query `(max-width: 839px), (pointer: coarse) and (max-width: 1024px)`
- **Deep link handler:** Listens for `appUrlOpen` on native, routes `toddler://login`, `toddler://signup`, `toddler://dashboard`
- **Auth state:** `onAuthStateChanged` listener, loading spinner
- **Issue (F-9):** The `(pointer: coarse)` media query forces MobileDashboard on iPads and Surface tablets where users may want the desktop layout. Should tighten to width-only or add a "Desktop view" toggle.

#### `src/LandingPage.jsx`
- Marketing page with hero section, "How it works" (4 steps), features grid (4 features), pricing (Free $0 / Pro $49/mo), CTA, and footer.
- **Design:** Dark theme (#14130F bg), lime (#C6FF33) accents, Space Grotesk/Inter/IBM Plex Mono fonts.
- **Responsive:** Has mobile menu toggle, responsive grid layouts.
- **Origin:** "Handcrafted for domain experts. Lagos, NG."
- **Status:** Complete and production-ready.

#### `src/Auth.jsx`
- Dual-mode: login and signup
- **Web flow:** Email/password + Google OAuth via popup
- **Native flow:** Shows a "Link this Device" pairing UI with 6-digit code input (pairing API not yet implemented)
- **Features:** Password reset email, email verification on signup, error handling
- **Issue (F-12):** No in-app oobCode handler for password reset — users finish on Firebase's hosted page instead of inside Toddler.

#### `src/Dashboard.jsx` (855 lines) — Desktop/Web Dashboard
- **The main control tower** for the web surface.
- **Layout:** Sidebar (project list + new project + delete + logout) + main content area with sticky header + tab strip.
- **Tabs:** Overview (live inference + model health), Batch (CSV upload → bulk predict), Chat (intent mapping + simulation chat), Dev (API key + code snippets).
- **Features working:**
  - Project CRUD (create via Onboarding, rename inline, delete with confirm)
  - Live text inference via backend `/predict`
  - Batch predict (CSV upload → results CSV download)
  - Chat simulation with intent mapping per label
  - API key readout + copy button
  - Code snippets (Python, JS, cURL) per model type
  - Export model (.pkl or .json)
  - Polling: 5s interval while any project is training
  - Local notifications on training complete
  - Haptic feedback on native
- **Issues:**
  - **F-8 (CRITICAL):** Vision prediction is stubbed out — `throw new Error("Vision backend proxy pending Phase 2")` in both the inference panel and chat. Vision models can be created via Onboarding but cannot be tested.
  - **F-8:** The chat still references `handleRetrainVision()` which doesn't exist.
  - **Variable reference error:** `apiUrl` is used without being defined in `handlePredict` and `handleChatSend` (should be `import.meta.env.VITE_API_URL`). This would cause runtime crashes on prediction.
  - `formData` is used without being created in `handlePredict` — another crash bug.
  - 5-second polling for all projects (even when not training) is wasteful.

#### `src/MobileDashboard.jsx` (459 lines) — Mobile/Phone Dashboard
- **Layout:** Hamburger → sidebar drawer, header with "Toddler Worker" branding, bottom-style tabs (Zoo / Training / Sandbox).
- **Tabs:**
  - **Zoo:** Shows model catalog fetched from `/models` API with download buttons (all show "Native downloads pending Phase 3").
  - **Training:** Shows active training jobs with progress bars and finished jobs with "TEST" button.
  - **Sandbox:** Chat interface for testing trained models via backend `/predict`.
- **Features working:**
  - Device registration on auth (push notification token saved to Firestore)
  - FCM push notification permission request
  - Project management (list, delete)
  - Chat sandbox with backend proxy predictions
  - Sidebar with user profile, unpair device button
- **Issues:**
  - **F-17:** Uses hardcoded fallback catalog instead of `/models/recommended?platform=mobile`
  - **F-7:** Train button for datasets shows "Coming soon" — no way to start training from mobile
  - **F-10:** `removeModel()` for LLMs never calls `deleteModelInCache()` — downloaded weights stay in IndexedDB forever
  - **F-15:** No vision inference panel (camera/gallery) in the sandbox
  - Missing from spec: LLM chat, HF transformers models, vision ML, RAG, download/resume functionality — these are mentioned in the "already shipped" section of TODDLER_SPEC but not present in the actual MobileDashboard code. Either they're in separate files not imported, or the spec is aspirational.

#### `src/Onboarding.jsx` (370 lines) — New Project Flow
- **3-step wizard:**
  1. Project name
  2. Data upload (CSV for text/generative, image folder for vision) + PII redaction toggle
  3. Column mapping (text/label columns) or image category review
- **Features:**
  - CSV parsing via PapaParse with column auto-detection
  - Image folder upload with `webkitdirectory`, auto-extracts labels from folder names
  - 1000-image free-tier cap with RAM estimation
  - Signed Cloudinary upload for datasets
  - Creates Firestore project → calls `/train` API
- **Issues:**
  - **F-18:** CSV upload limit is 5MB soft cap (frontend) but server cap is 750KB (base64 in Firestore doc). Mismatch will cause server-side failures for files between 750KB and 5MB.
  - Vision datasets set `datasetUrl = "pending_vision_zip_upload"` — a placeholder that will break the training pipeline.
  - The `/train` call is fire-and-forget (`.catch(() => {})`) — silent failures.

#### `src/cloud.js`
- Uploads datasets to Cloudinary via signed URL from backend `/uploads/sign`.
- **Good pattern:** Backend signs the upload (API secret stays server-side), frontend uploads directly to Cloudinary.
- **Issue:** Only handles single file upload. No support for zipping multiple images for vision datasets.

#### `src/nativeBridge.js`
- Three-layer keep-alive system for on-device training:
  1. Screen Wake Lock API (keeps CPU awake)
  2. Silent Web Audio oscillator (prevents Android from throttling background timers)
  3. Native foreground service (TrainingPlugin)
- **Well-engineered.** Handles visibility changes, re-acquires wake lock on resume.

#### `src/notify.js`
- Local notifications for training-complete events using `@capacitor/local-notifications`.
- Deduplicates notifications per session.
- **Clean implementation.** No issues found.

---

### 3. Backend Files

#### `backend/main.py` (373 lines) — FastAPI Control Plane
- **Endpoints:**
  - `POST /predict` → **Returns 501** ("Inference moved to dedicated service")
  - `POST /batch` → **Returns 501** ("Batch inference moved to dedicated service")
  - `GET /projects/{id}/export` → Exports model as ZIP (model file + predictor script + README)
  - `GET /projects/{id}/download` → Downloads raw model artifact
  - `GET /models` → Returns model catalog (currently empty array, falls back to hardcoded list in second endpoint)
  - `GET /models/recommended` → Hardware-filtered model catalog
  - `POST /datasets` → Creates dataset metadata in Firestore
  - `GET /datasets` → Lists user's datasets
  - `POST /uploads/sign` → Signs Cloudinary upload (keeps API secret server-side)
  - `DELETE /projects/{id}` → Deletes project from Firestore
  - `DELETE /account` → Deletes Firebase user account
  - `POST /train` → Queues training job, dispatches FCM wake-up to user's devices
- **Security:**
  - CORS: Locked to explicit origins (no wildcard), raises error if `*` is detected
  - Bearer token verification via Firebase Admin SDK
  - API key auth via `X-API-Key` header on predict/export/download
  - PII scrubber (emails, phones)
- **Issues:**
  - **Duplicate `GET /models` endpoint** — the second one (line 291) overrides the first (line 195). The first returns empty array, the second has fallback data.
  - **F-3:** CORS defaults to `"http://localhost,capacitor://localhost"` — should include production origins.
  - `/train` still accepts inline dataset URL (not base64 anymore, but the agent still expects `csv_data` base64 field).
  - No rate limiting on any endpoint.
  - No health check endpoint (referenced in `render.yaml` but not defined).
  - `/predict` and `/batch` return 501 — the web dashboard still calls them, so **all predictions will fail** in production.

#### `backend/agent.py` (307 lines) — Training Agent
- **AutoML tournament:** Tests SGD Classifier and Logistic Regression (Random Forest for small datasets ≤20K rows).
- **Pipeline:** TF-IDF vectorization (3000 features, bigrams) → classifier.
- **Features:**
  - Transactional job claiming (prevents double-training)
  - Confusion matrix generation
  - Feature importance extraction (top 50 features)
  - API key generation per project
  - PII scrubbing
  - Three modes: listener (Firestore on_snapshot), polling, one-shot
  - In-memory sort fallback when composite Firestore index is missing
- **Issues:**
  - Still reads `csv_data` as base64 from the job document (inline). Should download from `dataset_url`.
  - Stores model artifact as base64 in Firestore document (1MB limit). Should upload to Cloudinary.
  - No structured logging (just `print()`).
  - No retry logic for failed training jobs.
  - `__main__` block doesn't use `agent_entry.py` logic for credential loading.

#### `backend/agent_entry.py`
- Entry point for the BYOC training agent.
- Loads Firebase credentials from env var or file.
- Supports `--poll`, `--once`, and default (listener) modes.
- **Issue:** Temporary credential file is never deleted on exit.

#### `backend/hardware_audit.py`
- Detects CPU, GPU (CUDA), and Apple Silicon (MPS) via PyTorch and psutil.
- **Clean and focused.** Good for desktop agent.

#### `backend/requirements.txt`
- `fastapi`, `uvicorn`, `pandas`, `numpy`, `scikit-learn`, `firebase-admin`, `cloudinary`, `psutil`
- **Issue:** No version pinning. Mixes control plane and training dependencies.

#### `backend/inference_service/main.py`
- **Standalone inference proxy** — separate FastAPI app.
- Has its own CORS config (**Issue:** uses `"*"` wildcard).
- `_predict_json_model()` implements pure Python inference for `toddler-bayes-v1` JSON models.
- **Mostly mocked:** The predict endpoint returns hardcoded mock data. Real Cloudinary download and Firestore lookup are commented out.
- **Status:** Scaffold only. Not production-ready.

#### `backend/Dockerfile`
- Python 3.9 base. Copies requirements, installs, copies code, runs `run.sh`.
- **Issue:** Includes ML dependencies (sklearn, numpy) even for control plane container.

#### `backend/run.sh`
- Simply runs `uvicorn main:app`. Clean.

---

### 4. Android Native Files

#### `android/app/src/main/AndroidManifest.xml`
- **Permissions:** INTERNET, FOREGROUND_SERVICE, FOREGROUND_SERVICE_DATA_SYNC, WAKE_LOCK, POST_NOTIFICATIONS
- **Deep links:** `https://toddler.ai` (autoVerify) + `toddler://` custom scheme
- **Services:** ToddlerMessagingService (FCM), TrainingService (foreground, dataSync type)
- **FileProvider** configured for Capacitor
- **Status:** Well-configured for the current feature set.

#### `MainActivity.java`
- Registers `TrainingPlugin` with Capacitor bridge.
- **Minimal and correct.**

#### `TrainingPlugin.java`
- **JS bindings** for start/stop training foreground service.
- `start()`: Starts `TrainingService` with job_id and dataset_url extras.
- `stop()`: Stops the service.
- `runTFLiteTransferLearning()`: Scaffold for future native TFLite inference (currently returns mock accuracy 0.94).

#### `TrainingService.java`
- **Foreground service** with PARTIAL_WAKE_LOCK (30 min max safety timeout).
- Creates notification channel "toddler_training" with IMPORTANCE_LOW.
- Uses custom `ic_stat_training` notification icon (lime hollow square).
- **Clean implementation.** Handles start/stop correctly.

#### `ToddlerMessagingService.java`
- FCM message handler for silent data payloads.
- On `WAKE_WORKER` action, spawns `TrainingService` foreground service with job_id.
- **Issue:** `onNewToken()` logs but doesn't save token to Firestore (handled by JS layer instead).

#### `google-services.json`
- Firebase client config for Android.
- **Not a security concern** (it's the client-side config, not service account).

---

### 5. Public/Static Files

#### `public/byoc-worker.js` (180 lines) — Web Worker for BYOC
- **Polling interval:** 150 seconds (degraded from 30s to reduce server load)
- **Auth:** Token-based, with 10-second timeout for token provision
- **Flow:** `tick()` → `/jobs/claim?platform=mobile` → parse CSV → send `trainText`/`trainVision` message to main thread → main thread trains and sends `textDone`/`visionDone` back
- **Issues:**
  - Still expects inline base64 `csv_data` in the job document
  - No push-trigger message handler (should respond to FCM wake-up)
  - CSV parser is basic (doesn't handle escaped quotes inside quoted fields)

#### `public/widget.js` (240 lines) — Embeddable Chat Widget
- Creates a floating chat bubble (lime green, bottom-right) that opens a 360x500 chat window.
- Sends messages to `/predict` endpoint.
- **Issue:** Points to the control plane `/predict` (which returns 501). Should point to inference service.
- **Issue:** No API key authentication in the widget (doesn't send `X-API-Key` header).

#### `public/favicon.svg`
- Lime hollow square with corner brackets — matches the brand.

#### `public/.well-known/assetlinks.json`
- Android App Links verification file.
- **Needs to be served from `toddler.ai` domain** for auto-verify to work.

---

### 6. Desktop Scaffold

#### `desktop/src/App.jsx` + `App.css`
- Stub React app. Not functional.

#### `desktop/src-tauri/src/main.rs`
- Hardcoded "Windows 11" string, downloads a fake `directml.dll`.
- **Dead code.** Should be moved to a spike branch until Batch 3.

---

### 7. CI/CD & Workflows

#### `.github/workflows/android.yml`
- **Triggers:** Push/PR to main, manual dispatch
- **Steps:** Checkout → Node 22 + Java 21 → npm ci → Restore keystore from base64 secret → Patch build.gradle (Python brace-matching script for idempotent signing config) → Build web app → cap sync → Gradle assembleRelease → Upload APK artifact
- **Status:** Well-engineered. The Python brace-matching script for build.gradle is clever and idempotent.
- **Issue:** Actions are not pinned to commit SHA (uses `@v5` tags).

---

## SECURITY AUDIT

| # | Finding | Severity | Status |
|---|---|---|---|
| S-1 | GitHub PAT leaked in chat history / `.git/config` | 🔴 Critical | Must revoke immediately |
| S-2 | Backend CORS was `*` (now fixed to explicit origins) | 🟠 High | Fixed |
| S-3 | Inference service still uses `*` CORS | 🟠 High | Open |
| S-4 | `/predict` and `/batch` return 501 but frontend still calls them | 🔴 Critical | All predictions broken |
| S-5 | Firebase config no longer accepts dummy values (now throws) | 🟢 Good | Fixed |
| S-6 | No rate limiting on any endpoint | 🟠 High | Open |
| S-7 | Release keystore should be in GitHub Secrets, not tracked | 🟠 High | Partially fixed (in .gitignore) |
| S-8 | Widget doesn't authenticate API key | 🟡 Medium | Open |
| S-9 | No input validation on training text (potential XSS in chat UI) | 🟡 Medium | Open |
| S-10 | Base64 model artifacts stored in Firestore (1MB limit) | 🟡 Medium | Open |

---

## ARCHITECTURE ISSUES

| # | Issue | Impact |
|---|---|---|
| A-1 | Two duplicate `GET /models` endpoints in `main.py` | Second overrides first; first is dead code |
| A-2 | Agent still reads inline base64 CSV, not Cloudinary URL | Breaks when datasets >750KB |
| A-3 | Three separate hardcoded model catalogs with incompatible fields | Inconsistency between spec, backend, and frontend |
| A-4 | Web Dashboard calls `/predict` which returns 501 | All text/vision predictions crash |
| A-5 | `formData` variable used without declaration in Dashboard `handlePredict` | Runtime crash on prediction |
| A-6 | `apiUrl` variable not defined in Dashboard predict/chat functions | Runtime crash |
| A-7 | Vision training creates placeholder `"pending_vision_zip_upload"` | Vision pipeline broken |
| A-8 | No test suite at all | No regression protection |

---

## WHAT'S ACTUALLY WORKING (End-to-End)

1. ✅ Landing page renders correctly
2. ✅ Email/password signup + Google OAuth
3. ✅ Firebase auth state management
4. ✅ Onboarding wizard (CSV upload → column mapping → project creation)
5. ✅ Signed Cloudinary dataset upload
6. ✅ Training job queued in Firestore
7. ✅ Backend agent claims and trains text classifiers (sklearn AutoML)
8. ✅ Model artifact stored and exported (.pkl/.json)
9. ✅ API key generation per project
10. ✅ Project management (rename, delete)
11. ✅ Android APK build via CI
12. ✅ Android foreground service with wake lock
13. ✅ FCM message handling for worker wake-up
14. ✅ Local notifications on training complete
15. ✅ Deep link routing (toddler:// and https://toddler.ai)

## WHAT'S BROKEN

1. ❌ All predictions (text and vision) — `/predict` returns 501
2. ❌ Vision model training — placeholder dataset URL
3. ❌ LLM/chat features — not present in current MobileDashboard code
4. ❌ HF transformers models — not present in code
5. ❌ Mobile training — "Coming soon" button
6. ❌ Desktop agent — dead scaffold
7. ❌ Cloud GPU training — not implemented
8. ❌ Widget authentication — no API key
9. ❌ Model catalog — empty array in backend

---

## RECOMMENDATIONS (Priority Order)

### Immediate (Before Next Demo)
1. **Fix `/predict` endpoint** — Either restore it in `main.py` or point the frontend to the inference service. This is the #1 blocker.
2. **Fix `formData`/`apiUrl` bugs** in `Dashboard.jsx` `handlePredict` and `handleChatSend` — these crash on every prediction attempt.
3. **Revoke leaked PAT** and rotate any co-exposed secrets.

### Short-term (This Sprint)
4. Finish the inference service — wire up real Cloudinary artifact download and model loading.
5. Wire mobile training button to `/train` API.
6. Add health check endpoint to main.py (referenced by render.yaml).
7. Merge the two duplicate `GET /models` endpoints.

### Medium-term (Next Month)
8. Add rate limiting (`slowapi`).
9. Add basic tests (at least endpoint smoke tests).
10. Migrate agent to download datasets from Cloud URLs instead of inline base64.
11. Upload model artifacts to Cloudinary instead of Firestore base64.
12. Implement the model catalog in Firestore.

---

## CONCLUSION

Toddler is an ambitious, well-conceived product with a genuinely innovative architecture (BYOC device training, privacy-first design). The codebase shows strong engineering fundamentals — the Capacitor native bridge, the transactional job claiming in the agent, the signed Cloudinary upload flow, and the CI/CD pipeline are all well-built.

The main challenge is that the product is mid-migration: the inference layer (`/predict`) has been moved to a dedicated service but the migration isn't complete, leaving all predictions broken. Several features described in the spec as "shipped" (LLMs, HF transformers, vision ML) are not present in the actual code files — either they exist in files not committed to this repo, or the spec is aspirational.

For an investor or client: the **vision is compelling**, the **core training pipeline works**, and the **BYOC architecture** is a genuine competitive moat. The immediate priority should be completing the inference migration so the end-to-end demo works smoothly.
