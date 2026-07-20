# Toddler — Product Specification & Roadmap

> *"Upload a spreadsheet. Walk away with a classifier. Train, own, and deploy custom AI models without writing code."*

---

## 1. What is Toddler?

Toddler is a **private, on-device-first AI training platform**. Users bring their own data (CSV/text, folders of images, plain-text docs) and walk away with a small, fast, deployable model they own — trained on their phone, their laptop, or (optionally) in the cloud.

### Core promises

- **Zero code.** Spreadsheet/photos in, classifier or chat model out.
- **Own your model.** Every trained model exports as a portable artifact (`.pkl`, `.json`, onnx weights). No lock-in.
- **Private by default.** Data never leaves the device when trained locally. Cloud training is an opt-in upsell.
- **Runs on real hardware.** Models are chosen to fit the device you have — phones get tiny models, desktops get bigger ones, cloud gets anything.
- **Deploy instantly.** Every trained model gets an API key + embeddable widget + downloadable artifact.

### Target users

- Indie devs / makers who want a custom text/image classifier without wrangling Python
- Small teams prototyping NLP / vision features
- Tinkerers who want a local Llama they can "teach" on their own docs
- Anyone who wants to train models on their own hardware without paying per-token cloud AI fees

---

## 2. Platform Surfaces

Toddler ships on **four surfaces**, each with a clear, distinct job. They all share one Firestore backend so state is in sync across devices.

| Surface | Stack | Primary job | Trains models? | Catalog tier |
|---|---|---|---|---|
| **Web Dashboard** (toddler.ai) | React 19 / Vite / Tailwind, hosted on Vercel | Manager, dev console, catalog browser, queue monitor, API key management, sandbox test chat | ❌ Never (manager only) | Shows everything — badges indicate where each model runs |
| **Mobile App** (Android, iOS later) | React + Capacitor 7, Kotlin foreground service | On-device trainer for *small* models, on-the-go chat with local LLMs, BYOC free-tier worker | ✅ Small models only (SmolLM2-360M, 42MB classifiers, MobileNet-lite) | Curated "fits in your pocket" tier |
| **Desktop Agent** (Windows/macOS/Linux) | Tauri or Electron, Rust/Node sidecar | On-device trainer for *larger* models, menu-bar monitor, BYOC for bigger free-tier jobs | ✅ Broader catalog (SmolLM-1.7B / Llama-3.2-3B, larger vision, bigger text classifiers) | Models up to the machine's CPU/GPU/RAM/SSD |
| **Cloud Training** (Pro tier) | RunPod / Modal GPU workers, FastAPI control plane | Always-on GPU training for jobs the user's devices can't fit, hosted inference | ✅ Anything in the catalog (with credit metering) | Full catalog + future large models |

### Design principle

**The web app is never where training happens.** It is the *control tower*. Users see what their devices are doing, browse what's possible, and manage finished models — but the actual gradient updates run on silicon the user owns (or pays for).

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         toddler.ai (Web Dashboard)                  │
│  Queue · Models catalog · Devices · Datasets · API keys · Sandbox   │
└────────────┬──────────────────┬──────────────────┬──────────────────┘
             │                  │                  │
             ▼                  ▼                  ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │  📱 Mobile   │◄──►│  💻 Desktop  │◄──►│  ☁️  Cloud    │
    │  App (BYOC)  │    │  Agent (BYOC)│    │  GPU Worker  │
    │  SmolLM-360M │    │  SmolLM-1.7B │    │  Llama-3.2-3B│
    │  HF classif. │    │  Llama-3.2-3B│    │  Large vis.  │
    │  MobileNet   │    │  ViT, etc.   │    │  Unlimited   │
    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
           │                   │                   │
           └───────────────────┴───────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI Backend   │
                    │   (Render / Fly)    │
                    │  - Auth (Firebase)  │
                    │  - Job queue        │
                    │  - /predict proxy   │
                    │  - Model catalog    │
                    │  - Device registry  │
                    │  - Billing / Stripe │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Firebase / GCP     │
                    │  - Firestore (state)│
                    │  - Auth             │
                    │  - Cloud Storage    │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Cloudinary         │
                    │  - Dataset blobs    │
                    │  - Model artifacts  │
                    └─────────────────────┘
```

### Key backend collections (Firestore)

| Collection | Purpose |
|---|---|
| `users/{uid}` | Profile, plan (`free`/`pro`), Stripe customer ID, credit balance |
| `users/{uid}/projects/{pid}` | A trained model: name, type, status, accuracy, labels, artifact URL, API key, versions |
| `training_jobs/{jid}` | A training job: project_id, dataset_ref, runner (`device_mobile`/`device_desktop`/`cloud`/`auto`), status, progress, claimed_by, device_id, timestamps |
| `users/{uid}/datasets/{did}` | Uploaded dataset metadata: name, bytes, Cloudinary URL, format, row/image count |
| `users/{uid}/devices/{did}` | Registered device: platform, OS, RAM, GPU/VRAM, lastSeen, status (`idle`/`training`/`offline`), downloaded models, BYOC enabled |
| `models/{mid}` (single-source catalog) | Every trainable model: name, task, family, size, params, minRamGb, minVramGb, minDiskGb, runsOn[] (`mobile`/`desktop`/`cloud`), trainer runtime, license, description, benchmark accuracy |
| `users/{uid}/projects/{pid}/logs` | Inference/prediction history for active learning |

---

## 4. The Model Catalog (single source of truth)

Catalog lives in Firestore `models/` (served via `GET /models`). Each entry declares where it can run:

```json
{
  "id": "smollm2-360m",
  "name": "SmolLM2 360M",
  "task": "chat",
  "sizeMb": 150,
  "params": 360000000,
  "minRamGb": 4,
  "minVramGb": 0,
  "runsOn": ["mobile", "desktop", "cloud"],
  "trainer": "web-llm",
  "license": "Apache-2.0",
  "downloadUrl": "https://huggingface.co/..."
}
```

### Tiered model families

**Mobile (phones, ≥4GB RAM):**
- SmolLM2-360M (LLM, chat)
- Sentiment Lite (DistilBERT 42MB)
- Toxicity Lite (ToxicBERT 45MB)
- Emotion Mini (42MB)
- Vision Lite (MobileNet V3 Small, 11MB)
- Face Detector (BlazeFace, 22MB)

**Desktop (≥8GB RAM, optional GPU):**
- SmolLM2-1.7B (LLM, chat)
- Llama-3.2-3B (LLM, code-capable)
- Embed Mini (sentence embeddings, 86MB)
- MobileNet V2 (image classification, 14MB)
- Object Detector (COCO SSD, 27MB)
- Pose Lightning (17-keypoint pose, 9MB)
- Larger text classifiers / sklearn pipelines up to ~500MB

**Cloud (Pro, GPU):**
- All of the above
- Llama-3.2-8B / future larger LLMs
- ViT-Base/16 vision fine-tuning
- Custom fine-tunes of hosted base models
- Multi-epoch, hyperparameter search jobs

### How gating works

- **Mobile app** fetches `GET /models/recommended?platform=mobile&ram_gb=X&storage_mb=Y` — only returns models tagged `runsOn: mobile` that fit the device.
- **Desktop agent** fetches `...?platform=desktop&ram_gb=X&vram_gb=Y&disk_mb=Z` — returns `runsOn: desktop` models that fit.
- **Web dashboard** shows the entire catalog, with per-model badges: "✓ Fits your Pixel 8", "Runs on desktop", "Cloud only", and the "Start training" CTA routes to the right runner.
- When a model doesn't fit *any* of the user's registered devices and they're on free tier → upsell to Pro/cloud.

---

## 5. Cross-Platform User Journey

### 5.1 Signup & Onboarding (any surface)

1. User lands on **toddler.ai**, sees landing page (hero, feature grid, pricing).
2. Signs up with email or Google. Free tier, no card required.
3. Post-signup, web dashboard walks them through **device pairing**:
   - "Install the mobile app" → QR/link to Play Store
   - "Install the desktop agent" → download button for their OS
   - Pairing code: a short 6-digit code or QR with `toddler://pair?code=XYZ`. The device signs in with the code (no password typing).
4. User lands on the web **Queue** page with a sample project prompt: "Try training your first model".

### 5.2 Training a model (web-driven, runs elsewhere)

1. User opens web dashboard → **Models** tab, browses the catalog.
2. Picks a model (e.g. "Sentiment Lite"). Badges show: "Runs on your Pixel 8 (4GB RAM)", "Cloud (Pro)".
3. Clicks **Train** → dataset picker:
   - Upload new CSV via drag-drop (signed Cloudinary upload; files >750KB streamed, no longer capped at base64 limit)
   - Pick existing dataset from library
   - Choose text/label columns (text models) or folder categories (vision)
4. **Runner selection**:
   - `Auto (recommended)` — routes to the user's online device that can fit it fastest; if none online for 5min, asks "Train in cloud for X credits?"
   - `Train on [Pixel 8]` — sends push to phone, BYOC picks it up when app opens
   - `Train on desktop` — same for Mac/PC
   - `Train in cloud (Pro)` — uses GPU worker (only enabled if Pro or has credits)
5. User clicks **Start training** → `POST /train` → job created with `runner` field.
6. User is taken to the **Queue** page:
   - Live progress bar (updates every 2s via Firestore listener)
   - Runner icon: 📱 mobile / 💻 desktop / ☁️ cloud
   - Status: queued · waiting-for-device · training · uploading · complete · failed
   - Cancel button
7. When complete, notification fires: local (if on app), push (if web FCM subscribed), email (optional).
8. Project moves to the **Models** tab → finished models list.

### 5.3 Monitoring a device-side training job

- **On phone/desktop**: training runs in a foreground service (Android) / menu-bar worker (desktop). Notification shows progress. App can be backgrounded.
- **On web dashboard**: the queue row shows the live percentage from `/jobs/{id}/progress`. A "Devices" panel shows the device is "Training job #123 · 42% · 3min remaining".
- If device disconnects mid-job, job is re-queued after a 90s timeout; other eligible device (or cloud) can pick it up.

### 5.4 When a device can't handle the model

- The Models tab filters out models too big for all of a free user's devices.
- A banner at the top: *"3 models require more power than your devices. Pair a desktop or upgrade to Pro to train in the cloud."*
- Clicking an unavailable model shows a panel: "Needs 8GB GPU VRAM. Your devices: Pixel 8 (4GB RAM, no GPU), MacBook Air (8GB CPU). Options: Pair a more powerful desktop · Train in cloud (Pro)".
- "Train in cloud" → if free user, shows Stripe checkout; if Pro, creates a cloud job immediately.

### 5.5 Using a finished model

From the project detail page on web dashboard:

| Action | How |
|---|---|
| **Download artifact** | Button exports `.pkl` (server-trained) or `.json` (device-trained) + a zero-dep Python predictor script |
| **API key** | Auto-generated key `tdlr_live_…`, curl/Python/JS snippets, usage metrics |
| **Sandbox test chat** | Web UI: type text / upload image → hits backend `/predict` proxy (server-side inference for cloud models; device models also served via backend since artifact is in cloud storage). Shows confidence + feature weights. |
| **Embed widget** | Copy-paste `<script>` snippet (from `public/widget.js`) to add a chatbot to any site |
| **Mobile chat** | Deep link `toddler://chat?project=…` opens the app to the local-chat view for this model (if the model is downloaded on that device) |
| **Versions / retrain** | Button to retrain with new data → creates a new job; can promote versions to production |
| **Batch predict** | Upload CSV, download results CSV (server-side, no local ML) |

### 5.6 Day-to-day device lifecycle

1. User installs mobile app, signs in via pairing code → device registered in `users/{uid}/devices/{did}`.
2. While the app is installed, BYOC worker polls every 20s (when app is foreground, or via foreground-service when training):
   - Device heartbeats `POST /devices/heartbeat` with battery/Wi-Fi status
   - If idle + on Wi-Fi (+ charging on mobile), asks `POST /jobs/claim?platform=mobile` → picks up queued `device_mobile` jobs that fit
   - Downloads dataset from Cloudinary, trains locally, streams progress, uploads artifact, marks complete
3. Desktop agent behaves the same but with bigger-job eligibility and lower latency polling.
4. User can disable BYOC per-device from the web Devices page (toggle "Let this device train free-tier jobs").
5. Uninstalling/revoking a device removes it; its in-flight jobs are re-queued.

### 5.7 Pro / Cloud flow

1. User clicks "Upgrade to Pro" anywhere → Stripe Checkout.
2. Webhook confirms payment → `users/{uid}.plan = 'pro'`; credits granted.
3. Cloud GPU worker is a separate always-on process (or serverless: Modal job per training) that claims jobs with `runner='cloud'`.
4. Pro users see:
   - Cloud runner selectable in the Start Training dialog
   - "Train all new jobs in cloud" toggle
   - Credit balance in header; overage protection (pause when out of credits)
   - Priority queue (cloud jobs skip before BYOC free-tier jobs)

---

## 6. Per-Surface Feature Matrix

| Feature | Web Dashboard | Mobile App | Desktop Agent |
|---|---|---|---|
| Sign up / sign in | ✅ | ✅ (via pairing after web sign-up or direct) | ✅ (pairing code) |
| Browse full model catalog | ✅ | ❌ (only mobile-eligible shown) | ❌ (only desktop-eligible shown) |
| Start training job | ✅ (choose runner) | ✅ (local datasets → local training) | ✅ (local datasets → local training) |
| Queue / live progress | ✅ (live Firestore) | ✅ (current job) | ✅ (menu bar) |
| Cancel job | ✅ | ✅ (only job running on this device) | ✅ |
| Device management | ✅ (list all, rename, disable BYOC) | ❀ (self info only) | ❀ (self info only) |
| Dataset library | ✅ (upload, preview, delete) | ✅ (upload only, basic list) | ✅ (upload from local disk) |
| Model catalog filter (RAM/GPU/task) | ✅ | Implicit (only show fits) | Implicit |
| Download artifact | ✅ | ✅ (local models only) | ✅ (local models only) |
| API keys + code snippets | ✅ | ❌ | ❌ |
| Embed widget builder | ✅ | ❌ | ❌ |
| Server-side sandbox test | ✅ | ❌ (local only) | ❌ (local only) |
| Local chat with downloaded model | ❌ | ✅ | ✅ |
| LLM RAG ("train" on docs) | ❌ | ✅ (SmolLM-360M with docs upload) | ✅ (larger contexts) |
| Vision single-shot inference | ✅ (server-side) | ✅ (camera + gallery) | ✅ (webcam + files) |
| Vision retrain (correct bad prediction) | ❌ | ✅ | ✅ |
| Batch predict (CSV in, CSV out) | ✅ (server-side) | ❌ | ✅ |
| Local notifications on complete | N/A | ✅ | ✅ |
| Web push notifications | ✅ | N/A | N/A |
| Account / billing / plan | ✅ | Basic (view plan) | Basic |
| Hardware monitor | ❌ (per-device stats shown) | ✅ (this device) | ✅ (this device) |
| Deep links | Receive (browser target) | Receive + open | Receive + open |
| PII redaction toggle | ✅ (at upload) | ✅ | ✅ |
| Export/delete account | ✅ | ✅ | ❌ |

---

## 7. Brand & Design System

**Brand color palette:**

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#14130F` | Page background |
| `--surface` | `#1D1B16` | Panels, cards |
| `--surface-2` | `#26231C` | Raised / inputs |
| `--line` | `#38352B` | Dividers, borders |
| `--text` | `#F2EFE6` | Body text |
| `--text-dim` | `#A8A296` | Secondary text |
| `--text-faint` | `#6E695C` | Captions, disabled |
| `--accent-lime` | `#C6FF33` | Primary CTAs, success, active state |
| `--accent-purple` | `#7D39EB` | In progress / training / queued |
| `--danger` | `#FF5C3E` | Destructive, errors, failed state |

**Typography:**
- Display/headings: Space Grotesk
- Body: Inter
- Mono/metadata: IBM Plex Mono

**Logo mark:** Hollow lime square with two corner brackets evoking reticle/matrix tags.

**Status color conventions:**
- 🟢 Lime = ready / active / healthy / device-online
- 🟣 Purple = training / queued / pending
- 🔴 Red/Orange = failed / error / destructive action
- ⚪ Dim = idle / offline / disabled

---

## 8. Implementation Roadmap (Batches)

### Batch 0 — Architectural alignment (pre-work)

- [ ] Fix Firebase config defaults (`projectId: "toddler-4299a"`, correct authDomain/storageBucket)
- [ ] Lock CORS origins on Render backend (no more `*` in production)
- [ ] Rotate leaked GitHub PAT, fix `.git/config` to not embed credentials
- [ ] Move release keystore out of `temporary/`; add `temporary/` to `.gitignore`
- [ ] Rip `visionML`/`textML`/`localforage` imports out of web `Dashboard.jsx` (web never does local ML)
- [ ] Upload `public/.well-known/assetlinks.json` to `toddler.ai` domain for HTTPS App Links

### Batch 1 — Web dashboard: the control tower *(current focus)*

- [ ] **Firebase fixes** (correct defaults)
- [ ] **Backend: Devices endpoints**
  - `POST /devices/register` — creates `users/{uid}/devices/{did}`
  - `POST /devices/heartbeat` — updates lastSeen, status, currentJobId
  - `GET /devices` — lists user's registered devices
  - `PATCH /devices/{did}` — rename, toggle BYOC
  - `DELETE /devices/{did}` — revoke device
- [ ] **Backend: Jobs endpoints extended**
  - `GET /jobs?status=running|queued|complete|failed` — list user's jobs
  - Job `runner` field + auto-routing logic (pick cloud if pro + no fit; else wait for device)
  - `POST /jobs/{id}/cancel`
- [ ] **Backend: Catalog served from Firestore** (fall back to hardcoded MODEL_CATALOG if no docs)
  - `GET /models?platform=mobile|desktop|cloud` filtered
  - `GET /models/recommended?...` with device-aware filtering already exists — extend to take `hasPro` flag
- [ ] **Backend: Project list endpoints**
  - `GET /projects` — list all trained/model projects with status, accuracy, job progress
- [ ] **Web Dashboard restructure** (single `Dashboard.jsx` rewritten):
  - **Sidebar (30% persistent on desktop, drawer on mobile)**
    - TODDLER brand
    - **Projects** section (Firestore projects list, active highlighted, New Project button, Delete project)
    - **Active Model** card (if a model is selected, shows name/size/remove)
    - **Device Training** (BYOC toggle, current status)
    - Footer: account, logout
  - **Top header (sticky)**
    - Hamburger (mobile only), current-project name, BYOC status pill, profile avatar
  - **Nav tabs (top, below header)** — Queue · Models · Devices · Datasets · Dev
  - **Queue tab** (default)
    - Active job card: runner icon, project name, progress bar, ETA, cancel
    - Sections: Training, Queued, Recently completed (last 30 days)
    - Each row: project name, runner icon+label, progress %, timestamps, accuracy (when done)
  - **Models tab (catalog)**
    - Filter chips (All / Chat / Text / Vision / Detection / Embeddings / Fits my devices / Cloud only / Downloaded)
    - Cards showing model name, type, description, size/RAM badges, compatibility line ("✓ Fits Pixel 8", "Cloud only", etc.), download/train button
    - "My Models" sub-section (finished trained projects) with Export/Test/Rename
  - **Devices tab**
    - Device cards: platform icon, name, OS, RAM, GPU, storage, last seen, status dot (idle/training/offline), current job, BYOC toggle, remove button
    - Big "Pair new device" panel with pairing code + QR
  - **Datasets tab**
    - Upload dropzone, list of uploaded datasets with name/size/format/date/delete, reuse-dataset for new jobs
  - **Dev tab (per project, visible when a finished project is selected)**
    - API key readout + copy button
    - Language tabs: Python / JavaScript / cURL — copyable snippets
    - Embed widget snippet
    - Sandbox test panel (calls server `/predict`, shows confidence/weights)
- [ ] **Cloud upsell** when user tries to train a model their devices can't fit
- [ ] **Sticky top nav + queue** indicator so users always see training progress

### Batch 2 — Mobile app: proper BYOC client

- [ ] Replace hardcoded `fallbackModels` with `GET /models/recommended?platform=mobile`
- [ ] Device registration + heartbeat on app start (post to `/devices/register` + 60s heartbeat)
- [ ] Train tab wired: pick dataset from Datasets collection → pick model → create job with `runner=device_mobile` → train immediately
- [ ] Model Zoo shows only mobile-eligible models; desktop/cloud-only models hidden
- [ ] Sync `downloaded[]` list to backend so web dashboard shows "Downloaded on your Pixel 8" badges
- [ ] Fix `removeModel` for LLMs to call `deleteModelInCache()` to free IndexedDB
- [ ] Web push FCM (optional, post-Batch-1)
- [ ] `toddler://chat?project=…` and `toddler://pair?code=…` deep links handled
- [ ] Mobile feature parity with desktop sidebar: export/delete project, rename, view API keys (read-only)

### Batch 3 — Desktop agent

- [ ] Scaffold Tauri project (replace stub `desktop/`), Rust backend
- [ ] Pairing flow via code/QR → authenticate, register device
- [ ] Hardware audit (sysinfo + wgpu adapter for GPU/VRAM + RAM + free disk)
- [ ] Menu-bar/tray UI: idle/training status, progress, open dashboard, quit
- [ ] BYOC poll loop (claims `device_desktop` jobs that fit hardware)
- [ ] Training runtimes for desktop tier:
  - onnxruntime-node for text classifiers
  - @mlc-ai/web-llm (or native MLC) for SmolLM-1.7B / Llama-3.2-3B on Vulkan/Metal
  - Optional Python sidecar (bundled) for vision fine-tuning
- [ ] Download/cache models locally, report cache to backend
- [ ] Power awareness (don't train on battery)
- [ ] App settings: start at login, BYOC toggle, concurrent jobs limit

### Batch 4 — Cloud training & Pro tier

- [ ] Stripe Checkout + customer portal
- [ ] Backend webhook → update user plan, credit balance
- [ ] GPU worker (Modal or RunPod serverless)
- [ ] Job router: `runner=auto` picks cloud when no eligible device within 5 min (for Pro) or shows upsell (for free)
- [ ] Billing page on web dashboard (plan, credits, invoices)
- [ ] Cloud runner shows ☁️ icon in queue, faster queue priority
- [ ] Credit metering on cloud jobs (per-minute billing)
- [ ] Pro paywall gates: cloud training, future large models, priority inference

### Batch 5 — Finished-model polish

- [ ] Web sandbox test chat improved: multi-turn, image upload for vision, shareable session link
- [ ] Model versioning (retrain creates a new version, promote/demote which serves API)
- [ ] Webhooks per project (`POST` to user URL on training complete / prediction thresholds)
- [ ] Activity log (audit of jobs/uploads/API calls per project)
- [ ] Datasets library: preview rows, delete, reuse across jobs, column-mapping memory
- [ ] Multiple API keys per project, scope, rotate, usage metrics
- [ ] Better embedding widget (themes, position, branding)

### Batch 6 — Hardening & scale

- [ ] Rate limiting on backend (slowapi)
- [ ] Firestore composite indexes deployed
- [ ] Larger dataset uploads via signed Cloud Storage URLs (remove 750KB base64 cap)
- [ ] Sentry error reporting (web + backend + native)
- [ ] PWA manifest for web install (Add to Home Screen)
- [ ] Adaptive icons for Android (proper foreground/background layers)
- [ ] ProGuard/R8 enablement for release APKs (smaller builds)
- [ ] CI for backend tests + web lint + APK build (the `android.yml` workflow, properly pushed via PAT with workflow scope)
- [ ] Email notifications (training complete, invoice, etc.) via Resend/Postmark
- [ ] Proper vision inference API proxy on backend (serve predictions for cloud-trained vision models)

---

## 9. Open Questions / Decisions

- **iOS timeline?** Capacitor supports iOS, but push notifications/FG service/battery restrictions differ. Likely post-Batch-3.
- **Python sidecar for desktop vs pure WASM?** Python gives access to the entire PyTorch/HF ecosystem but adds ~100MB to the desktop bundle. Start with onnxruntime + web-llm only; add Python sidecar only if needed for larger vision models.
- **Credit pricing for cloud jobs?** Start simple: $/GPU-minute, with a Pro monthly allotment. Refine after real usage.
- **Team workspaces?** Single-user first; shared workspaces as v2.
- **Model marketplace?** Long-term: let users publish their trained models publicly. Not in v1.

---

## 10. What's Already Shipped (✅ done)

> Last audited against commit `2a2ddc5`. Checked items are live in `main` and either deployed on Vercel or built into the Android APK.

### Auth & account
- [x] Email/password sign up + sign in (Firebase Auth)
- [x] Google OAuth sign-in (web via popup, Android via `@capacitor-firebase/authentication`)
- [x] Password reset email (`sendPasswordResetEmail`) with in-app success banner
- [x] Post-signup email verification (`sendEmailVerification`)
- [x] Account deletion endpoint (`DELETE /account`) that cascades Firestore data
- [x] Sign out (both web and mobile)

### Web dashboard (current)
- [x] Landing/marketing page (hero, feature grid, pricing, CTA, footer)
- [x] Sidebar layout (project list, New Project button, Delete Model, Log out)
- [x] Project header (eyebrow status, rename with ✎, Export button)
- [x] Tab strip: Overview / Batch / Chat / Dev (per project type)
- [x] **Live Inference** text-classification panel → server `/predict` (confidence + feature-weight bars)
- [x] Recent predictions history
- [x] **Batch predict** CSV upload → results CSV download (server-side)
- [x] **Chat tab**: intent mapping per label + simulation chat (server inference)
- [x] Vision model support: image upload → in-browser MobileNet/KNN prediction + retrain-on-correction
- [x] **Dev tab**: API key readout + copy, Python/JS code snippets per model type
- [x] Export `.pkl` (sklearn) or `.json` (toddler-bayes-v1 phone-trained)
- [x] Project rename inline
- [x] Project delete with confirm
- [x] Sticky header with mobile hamburger (drawer on <840px)
- [x] Polling for in-progress projects (5s interval while any project is training)
- [x] Toast notifications (react-hot-toast)
- [x] Haptics on native (success/medium/heavy impacts)

### Mobile app (current)
- [x] Route narrow/coarse viewports to MobileDashboard automatically (not just native)
- [x] Sticky branded header with lime status pill + profile avatar
- [x] BYOC device-ready/idle/training pill in header (toggle saves to localStorage)
- [x] Profile drawer (avatar, email, project/account/dev settings, logout, delete account)
- [x] Welcome hero + device card (RAM, platform)
- [x] Device stats strip (RAM / free storage / mode)
- [x] Bottom-style tabs: **Zoo · Train · Chat · Dev**
- [x] **Model Zoo**: 10 built-in static models + 3 LLMs, category filter chips (All/Chat/Text/Vision/Detection/Embeddings/Recommended/Downloaded), resume-interrupted downloads, model detail modal
- [x] Local downloads with IndexedDB + range-request resume for static models
- [x] **On-device LLMs** via @mlc-ai/web-llm (SmolLM2-360M, SmolLM2-1.7B, Llama-3.2-3B) with WebGPU gating, download progress, streaming chat
- [x] **HF transformers.js** text-classification models (Sentiment, Toxicity, Emotion) run on-device
- [x] **Chat tab**: model picker, streaming caret, typing indicator, per-message latency, unique `_id` to avoid stale-index bugs
- [x] **RAG for LLMs**: upload `.txt/.csv/.md/.json/.js/.py` files → 600-char chunks, injected into system prompt (200-chunk cap), clear docs
- [x] **Train tab**: downloads list, dataset upload to Cloudinary (signed), "coming soon" disabled per-dataset train button (see pending)
- [x] **Dev tab**: localhost API snippet with copy button
- [x] Project sidebar (30% desktop / slide-out drawer mobile) showing Projects list / Active Model / BYOC toggle / Delete / Logout
- [x] Firestore projects polling (shares polling/notifications with web logic)
- [x] New Project button → Onboarding flow
- [x] Pro upsell banners when job exceeds device RAM/free-tier caps

### Shared onboarding
- [x] CSV text upload (column picker for text + label)
- [x] Image folder upload (webkitdirectory, multi-folder label detection, 1000-image free-tier cap with RAM estimate)
- [x] PII redaction toggle
- [x] Creates Firestore project → `POST /train` → waits for job progress with live status messages
- [x] Shows "Waiting for a trainer… open the Toddler app on your phone" when idle
- [x] Error cleanup (deletes Firestore project doc if `/train` fails)
- [x] Server nudge (`POST /_agent/run`) to wake free-tier worker

### Android native
- [x] Capacitor 7 scaffolding, `appId: ai.toddler.app`, themed `StatusBar` (#14130F)
- [x] Kotlin/Java `TrainingService` foreground service (wakelock, `FOREGROUND_SERVICE_DATA_SYNC`)
- [x] `TrainingPlugin` exposing start/stop to JS
- [x] Custom `ic_stat_training` notification icon (hollow lime square, 24dp)
- [x] `POST_NOTIFICATIONS` permission request flow
- [x] **Deep links**: `toddler://` custom scheme + `https://toddler.ai` (autoVerify intent-filter, needs assetlinks.json live)
- [x] `@capacitor/app` `appUrlOpen` listener routes `/login` `/signup` `/dashboard`
- [x] Local notifications via `@capacitor/local-notifications` (training complete, fired when Firestore status flips to `trained`)
- [x] Haptics plugin wired
- [x] Branded adaptive launcher icons (mipmap-* densities)
- [x] `google-services.json` wired for Firebase

### Backend (FastAPI on Render free tier)
- [x] Firebase Admin SDK auth (service account JSON via env)
- [x] `GET /` health
- [x] `POST /train` → enqueues a job in `training_jobs`, CSV base64-encoded (750KB cap)
- [x] `GET /jobs/{id}` + `POST /jobs/{id}/progress` + `POST /jobs/{id}/complete` + `POST /jobs/{id}/fail`
- [x] `POST /jobs/claim` transactional claim (BYOC devices)
- [x] `POST /predict` (supports both `.pkl` sklearn artifacts and zero-dep `.json` toddler-bayes artifacts)
- [x] `POST /batch` CSV batch predict
- [x] `GET /projects/{id}/download` + `GET /projects/{id}/export` (auto-switches `.pkl`/`.json` + predictor script)
- [x] `DELETE /projects/{id}`
- [x] `GET /models` + `GET /models/recommended?ram_gb&storage_mb` (hardware-aware filtering)
- [x] `POST /datasets` + `GET /datasets` (Cloudinary metadata)
- [x] `POST /uploads/sign` (signed Cloudinary upload)
- [x] **Agent worker**: poll mode (20s default) + transactional `claim_job`, sklearn training tournament, confusion-matrix normalization, progress updates, bayes JSON artifact generation
- [x] `POST /_agent/run` + `GET /_agent/status` (HTTP-triggered worker for free tiers)
- [x] `agent_entry.py` supports `--poll` / `--once`
- [x] PII scrubber (emails/phones/SSN/credit cards regex)
- [x] API key generation per project + X-API-Key auth on predict/export/download
- [x] CORS middleware (configurable via `CORS_ORIGINS` env)
- [x] In-memory-sort fallback for pending_jobs when composite Firestore index is missing
- [x] `public/byoc-worker.js` (web Worker): token-based auth, 30s poll, 250ms post-training kick, 10s token timeout, status/message channel, progress forwarding, start/stop lifecycle
- [x] `public/widget.js` embed script (fixed chat bubble, API-key auth)
- [x] `public/.well-known/assetlinks.json` (for Android App Links; needs hosting on domain)
- [x] Dockerfile + `run.sh` for server boot

### LLM / on-device ML
- [x] `src/llm.js` lazy-loads `@mlc-ai/web-llm` (6MB chunk split from main bundle)
- [x] RAM-gated catalog: 4GB → SmolLM2-360M-q0f16 (150MB), 6GB → SmolLM2-1.7B (900MB), 8GB+ → Llama-3.2-3B (1.7GB)
- [x] Streaming completions with `onChunk` callback
- [x] KV cache reset after each response (keeps memory low on 4GB devices)
- [x] `onLlmState` subscription so UI reacts to engine load/progress
- [x] RAG chunk store: 600-char chunks, simple overlap, cap 200 chunks
- [x] `src/textML.js` — sklearn-compatible Naive Bayes trainer that runs in browser/worker and emits `toddler-bayes-v1` JSON
- [x] `src/visionML.js` — MobileNet + KNN classifier via TF.js (localforage persistence, Cloudinary sync, retrain)
- [x] Zero-dependency predictor embedded in JSON exports (Python snippet in `/export`)

### Build / CI / infra
- [x] Vite 6 + React 19 + Tailwind v4 build
- [x] Code splitting: main ~1MB, visionML ~1.9MB lazy, @huggingface/transformers 568KB lazy, web-llm 6MB lazy
- [x] `npm run build` passes cleanly
- [x] `oxlint` clean (0 errors; a few unused-catch-param warnings)
- [x] `npx cap sync android` wired
- [x] Idempotent Android release signing workflow (`android-workflow-paste-me.yml`): brace-matching Python parser patches `build.gradle` without doubling-up `release{}` blocks, reads keystore from base64 secrets
- [x] Vercel SPA rewrites (all routes → `index.html`)
- [x] README + README_ANDROID docs
- [x] `vercel.json` rewrites

---

## 11. Pending Fixes (known bugs & technical debt)

### 🔴 Immediate (before any public launch)

| # | Area | Issue |
|---|---|---|
| F-1 | Config | Firebase `src/firebase.js` defaults use `"toddler"` projectId / placeholder IDs — if any `VITE_FIREBASE_*` env is missing on Vercel, the app silently connects to a non-existent project. Replace with correct defaults or crash loudly. |
| F-2 | Security | GitHub PAT previously used for pushes has been leaked in chat history / `.git/config` — **must** be rotated/revoked on GitHub and the remote URL rewritten to `https://github.com/GraphicMiles/Toddler.git` (no embedded creds). |
| F-3 | Security | Backend CORS defaults to `*` on Render — lock via `CORS_ORIGINS=https://toddler.ai,https://er-kappa.vercel.app,capacitor://localhost,http://localhost` before launch. |
| F-4 | Security | Release keystore is sitting in `temporary/toddler-release.keystore` in plaintext. Move to GitHub Secrets; add `temporary/` to `.gitignore`; confirm it is not tracked (`git ls-files temporary/`). |
| F-5 | CI | `.github/workflows/android.yml` exists locally but PAT used for git push lacks `workflow` scope — either grant the new PAT `workflow` scope or paste `android-workflow-paste-me.yml` manually through GitHub's web UI for the first push. |
| F-6 | Deep links | `https://toddler.ai/*` App Links won't auto-verify until `public/.well-known/assetlinks.json` is served from the real `toddler.ai` domain. Custom `toddler://` scheme works now. |
| F-7 | Mobile | **Train tab per-dataset button is disabled** ("Coming soon") — users can upload datasets but can't start a training job from mobile. Needs to call `POST /train` → BYOC worker picks it up. |
| F-8 | Web | Web Dashboard still imports and runs `visionML` (MobileNet/KNN) in the browser — violates the "web is manager only" rule and will break on low-end machines. Remove local vision ML; route inference to server `/predict` (artifact is already in Cloudinary for cloud-trained; for device-trained, serve via backend once uploaded). |
| F-9 | Web | `(pointer: coarse) and (max-width: 1024px)` media query in `useIsMobile()` forces MobileDashboard on iPads and Surface-style tablets where users may want desktop layout. Tighten the query (width-only) or add an explicit "Desktop view" toggle. |

### 🟠 Short-term (within Batch 1–2)

| # | Area | Issue |
|---|---|---|
| F-10 | Mobile | `removeModel()` for LLMs calls `unloadLlm()` and clears RAG chunks but never invokes web-llm's `deleteModelInCache(modelId)` — downloaded weights (up to 2.4GB) stay in IndexedDB forever. |
| F-11 | Mobile | No resend-verification-email button (one-shot on signup). |
| F-12 | Mobile / auth | Password-reset flow has no in-app oobCode handler — users finish reset on Firebase's hosted page instead of inside Toddler. |
| F-13 | Mobile | No "recent predictions" history panel in Chat for HF classifiers (desktop has this). |
| F-14 | Mobile | No model-rename, no project-delete from the sidebar footer (delete button exists but only deletes the active project without a picker); intent-response editor is missing for text classifiers. |
| F-15 | Mobile | Vision projects don't have an inference panel in Chat — no camera/gallery button to send an image through a trained vision model (desktop does live inference + retrain). |
| F-16 | Mobile | No batch predict (CSV → results CSV) on mobile. The backend exists; add a UI entry point. |
| F-17 | Mobile | Mobile Dashboard pulled hardcoded `fallbackModels` even though backend serves `/models/recommended` — dedupe to one source (Batch 1). |
| F-18 | Backend | `/train` upload limit is 750KB (base64 in Firestore doc). Real CSVs/images blow past this — switch to signed Cloud Storage upload, then POST a reference to `/train` (Batch 6). |
| F-19 | Backend | Composite Firestore index for `projects.where(ownerUid, status).orderBy(createdAt)` is not deployed; code falls back to in-memory sort, which degrades above ~50 projects. Ship `firestore.indexes.json`. |
| F-20 | Backend | Render free tier cold-starts after 15s; no cron keepalive. A simple cron-job.org ping every 5 min (or upgrading Render) prevents the agent from appearing asleep. |
| F-21 | Web | Desktop Dashboard projects list and the sidebar Active Model card don't show model metadata (size, RAM, task) — only project name + status. |
| F-22 | Web | No push notifications on web for training-complete (FCM service worker). Mobile has local notifications; web users need to keep the tab open. |
| F-23 | UX | When LLM download starts, Chat tab isn't auto-selected until 100% — users don't see progress; show download progress in Chat or on the model card while staying put. |
| F-24 | UX | BYOC worker posts training-complete notifications using `projectsRef` (fixed for stale closures in Dashboard) but MobileDashboard relies on polling; confirm both paths don't double-notify. |

### 🟡 Tech debt (clean up as you go)

| # | Area | Issue |
|---|---|---|
| F-25 | Build | 4 non-blocking oxlint warnings: unused `e` catch parameters (rethrown immediately). Harmless but noisy. |
| F-26 | Build | Chunk-size warnings for `visionML` (1.88MB), web-llm (6MB), index (1MB) — can add `rollupOptions.output.manualChunks` for stable caching. |
| F-27 | Build | `onnxruntime-node` postinstall script fails in CI/sandboxes (it tries to download CUDA binaries); `npm install --ignore-scripts` works but skips legitimate postinstalls. Consider pinning to a CPU-only variant or using `optionalDependencies`. |
| F-28 | Code | Model metadata keys are inconsistent across catalogs: `trainingRamMb` (mobile), `minimumRamGb` (backend), `minRamGb` (LLM_CATALOG), `params` vs `parameterCount`, `sizeMb` vs `sizeBytes`. Consolidate to one schema in the Firestore `models/` catalog. |
| F-29 | Code | Desktop Tauri scaffold (`desktop/`) is dead stub code — `main.rs` hardcodes "Windows 11", downloads a fake `directml.dll`, isn't referenced from `package.json`. Delete or move to a spike branch until Batch 3. |
| F-30 | Code | `widget.js` doesn't expose a documented API-key auth flow in the Dev tab snippet (says `window.TODDLER_API_URL` but key passing isn't shown). |
| F-31 | Android | Adaptive icons use a plain PNG foreground — Android 8+ will mask it into a squircle. Regenerate with proper foreground/background layers in Image Asset Studio. |
| F-32 | Android | `minifyEnabled false` in `build.gradle` — APK is larger than it needs to be; enable R8 after adding proguard rules for Capacitor/Firebase. |
| F-33 | Data | No structured error/retry logging in the agent beyond `print()`; add structured logging before taking real user traffic. |

---

## 12. Platform Upgrades (beyond Batch 6)

These are longer-lead ideas to extend the platform after the core v1 ships. Listed so they can shape architectural decisions (e.g. don't lock yourself into a per-user model layout that breaks shared workspaces).

### Core platform
- **Team workspaces** — invite collaborators to a shared project; roles (owner / editor / viewer); shared API keys; consolidated billing.
- **Model marketplace** — let users publish their trained Toddler models publicly (with license + price) so other users can one-click download or fork. Moderation + revenue share.
- **Version deployments** — promote a model version to `production` / `staging` / `dev`; instant rollback; traffic-split between versions for A/B tests.
- **Webhooks + Zapier/Make integration** — fire on `training.complete`, `prediction.threshold`, `review.needed` events; ship official Zapier app.
- **Multi-model pipelines** — chain classifiers → LLM → classifier (e.g. sentiment → if negative, route to reply generator).
- **Active-learning loop** — when model confidence is below a threshold, surface predictions to the user for labelling → automatic retrain trigger.
- **Prediction logging & analytics dashboard** — traffic volume, latency p50/p95, accuracy drift over time, label-distribution shifts.
- **Fine-grained API keys** — per-origin, per-route, rate-limited, read-only vs predict-only vs admin; rotate without downtime.
- **Offline SDKs** — ship iOS/Android/JS SDKs that bundle a downloaded model for on-device inference in other apps (not just Toddler).

### Model catalog expansion
- **Speech-to-intent** — Whisper-tiny + classifier pipeline for voice commands on device.
- **On-device OCR** — PaddleOCR / Tesseract WASM for document ingestion.
- **Image segmentation** (small YOLO / DETR quantized) — beyond plain classification.
- **Semantic search over user data** — Embed Mini + vector index on device (via IndexedDB/HNSW) for personal-RAG across notes, not just uploaded docs.
- **LoRA / QLoRA fine-tuning** for LLMs running on desktop with GPU (v1 only does context-injection "training" — proper weight updates need a desktop GPU path).
- **Multimodal models** — Moondream / tiny LLaVA-class quantized models for vision+chat on desktop tier.
- **Speech synthesis** — Piper / onnx TTS for voice-output chat.

### Mobile
- **iOS build** — Capacitor supports iOS; will need BGTaskScheduler-based BYOC (no foreground services), Apple Developer account, App Store provisioning.
- **Camera-first vision capture** — live camera preview with realtime classification frames (not just static uploads).
- **Widgets / Share Sheet** — Android home-screen widget showing training progress; share-to-Toddler to train on a webpage / screenshot / PDF.
- **On-device vector DB** — replace 200-chunk array cap with a real HNSW index (vectra / voyage) for long-term RAG across projects.
- **Background download resumption over metered networks** — respect Data Saver, wait for Wi-Fi for large model downloads.
- **Encrypted local storage** for model weights + user data (androidx.security / Keychain on iOS).
- **Battery-optimized BYOC** — don't train while on battery + <20% by default.

### Desktop agent
- **Native GPU acceleration** — CUDA (Windows/Linux), Metal (Apple Silicon), Vulkan via wgpu for web-llm.
- **System tray** — global hotkey to "talk to your model", menu-bar icon showing training %, quick capture.
- **Local API server** — run a little HTTP API on localhost so other apps on the machine (Obsidian, terminal, VSCode plugins) can hit the on-device model without going through Toddler cloud.
- **Docker container variant** — run the desktop agent headless on a homelab NAS/server as a personal BYOC node.
- **Multi-job parallelism** — train multiple jobs at once when machine has RAM/GPU headroom.
- **Automatic model updates** — when upstream HF model releases a new quant, offer to re-download.

### Cloud / Pro
- **Serverless GPU auto-scaling** (Modal / RunPod / Beam) — scale to zero, pay per training-second.
- **Dedicated inference endpoints** — low-latency predictions from cloud-trained models (current `/predict` runs inline in FastAPI on the 512MB free tier).
- **Team/organization plans** with SSO, audit logs, SAML.
- **Enterprise deployment** — VPC peering, HIPAA-eligible, on-prem inference for regulated customers.
- **On-device/cloud hybrid inference** — route simple queries to on-device model for speed/privacy, complex queries escalate to cloud LLM.
- **Usage analytics for Pro** — cost breakdown per project, credit usage forecasts, budget alerts.
- **Model distillation service** — take a large cloud model and distill it down to a SmolLM/MobileNet-sized artifact the user can download for on-device use.

### Web dashboard
- **Real-time collaboration** on model testing (multiple users in the same sandbox chat, cursors).
- **Notebook-style evaluation** — upload a test CSV, see per-class precision/recall/F1, confusion matrix heatmap (currently only the raw accuracy number).
- **Data annotation UI** — label unlabeled rows/images directly on web; feed into next training run.
- **Bias/explainability** — SHAP-style feature-importance charts, slice-analysis (accuracy broken down by text length, image brightness, etc.).
- **PWA install** — manifest.json + service worker so the dashboard installs as a standalone app with push notifications even when the tab is closed.
- **Command palette** (⌘K) to jump to any project / model / dataset.
- **Global search** across projects, datasets, past predictions.

### Community / growth
- **Public model profiles** — share a trained model via `toddler.ai/m/<id>`; visitor can try sandbox chat, see accuracy, clone the model.
- **Discord/community Slack** integration — deploy a model as a bot slash command in one click.
- **Toddler CLI** (`npx toddler` or `pip install toddler`) — train a model from a CSV at terminal, push to account, get API key.
- **Templates library** — pre-built recipes (spam detection, receipt OCR, language detection, etc.) that skip onboarding and immediately create a queued job with sensible defaults.
- **Education track** — in-app guide explaining precision/recall/overfit for users new to ML.

---

## 13. Quick Reference — Files to Know

```
src/
  App.jsx              Router + isMobile detection + DeepLinkHandler
  Dashboard.jsx        Desktop/tablet web dashboard (manager)
  MobileDashboard.jsx  Phone UI (Zoo/Train/Chat/Dev + sidebar)
  Onboarding.jsx       New-project flow (CSV or image upload)
  LandingPage.jsx      Marketing hero/features/pricing
  Auth.jsx             Login/signup/reset/verify/Google OAuth
  MobileWrapper.jsx    Safe-area + StatusBar styling shell
  llm.js               Web-LLM wrapper, RAG chunk store, streaming chat
  textML.js            In-browser Naive Bayes trainer (toddler-bayes-v1)
  visionML.js          MobileNet+KNN vision trainer (TF.js)
  cloud.js             Cloudinary unsigned upload for vision weights
  firebase.js          Auth + Firestore init
  nativeBridge.js      Capacitor foreground-service start/stop
  notify.js            Local notifications wrapper
  env.js               Sanity-check VITE_* env vars at boot
  index.css            Landing/desktop-dashboard styles
  mobile.css           Mobile UI + split-layout (30/65) styles

backend/
  main.py              FastAPI app (all endpoints above)
  agent.py             Sklearn training loop, transactional claim
  agent_entry.py       Poll/once CLI entrypoint
  hardware_audit.py    CPU/GPU/RAM probe for server worker
  run.sh               Render boot script (poll mode by default)
  Dockerfile           Container build
  requirements.txt     Python deps

android/                               Capacitor Android shell
  app/src/main/java/ai/toddler/app/
    MainActivity.java                  Registers TrainingPlugin
    TrainingPlugin.java                JS bindings
    TrainingService.java               FG service + wakelock + notif
  app/src/main/res/drawable/
    ic_stat_training.xml               Hollow lime notification icon
  app/src/main/AndroidManifest.xml     Permissions + deep links

public/
  byoc-worker.js        Web Worker that polls /claims jobs for BYOC
  widget.js             Embeddable chat bubble for end-user sites
  favicon.svg           Hollow-square favicon
  .well-known/assetlinks.json   Android App Links verification
```
