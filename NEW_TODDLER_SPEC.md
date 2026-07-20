# Toddler — Product Specification v2

> *"Browse the Zoo. Pick a model. Train it on your data. Put it up for sale."*

---

## 1. What Toddler Is

Toddler is a **device-first AI model marketplace and training platform**. Users browse a curated **Model Zoo** of open-source LLMs and vision models, train them on their own data using their own hardware, and optionally list their fine-tuned models for others to use.

### The One-Liner
**Train your own AI. Own it. Sell it.**

### Core Loop
```
Browse Zoo → Pick Model → Upload Your Data → Train on Your Device → Use / Deploy / List for Sale
```

### Three Products in One

| Product | What It Does |
|---|---|
| **Model Zoo** | Curated catalog of trainable open-source models — SmolLM2, Llama, MobileNet, YOLO — filtered by what your device can handle |
| **Training Engine** | On-device (and optionally cloud) training pipeline. For LLMs: RAG context injection + LoRA fine-tuning. For vision: transfer learning |
| **Marketplace** | Users list their trained models publicly. Others browse, clone, and use them. Free in v1. |

### Who It's For

- **Indie devs** who want a custom GPT trained on their docs — no Python, no cloud bills
- **Content creators** who want a chatbot that sounds like them, trained on their writing
- **Security/research teams** who need a face-recognition model trained on their own photos
- **Entrepreneurs** who spot a niche (e.g. "medical triage bot") and want to build & sell a specialized AI
- **Tinkerers** who just want to run Llama on their phone and teach it things

### What Makes Toddler Different

| | Toddler | OpenAI GPTs | Hugging Face | Replicate |
|---|---|---|---|---|
| **Train on your device** | ✅ | ❌ | ❌ | ❌ |
| **Own the weights** | ✅ Download anytime | ❌ Locked in | ✅ | Partial |
| **No code required** | ✅ | ✅ | ❌ | ❌ |
| **Marketplace to sell** | ✅ | ❌ (App Store only) | ✅ (but no training) | ✅ |
| **Works offline** | ✅ After download | ❌ | ❌ | ❌ |
| **Privacy** | Data never leaves device | Sent to OpenAI | Upload to HF Hub | Upload to cloud |
| **Cost** | Free (device) / $49 Pro | $20/mo + usage | Free | Pay per second |

---

## 2. Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    toddler.ai (Web App)                          │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Model Zoo   │  │  My Models   │  │  Marketplace           │ │
│  │  (Browse)    │  │  (Trained)   │  │  (Publish / Discover)  │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────────┘ │
│         │                │                                      │
│         └────────┬───────┘                                      │
│                  ▼                                               │
│         ┌──────────────┐                                        │
│         │  Training Job │ ──► Firestore training_jobs queue     │
│         └──────┬───────┘                                        │
│                │                                                │
│    ┌───────────┼────────────┐                                   │
│    ▼           ▼            ▼                                   │
│  📱 Phone   💻 Desktop    ☁️ Cloud (Pro)                       │
│  SmolLM2    Llama 3.2     Llama 3.2 8B                         │
│  360M/1.7B  3B / Vision   ViT-Large                            │
│    │           │            │                                   │
│    └───────────┼────────────┘                                   │
│                ▼                                                │
│     ┌─────────────────┐                                        │
│     │  Trained Model   │ ──► Weights saved (device + cloud)    │
│     │  + Metadata      │ ──► API key generated                 │
│     └────────┬────────┘                                        │
│              │                                                  │
│         ┌────┴────┐                                            │
│         ▼         ▼                                            │
│      Use it    List on Marketplace                             │
│      (chat/    (name, description,                             │
│       API)      category, price=free)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Platform Surfaces

| Surface | Stack | Role | Trains? |
|---|---|---|---|
| **Web** | React 19 / Vite 6 / Tailwind v4 | Zoo browser, My Models, Marketplace, control tower | ❌ Never |
| **Android** | React + Capacitor 7 + Kotlin services | Zoo, on-device LLM training (RAG + chat), BYOC worker | ✅ SmolLM2 360M/1.7B |
| **Desktop** | Tauri (Rust/Node) | Zoo, larger model training, menu-bar status | ✅ Llama 3.2 3B, vision models |
| **Cloud** (Pro) | FastAPI + Modal/RunPod GPU | Training for models too big for any device | ✅ Llama 8B, ViT-Large |

### Design Principle
**The web app never trains. It browses, manages, and deploys. Training happens on silicon the user owns or rents.**

---

## 3. The Model Zoo

The Model Zoo is the **homepage of Toddler**. It's where everything starts.

### Zoo Experience

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search models...                    [All] [LLM] [Vision] │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  🔥 TRENDING                                             ││
│  │                                                         ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              ││
│  │  │ SmolLM2  │  │ Llama    │  │ SmolLM2  │              ││
│  │  │ 360M     │  │ 3.2 3B   │  │ 1.7B     │              ││
│  │  │ Chat     │  │ Chat+Code│  │ Chat     │              ││
│  │  │ 150MB    │  │ 1.7GB    │  │ 900MB    │              ││
│  │  │ 📱💻☁️   │  │ 💻☁️     │  │ 💻☁️     │              ││
│  │  │ FREE     │  │ FREE     │  │ FREE     │              ││
│  │  │ [Train]  │  │ [Train]  │  │ [Train]  │              ││
│  │  └──────────┘  └──────────┘  └──────────┘              ││
│  │                                                         ││
│  │  📦 VISION                                               ││
│  │  ┌──────────┐  ┌──────────┐                             ││
│  │  │ MobileNet│  │ YOLOv8   │                             ││
│  │  │ V3       │  │ Nano     │                             ││
│  │  │ Classify │  │ Detect   │                             ││
│  │  │ 11MB     │  │ 6MB      │                             ││
│  │  │ 📱💻☁️   │  │ 📱💻☁️   │                             ││
│  │  │ [Train]  │  │ [Train]  │                             ││
│  │  └──────────┘  └──────────┘                             ││
│  │                                                         ││
│  │  🏪 COMMUNITY MODELS (Marketplace)                       ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              ││
│  │  │ Medical  │  │ Legal    │  │ Recipe   │              ││
│  │  │ Triage   │  │ Analyzer │  │ Chef     │              ││
│  │  │ by @dr   │  │ by @law  │  │ by @cook │              ││
│  │  │ ⭐ 4.8   │  │ ⭐ 4.5   │  │ ⭐ 4.9   │              ││
│  │  │ 2.1K uses│  │ 890 uses │  │ 5.3K uses│              ││
│  │  │ [Clone]  │  │ [Clone]  │  │ [Clone]  │              ││
│  │  └──────────┘  └──────────┘  └──────────┘              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Zoo Filters

| Filter | Description |
|---|---|
| **All** | Everything |
| **LLM** | Chat / text generation models |
| **Vision** | Image classification, object detection, face recognition |
| **Fits My Device** | Only models your registered hardware can run |
| **Trending** | Most cloned/trained this week |
| **Community** | User-published models from the marketplace |

### Model Card (when you tap a model)

```
┌─────────────────────────────────────────────────┐
│  ← Back                                          │
│                                                  │
│  SmolLM2 360M                                    │
│  Chat · 360M params · 150MB · Apache-2.0         │
│                                                  │
│  A tiny but capable language model by Hugging    │
│  Face. Runs on phones with 4GB+ RAM. Perfect     │
│  for quick Q&A, document chat, and personal      │
│  assistants.                                     │
│                                                  │
│  ┌─ Device Compatibility ──────────────────────┐ │
│  │  📱 Pixel 8 (4GB)    ✅ Fits               │ │
│  │  💻 MacBook Air       ✅ Fits               │ │
│  │  ☁️ Cloud GPU         ✅ Fits (Pro)          │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ What You'll Need ──────────────────────────┐ │
│  │  Min RAM: 4 GB                               │ │
│  │  Min Storage: 500 MB                         │ │
│  │  GPU: Not required (WebGPU optional)         │ │
│  │  Training time: ~5 min (RAG) / ~30 min (LoRA)│ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ How Training Works ────────────────────────┐ │
│  │  RAG Mode (instant):                         │ │
│  │  Upload your docs → model reads them at      │ │
│  │  inference time. No weight changes. Fast.    │ │
│  │                                              │ │
│  │  Fine-Tune Mode (Pro / Desktop):             │ │
│  │  Upload training pairs → model weights are   │ │
│  │  actually updated via LoRA. Slown but deeper.│ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  [🚀 Train This Model]    [💬 Try Demo Chat]     │
│                                                  │
│  ┌─ Community Versions ────────────────────────┐ │
│  │  "Medical FAQ Bot" by @dr_smith    ⭐ 4.8    │ │
│  │  "Customer Support v3" by @acme    ⭐ 4.6    │ │
│  │  "Recipe Advisor" by @chef_maria   ⭐ 4.9    │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 4. Model Catalog (Single Source of Truth)

All models live in Firestore `models/` collection. Each entry follows `schema/model.schema.json`.

### LLM Catalog

| ID | Name | Params | Size | Min RAM | Runs On | Training Mode | License |
|---|---|---|---|---|---|---|---|
| `smollm2-360m` | SmolLM2 360M | 360M | 150MB | 4GB | 📱💻☁️ | RAG + LoRA | Apache-2.0 |
| `smollm2-1.7b` | SmolLM2 1.7B | 1.7B | 900MB | 6GB | 💻☁️ | RAG + LoRA | Apache-2.0 |
| `llama-3.2-3b` | Llama 3.2 3B | 3.2B | 1.7GB | 8GB | 💻☁️ | RAG + LoRA | Llama 3.2 |
| `llama-3.2-8b` | Llama 3.2 8B | 8B | 4.5GB | 16GB | ☁️ | RAG + LoRA | Llama 3.2 |
| `qwen2.5-1.5b` | Qwen 2.5 1.5B | 1.5B | 800MB | 6GB | 💻☁️ | RAG + LoRA | Apache-2.0 |
| `phi-3-mini` | Phi-3 Mini 3.8B | 3.8B | 2.2GB | 8GB | 💻☁️ | RAG + LoRA | MIT |

### Vision Catalog (Phase 2)

| ID | Name | Task | Size | Min RAM | Runs On | License |
|---|---|---|---|---|---|---|
| `mobilenet-v3` | MobileNet V3 Small | Classification | 11MB | 2GB | 📱💻☁️ | Apache-2.0 |
| `yolov8-nano` | YOLOv8 Nano | Object Detection | 6MB | 2GB | 📱💻☁️ | AGPL-3.0 |
| `blazeface` | BlazeFace | Face Detection | 22MB | 2GB | 📱💻☁️ | Apache-2.0 |
| `vit-base` | ViT-Base/16 | Classification | 330MB | 4GB | 💻☁️ | Apache-2.0 |

### How Device Gating Works

When a user opens the Zoo:
1. Client sends device specs: `{ platform, ram_gb, storage_mb, has_webgpu, has_gpu }`
2. Backend returns models where `minRamGb <= ram_gb` AND `platform in runsOn`
3. Each model card shows a compatibility badge:
   - ✅ **Fits your Pixel 8** — can train on this device
   - ⚠️ **Needs 8GB RAM** — your device has 4GB. Upgrade or use cloud.
   - ☁️ **Cloud only** — needs 16GB+ RAM or GPU. Pro tier required.

### Catalog Schema

```json
{
  "id": "smollm2-360m",
  "name": "SmolLM2 360M",
  "task": "chat",
  "family": "smollm2",
  "params": 360000000,
  "sizeBytes": 157286400,
  "minRamGb": 4,
  "minVramGb": 0,
  "minDiskGb": 0.5,
  "runsOn": ["mobile", "desktop", "cloud"],
  "trainingModes": ["rag", "lora"],
  "trainer": "web-llm",
  "license": "Apache-2.0",
  "downloadUrl": "https://huggingface.co/...",
  "description": "A tiny but capable language model...",
  "benchmarkAccuracy": null,
  "status": "published"
}
```

---

## 5. Training Modes

### Mode 1: RAG (Retrieval-Augmented Generation)

**What it is:** The model doesn't change its weights. Instead, your documents are chunked and injected into the system prompt at inference time. The model "knows" your data because it sees it every time you ask a question.

**When to use:** Quick personalization. No GPU needed. Works on any device.

**How it works:**
```
User uploads docs (txt, csv, md, pdf)
         │
         ▼
Chunks split (600 chars, 100 overlap)
         │
         ▼
Stored in IndexedDB (on device) or Firestore (cloud)
         │
         ▼
At inference: top-K chunks injected into system prompt
         │
         ▼
LLM answers using your docs as context
```

**What the user sees:**
1. Pick a model from Zoo → "Train This Model"
2. Upload files: `.txt`, `.csv`, `.md`, `.json`, `.pdf`
3. Toddler chunks them → shows "247 chunks created from 12 files"
4. Done. Model is "trained" (instantly). Open chat to test.

**Technical details:**
- Chunk size: 600 characters
- Overlap: 100 characters
- Max chunks: 200 (on device) / 2,000 (cloud)
- Storage: IndexedDB for local, Firestore subcollection for cloud
- Retrieval: Simple cosine similarity over TF-IDF vectors (fast, no embeddings model needed)
- Injection: Chunks prepended to system prompt, newest first

### Mode 2: LoRA Fine-Tuning (Desktop / Cloud only)

**What it is:** The model's weights are actually updated using your training data via Low-Rank Adaptation. The model genuinely "learns" your patterns.

**When to use:** When RAG isn't enough — you want the model to change its behavior, not just its context.

**How it works:**
```
User uploads training pairs (prompt → completion CSV)
         │
         ▼
LoRA adapter created (rank 16, alpha 32)
         │
         ▼
Training loop runs on device GPU or cloud GPU
         │
         ▼
LoRA weights saved separately (~10-50MB)
         │
         ▼
At inference: base model + LoRA adapter merged
```

**What the user sees:**
1. Pick a model → "Fine-Tune This Model"
2. Upload CSV with columns: `prompt`, `completion`
3. Choose: epochs (1-5), learning rate (auto)
4. Training starts → progress bar with ETA
5. Done. Test in chat. Export weights if you want.

**Technical requirements:**
- Desktop: 8GB+ RAM, optional GPU (CUDA/Metal/Vulkan)
- Cloud (Pro): Any model in catalog
- Not available on mobile (too memory-intensive)
- Training time: ~5-30 min depending on dataset size and hardware

### Mode 3: Vision Transfer Learning (Phase 2)

**What it is:** A pre-trained vision model (MobileNet, YOLO) is fine-tuned on your labeled images.

**How it works:**
```
User uploads image folders (cat/, dog/, car/)
         │
         ▼
Images preprocessed (resize, normalize)
         │
         ▼
Transfer learning: last layers retrained on your labels
         │
         ▼
New classification/detection head saved
         │
         ▼
Inference: camera/gallery image → prediction
```

---

## 6. The Training Flow (End-to-End)

### Step 1: User picks a model from the Zoo

Web dashboard → clicks "Train" on SmolLM2 360M.

### Step 2: Choose training mode

```
┌─────────────────────────────────────┐
│  How do you want to train?          │
│                                     │
│  ┌───────────────┐ ┌──────────────┐│
│  │ 📄 RAG Mode   │ │ 🔧 Fine-Tune ││
│  │               │ │              ││
│  │ Upload docs.  │ │ Upload pairs.││
│  │ Model reads   │ │ Model learns.││
│  │ them at chat  │ │ Weights are  ││
│  │ time. Instant.│ │ actually     ││
│  │               │ │ changed.     ││
│  │ Works on any  │ │ Needs GPU.   ││
│  │ device.       │ │ Desktop/Cloud││
│  │               │ │ only.        ││
│  │ [Select]      │ │ [Select]     ││
│  └───────────────┘ └──────────────┘│
└─────────────────────────────────────┘
```

### Step 3: Upload data

**RAG:** Drop files (txt, csv, md, json, pdf). Toddler chunks them.

**Fine-tune:** Drop CSV with `prompt,completion` columns. Toddler validates format.

### Step 4: Choose runner

```
┌──────────────────────────────────────────────┐
│  Where should training run?                   │
│                                              │
│  📱 Pixel 8 (4GB RAM)     ✅ RAG: instant    │
│                            ⚠️ Fine-tune: N/A  │
│                                              │
│  💻 MacBook Air (8GB)     ✅ RAG: instant    │
│                            ✅ Fine-tune: ~15m  │
│                                              │
│  ☁️ Cloud GPU (Pro)       ✅ Both             │
│                            Fine-tune: ~5m     │
│                                              │
│  [Auto-select best]  [Choose manually]       │
└──────────────────────────────────────────────┘
```

### Step 5: Training happens

- **RAG:** Instant. Progress: "Chunking documents... 247 chunks created. Done."
- **Fine-tune:** Progress bar with live metrics: "Epoch 2/5 · Loss: 0.34 · ETA: 8 min"
- **On device:** Foreground service + wake lock keeps it alive
- **On web dashboard:** Live progress via Firestore listener

### Step 6: Done → Three options

```
┌──────────────────────────────────────────────┐
│  ✅ Training Complete!                        │
│                                              │
│  SmolLM2 360M — "My Medical FAQ Bot"         │
│  Trained on 247 document chunks              │
│  Training mode: RAG                          │
│  Device: Pixel 8                             │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ 💬 Chat   │ │ 🔑 API   │ │ 🏪 Marketplace│ │
│  │          │ │          │ │              │ │
│  │ Talk to  │ │ Get your │ │ List this    │ │
│  │ your     │ │ API key. │ │ model for    │ │
│  │ model    │ │ Call from│ │ others to    │ │
│  │ right    │ │ any app. │ │ discover &   │ │
│  │ now.     │ │          │ │ use.         │ │
│  │ [Open]   │ │ [Get Key]│ │ [Publish]    │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 7. My Models (Personal Dashboard)

After training, models appear in **My Models** — the user's personal workspace.

### My Models View

```
┌─────────────────────────────────────────────────────────────┐
│  My Models (4)                          [+ Train New Model]  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Medical FAQ Bot                    Published · ⭐ 4.8   ││
│  │  SmolLM2 360M · RAG · 247 chunks                        ││
│  │  Created: Jul 15, 2026 · 2.1K marketplace uses          ││
│  │  [Chat] [API Key] [Edit Listing] [Export] [Delete]       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Customer Support Bot                 Private            ││
│  │  SmolLM2 1.7B · Fine-tune · 1.2K pairs                 ││
│  │  Created: Jul 18, 2026 · Last used: 2h ago              ││
│  │  [Chat] [API Key] [Publish] [Export] [Retrain] [Delete]  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Product Classifier                 Published · ⭐ 4.5   ││
│  │  MobileNet V3 · Transfer Learning · 15 categories       ││
│  │  Created: Jul 10, 2026 · 890 marketplace uses           ││
│  │  [Test] [API Key] [Edit Listing] [Export] [Delete]       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Per-Model Actions

| Action | What It Does |
|---|---|
| **Chat** | Opens a sandbox chat session with the model (runs on device if model is local, proxied through backend if cloud) |
| **API Key** | Shows the API key + code snippets (Python, JS, cURL) |
| **Export** | Downloads model weights + predictor script as ZIP |
| **Publish** | Lists the model on the Marketplace |
| **Retrain** | Upload new data and retrain (creates a new version) |
| **Delete** | Removes the model and all its data |

---

## 8. The Marketplace

### What It Is
A public directory where anyone can discover and use models trained by the Toddler community.

### Marketplace Browse

```
┌─────────────────────────────────────────────────────────────┐
│  🏪 Marketplace                        [Publish Your Model]  │
│                                                             │
│  🔍 Search models...     [All] [LLM] [Vision] [Trending]    │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  📂 Categories                                           ││
│  │  [Medical] [Legal] [Customer Support] [Education]        ││
│  │  [Finance] [Recipes] [Programming] [Creative Writing]     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  🔥 Trending This Week                                      │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Medical  │  │ Recipe   │  │ Legal    │  │ Python   │   │
│  │ FAQ Bot  │  │ Chef     │  │ Analyzer │  │ Helper   │   │
│  │ by @dr   │  │ by @cook │  │ by @law  │  │ by @dev  │   │
│  │ SmolLM2  │  │ Llama 3B │  │ SmolLM2  │  │ Llama 3B │   │
│  │ ⭐ 4.8   │  │ ⭐ 4.9   │  │ ⭐ 4.5   │  │ ⭐ 4.7   │   │
│  │ 2.1K uses│  │ 5.3K uses│  │ 890 uses │  │ 1.8K uses│   │
│  │          │  │          │  │          │  │          │   │
│  │ [View]   │  │ [View]   │  │ [View]   │  │ [View]   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Marketplace Model Page

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Marketplace                                      │
│                                                             │
│  Medical FAQ Bot                                            │
│  by @dr_smith · Published Jul 15, 2026                      │
│  ⭐ 4.8 (142 ratings) · 2,100 uses · 340 clones            │
│                                                             │
│  Base Model: SmolLM2 360M                                   │
│  Training Mode: RAG (247 document chunks)                   │
│  Size: 150MB base + 2MB RAG index                           │
│  Category: Medical                                          │
│                                                             │
│  "A medical FAQ chatbot trained on public health            │
│   documents. Answers common health questions with           │
│   references to source material. Not a substitute            │
│   for professional medical advice."                         │
│                                                             │
│  ┌─ Reviews ────────────────────────────────────────────┐   │
│  │  ⭐⭐⭐⭐⭐ "Exactly what I needed for my clinic" - @nurse│  │
│  │  ⭐⭐⭐⭐ "Good but could handle more languages" - @intl│   │
│  │  ⭐⭐⭐⭐⭐ "Saved me weeks of work" - @startup          │  │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  [🚀 Clone & Train]  [💬 Try Demo]  [📥 Export Weights]     │
│                                                             │
│  "Clone & Train" creates a copy in your workspace.          │
│   You can retrain it with your own data on top.             │
└─────────────────────────────────────────────────────────────┘
```

### Publishing Flow

When a user clicks "Publish" on one of their trained models:

```
┌─────────────────────────────────────────────────────────────┐
│  Publish to Marketplace                                     │
│                                                             │
│  Model: Medical FAQ Bot                                     │
│  Base: SmolLM2 360M · RAG mode                              │
│                                                             │
│  Display Name: [Medical FAQ Bot                       ]     │
│  Description:  [A medical FAQ chatbot trained on...   ]     │
│  Category:     [Medical ▼]                                  │
│  Tags:         [health] [faq] [medical] [+ add]             │
│                                                             │
│  Visibility:   (•) Public  ( ) Unlisted (link only)         │
│                                                             │
│  What gets shared:                                          │
│  ✅ RAG chunks (knowledge base)                             │
│  ✅ Model configuration                                     │
│  ✅ Demo chat access                                        │
│  ❌ Your raw training files                                  │
│                                                             │
│  [Publish to Marketplace]                                   │
└─────────────────────────────────────────────────────────────┘
```

### Marketplace Data Model (Firestore)

```
marketplace/{modelId}
  ├── creatorUid: string          # who published
  ├── creatorName: string         # display name
  ├── sourceProjectId: string     # links to users/{uid}/projects/{pid}
  ├── baseModelId: string         # "smollm2-360m"
  ├── baseModelName: string       # "SmolLM2 360M"
  ├── displayName: string         # "Medical FAQ Bot"
  ├── description: string
  ├── category: string            # "medical", "legal", etc.
  ├── tags: string[]
  ├── trainingMode: string        # "rag" | "lora" | "transfer"
  ├── visibility: string          # "public" | "unlisted"
  ├── stats:
  │   ├── uses: number
  │   ├── clones: number
  │   ├── rating: number          # avg 1-5
  │   ├── ratingCount: number
  │   └── lastUsed: timestamp
  ├── ragConfig:                  # for RAG models
  │   ├── chunkCount: number
  │   └── chunks: string[]        # the actual knowledge base
  ├── loraConfig:                 # for fine-tuned models
  │   ├── adapterUrl: string      # Cloudinary URL to LoRA weights
  │   └── trainingPairs: number
  ├── publishedAt: timestamp
  └── status: string              # "published" | "removed" | "flagged"
```

---

## 9. Chat Experience

### How Chat Works

When a user opens chat with a trained model:

**RAG Model (on device):**
```
1. Load base LLM (e.g., SmolLM2 360M via @mlc-ai/web-llm)
2. Load RAG chunks from IndexedDB
3. User types message
4. Retrieve top-5 relevant chunks (cosine similarity)
5. Construct prompt:
   [System: You are a medical FAQ assistant. Use the following context to answer.
   
   Context chunk 1: ...
   Context chunk 2: ...
   ...]
   
   [User: What are the symptoms of flu?]
6. Stream response from local LLM
7. Show response with source attribution
```

**Fine-tuned Model (on device):**
```
1. Load base LLM
2. Merge LoRA adapter weights
3. User types message
4. Stream response from merged model
```

**Cloud model (any device):**
```
1. Send message to backend /chat endpoint
2. Backend loads model, runs inference on GPU
3. Stream response back to client
```

### Chat UI

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back  │  Medical FAQ Bot  │  SmolLM2 360M  │  ⚙️ Settings│
│─────────────────────────────────────────────────────────────│
│                                                             │
│  [System: Model loaded. 247 knowledge chunks active.]        │
│                                                             │
│  USER >                                                     │
│  What are the early symptoms of diabetes?                   │
│                                                             │
│  TODDLER >                                                  │
│  Based on the medical documentation, early symptoms of      │
│  diabetes include:                                          │
│                                                             │
│  1. **Increased thirst** (polydipsia)                       │
│  2. **Frequent urination** (polyuria)                       │
│  3. **Unexplained weight loss**                             │
│  4. **Fatigue**                                             │
│  5. **Blurred vision**                                      │
│                                                             │
│  📎 Source: health_faq_chunk_042 (confidence: 94%)           │
│                                                             │
│  ─────────────────────────────────────────────              │
│                                                             │
│  USER >                                                     │
│  How is it diagnosed?                                       │
│                                                             │
│  TODDLER >                                                  │
│  ▌                                                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Type a message...                           [Send ▲] │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Backend Architecture

### Current Backend (FastAPI)

The backend serves as the **control plane** — it never runs training itself.

#### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/models` | Full model catalog |
| `GET` | `/models/recommended` | Hardware-filtered catalog |
| `POST` | `/train` | Queue a training job |
| `POST` | `/jobs/claim` | BYOC device claims a job |
| `POST` | `/jobs/{id}/progress` | Update job progress |
| `POST` | `/jobs/{id}/complete` | Mark job done, save artifact |
| `POST` | `/jobs/{id}/fail` | Mark job failed |
| `POST` | `/chat` | Proxy chat inference (cloud models) |
| `POST` | `/predict` | Single prediction (legacy, redirects to /chat) |
| `GET` | `/projects` | List user's projects |
| `GET` | `/projects/{id}` | Project detail |
| `POST` | `/projects` | Create project |
| `DELETE` | `/projects/{id}` | Delete project |
| `POST` | `/marketplace/publish` | Publish model to marketplace |
| `GET` | `/marketplace` | Browse marketplace |
| `GET` | `/marketplace/{id}` | Marketplace model detail |
| `POST` | `/marketplace/{id}/clone` | Clone a marketplace model |
| `POST` | `/marketplace/{id}/rate` | Rate a marketplace model |
| `GET` | `/devices` | List user's devices |
| `POST` | `/devices/register` | Register a new device |
| `POST` | `/devices/heartbeat` | Device heartbeat |
| `POST` | `/uploads/sign` | Sign Cloudinary upload |
| `POST` | `/datasets` | Create dataset metadata |
| `GET` | `/datasets` | List datasets |
| `DELETE` | `/account` | Delete user account |

#### Training Job Flow

```
1. User clicks "Train" on web/mobile
2. Frontend: POST /train { modelId, trainingMode, datasetRef, runner }
3. Backend: Creates Firestore doc in training_jobs/
4. Backend: Dispatches FCM silent push to user's online devices
5. Device wakes up → BYOC worker → POST /jobs/claim
6. Device downloads dataset → trains locally
7. Device: POST /jobs/progress every 30s
8. Device: POST /jobs/complete with artifact URL
9. Backend: Updates project doc with trained model metadata
10. Frontend: Firestore listener fires → notification sent
```

---

## 11. Firestore Schema

```
users/{uid}
  ├── email: string
  ├── displayName: string
  ├── photoURL: string
  ├── plan: "free" | "pro"
  ├── createdAt: timestamp
  └── (subcollections)
      ├── projects/{pid}
      │   ├── name: string
      │   ├── baseModelId: string          # "smollm2-360m"
      │   ├── baseModelName: string        # "SmolLM2 360M"
      │   ├── trainingMode: "rag" | "lora" | "transfer"
      │   ├── status: "queued" | "training" | "trained" | "failed"
      │   ├── progress: number             # 0-100
      │   ├── accuracy: number | null
      │   ├── device: string               # "Pixel 8" / "MacBook" / "Cloud"
      │   ├── api_key: string              # tdlr_live_...
      │   ├── ragConfig:
      │   │   ├── chunkCount: number
      │   │   └── chunks: string[]         # RAG knowledge base
      │   ├── loraConfig:
      │   │   ├── adapterUrl: string       # Cloudinary URL
      │   │   ├── trainingPairs: number
      │   │   └── epochs: number
      │   ├── marketplaceListing: string | null  # marketplace/{modelId}
      │   ├── createdAt: timestamp
      │   ├── trainedAt: timestamp | null
      │   └── version: number
      │
      ├── devices/{did}
      │   ├── platform: "android" | "desktop" | "ios"
      │   ├── name: string                 # "Pixel 8" / "MacBook Air"
      │   ├── os: string
      │   ├── ramGb: number
      │   ├── storageMb: number
      │   ├── hasGpu: boolean
      │   ├── gpuName: string | null
      │   ├── fcmToken: string | null
      │   ├── status: "online" | "offline" | "training"
      │   ├── currentJobId: string | null
      │   ├── byocEnabled: boolean
      │   ├── lastSeen: timestamp
      │   └── registeredAt: timestamp
      │
      └── datasets/{did}
          ├── name: string
          ├── format: "csv" | "txt" | "md" | "json" | "pdf" | "images"
          ├── sizeBytes: number
          ├── url: string                  # Cloudinary URL
          ├── chunkCount: number | null
          ├── rowCount: number | null
          └── createdAt: timestamp

training_jobs/{jid}
  ├── project_id: string
  ├── ownerUid: string
  ├── modelId: string                     # base model from catalog
  ├── trainingMode: "rag" | "lora" | "transfer"
  ├── runner: "auto" | "device_mobile" | "device_desktop" | "cloud"
  ├── status: "queued" | "claimed" | "training" | "uploading" | "completed" | "failed"
  ├── progress: number                    # 0-100
  ├── claimedBy: string | null            # device ID
  ├── device: string | null               # "Pixel 8"
  ├── error: string | null
  ├── createdAt: timestamp
  ├── claimedAt: timestamp | null
  └── completedAt: timestamp | null

models/{mid}                              # Canonical model catalog
  ├── (follows schema/model.schema.json)
  └── status: "published" | "draft"

marketplace/{mid}                         # User-published models
  ├── (follows marketplace schema from §8)
  └── status: "published" | "removed" | "flagged"

reviews/{rid}                             # Marketplace reviews
  ├── modelId: string
  ├── userId: string
  ├── userName: string
  ├── rating: number                      # 1-5
  ├── text: string
  └── createdAt: timestamp
```

---

## 12. Web App Structure (React)

### Routes

| Route | Component | Auth? |
|---|---|---|
| `/` | LandingPage | No |
| `/login` | Auth (login) | No |
| `/signup` | Auth (signup) | No |
| `/zoo` | ModelZoo (browse catalog) | Yes |
| `/zoo/:modelId` | ModelDetail | Yes |
| `/zoo/:modelId/train` | TrainWizard | Yes |
| `/models` | MyModels (user's trained models) | Yes |
| `/models/:projectId` | ModelWorkspace (chat + API + settings) | Yes |
| `/marketplace` | MarketplaceBrowse | No |
| `/marketplace/:modelId` | MarketplaceDetail | No |
| `/devices` | DeviceManager | Yes |
| `/settings` | AccountSettings | Yes |

### Component Hierarchy

```
App
├── LandingPage (/)                    # Marketing page
├── Auth (/login, /signup)             # Login/signup/reset
└── Dashboard (/zoo, /models, etc.)    # Authenticated shell
    ├── Sidebar                        # Nav: Zoo, My Models, Marketplace, Devices
    ├── TopBar                         # User avatar, plan badge, notifications
    │
    ├── ModelZoo (/zoo)                # Browse all models
    │   ├── SearchBar
    │   ├── FilterChips                # All, LLM, Vision, Fits My Device
    │   ├── TrendingSection
    │   ├── CategoryGrid
    │   └── ModelCard[]
    │
    ├── ModelDetail (/zoo/:id)         # Single model page
    │   ├── CompatibilityBadges
    │   ├── SpecsTable
    │   ├── TrainingModeSelector        # RAG vs Fine-tune
    │   ├── CommunityVersions           # Marketplace listings
    │   └── [Train] [Try Demo]
    │
    ├── TrainWizard (/zoo/:id/train)   # Multi-step training flow
    │   ├── Step1: ChooseMode           # RAG / Fine-tune
    │   ├── Step2: UploadData           # Files or CSV
    │   ├── Step3: ChooseRunner         # Device / Cloud
    │   └── Step4: TrainingProgress     # Live progress bar
    │
    ├── MyModels (/models)             # User's trained models
    │   ├── ModelCard[]                 # Name, base model, status, actions
    │   └── [Train New Model] button
    │
    ├── ModelWorkspace (/models/:id)   # Single trained model
    │   ├── ChatPanel                   # Sandbox chat
    │   ├── APIPanel                    # Key + code snippets
    │   ├── MarketplacePanel            # Publish/edit listing
    │   ├── ExportPanel                 # Download weights
    │   └── SettingsPanel               # Rename, retrain, delete
    │
    ├── MarketplaceBrowse (/marketplace)
    │   ├── SearchBar
    │   ├── CategoryFilter
    │   ├── TrendingModels
    │   └── ModelCard[]                 # Rating, uses, clone button
    │
    ├── MarketplaceDetail (/marketplace/:id)
    │   ├── Description
    │   ├── Reviews
    │   ├── [Clone & Train] [Try Demo] [Export]
    │   └── CreatorInfo
    │
    ├── DeviceManager (/devices)
    │   ├── DeviceCard[]                # Platform, RAM, status, BYOC toggle
    │   └── PairNewDevice               # QR code + pairing code
    │
    └── AccountSettings (/settings)
        ├── Profile
        ├── Plan (Free / Pro)
        └── Delete Account
```

---

## 13. Mobile App Structure

### Bottom Tabs

| Tab | Icon | Purpose |
|---|---|---|
| **Zoo** | 🔍 | Browse models filtered for your device |
| **My AI** | 🧠 | Your trained models + chat |
| **Train** | ⚡ | Active/recent training jobs |
| **Profile** | 👤 | Account, device stats, settings |

### Mobile-Specific Behavior

- **Zoo** only shows models tagged `runsOn: ["mobile"]` that fit the device's RAM
- **Training** runs in a Web Worker + native foreground service (wake lock)
- **Chat** runs entirely on-device via `@mlc-ai/web-llm` (after model is downloaded)
- **RAG chunks** stored in IndexedDB (up to 200 chunks on mobile)
- **Downloads** are resumable via HTTP range requests
- **Push notifications** wake the app when a training job is queued

### Mobile Chat (LLM)

The mobile chat is the flagship experience. After training a model via RAG:

1. User opens "My AI" → taps "Medical FAQ Bot"
2. Toddler loads SmolLM2 360M via web-llm (if not cached, shows download progress)
3. RAG chunks loaded from IndexedDB
4. User types a question
5. Top-5 chunks retrieved, injected into system prompt
6. LLM streams response token by token
7. Response shows with source attribution

**This is 100% offline after the model is downloaded.** No server calls. Pure on-device AI.

---

## 14. Design System

### Brand

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#14130F` | Page background |
| `--surface` | `#1D1B16` | Cards, panels |
| `--surface-2` | `#26231C` | Raised elements, inputs |
| `--line` | `#38352B` | Borders, dividers |
| `--text` | `#F2EFE6` | Primary text |
| `--text-dim` | `#A8A296` | Secondary text |
| `--text-faint` | `#6E695C` | Captions, disabled |
| `--accent-lime` | `#C6FF33` | CTAs, success, active |
| `--accent-purple` | `#7D39EB` | Training, in-progress |
| `--danger` | `#FF5C3E` | Errors, destructive |

### Typography

- **Headings:** Space Grotesk (bold)
- **Body:** Inter
- **Mono/Metadata:** IBM Plex Mono

### Status Colors

- 🟢 Lime = ready / online / trained / published
- 🟣 Purple = training / queued / downloading
- 🔴 Red/Orange = failed / error / destructive
- ⚪ Dim = idle / offline / disabled

---

## 15. Implementation Roadmap

### Phase 1 — Foundation (Weeks 1-2)

**Goal:** Zoo → RAG training → Chat working end-to-end on web + mobile.

- [ ] Rewrite `src/App.jsx` with new routes (Zoo, MyModels, Marketplace, etc.)
- [ ] Build `ModelZoo` component — fetch from `/models`, display cards, filter by device
- [ ] Build `ModelDetail` page — specs, compatibility, "Train" button
- [ ] Build `TrainWizard` — RAG mode only: file upload → chunking → done
- [ ] Rewrite backend `/models` endpoint — serve from Firestore catalog (seed initial catalog)
- [ ] Implement RAG chunking pipeline (client-side for device, server-side for cloud)
- [ ] Wire up `@mlc-ai/web-llm` for on-device LLM inference (SmolLM2 360M)
- [ ] Build `ChatPanel` — streaming LLM chat with RAG context injection
- [ ] Build `MyModels` view — list user's trained models
- [ ] Update MobileDashboard with new tabs (Zoo / My AI / Train / Profile)
- [ ] Seed Firestore `models/` collection with LLM catalog (6 models)
- [ ] Fix `/predict` → rename to `/chat`, proxy to cloud LLM for cloud-trained models
- [ ] Remove all text classifier code (Dashboard.jsx handlePredict, handleBatchPredict, etc.)

### Phase 2 — Marketplace (Weeks 3-4)

**Goal:** Users can publish trained models and others can discover + clone them.

- [ ] Build `MarketplaceBrowse` — public listing with search, categories, trending
- [ ] Build `MarketplaceDetail` — model page with reviews, clone button
- [ ] Implement `/marketplace/publish` — snapshot RAG chunks + config into marketplace doc
- [ ] Implement `/marketplace/{id}/clone` — copy marketplace model into user's projects
- [ ] Build publish flow UI (name, description, category, tags, visibility)
- [ ] Build review/rating system
- [ ] Add marketplace section to ModelZoo (community models)
- [ ] Add "Trending" algorithm (uses + clones + recency)
- [ ] Landing page update: showcase marketplace models

### Phase 3 — Fine-Tuning + Desktop (Weeks 5-8)

**Goal:** LoRA fine-tuning on desktop. Larger models. Device pairing.

- [ ] Implement LoRA training pipeline (desktop agent, Rust sidecar or Python)
- [ ] Build desktop Tauri app — pairing, hardware audit, menu-bar status
- [ ] Add fine-tune training wizard (upload prompt/completion CSV, choose epochs)
- [ ] Add SmolLM2 1.7B and Llama 3.2 3B to desktop catalog
- [ ] Implement device pairing (QR code / 6-digit code)
- [ ] Device manager page — list devices, rename, BYOC toggle, remove
- [ ] Push notifications for training jobs (FCM)
- [ ] Pro upsell when model doesn't fit any device

### Phase 4 — Cloud + Pro (Weeks 9-12)

**Goal:** Cloud GPU training for Pro users. Stripe billing.

- [ ] Stripe Checkout integration (Pro plan $49/mo)
- [ ] Cloud GPU worker (Modal or RunPod)
- [ ] Cloud training job router (auto → cloud when no device fits)
- [ ] Credit metering for cloud jobs
- [ ] Billing page (plan, usage, invoices)
- [ ] Llama 3.2 8B cloud-only catalog entry
- [ ] Cloud inference proxy for hosted models

### Phase 5 — Vision Models (Weeks 13-16)

**Goal:** Image classification, object detection, face recognition.

- [ ] Add vision models to catalog (MobileNet, YOLO, BlazeFace)
- [ ] Vision training wizard (folder upload → transfer learning)
- [ ] Vision chat UI (camera/gallery → prediction)
- [ ] Vision marketplace (publish/clone vision models)
- [ ] Mobile camera integration for real-time classification

### Phase 6 — Polish + Scale (Weeks 17-20)

- [ ] Rate limiting on all endpoints
- [ ] Structured logging + error reporting (Sentry)
- [ ] PWA manifest (install web app)
- [ ] iOS build via Capacitor
- [ ] Model versioning (retrain → new version → promote to production)
- [ ] Webhooks per model (fire on prediction thresholds)
- [ ] Team workspaces (v2)
- [ ] CLI tool (`npx toddler train`)

---

## 16. Files to Rewrite

The following files need to be rewritten from scratch or heavily modified:

| File | Action | Notes |
|---|---|---|
| `src/App.jsx` | **Rewrite** | New routes for Zoo, MyModels, Marketplace |
| `src/Dashboard.jsx` | **Delete** | Replaced by Zoo + MyModels + ModelWorkspace |
| `src/MobileDashboard.jsx` | **Rewrite** | New tabs: Zoo / My AI / Train / Profile |
| `src/Onboarding.jsx` | **Rewrite** | Becomes TrainWizard (RAG + Fine-tune modes) |
| `src/LandingPage.jsx` | **Update** | Add marketplace showcase, update copy |
| `src/Auth.jsx` | **Keep** | Works fine, minor tweaks |
| `src/firebase.js` | **Keep** | Works fine |
| `src/cloud.js` | **Keep** | Signed upload works |
| `src/nativeBridge.js` | **Keep** | Wake lock + audio keepalive works |
| `src/notify.js` | **Keep** | Local notifications work |
| `src/env.js` | **Keep** | Works fine |
| `backend/main.py` | **Rewrite** | New endpoints for zoo, marketplace, chat |
| `backend/agent.py` | **Rewrite** | RAG chunking + LoRA training instead of sklearn |
| `backend/inference_service/main.py` | **Rewrite** | LLM inference proxy |
| `public/byoc-worker.js` | **Update** | New training flow (RAG + LoRA) |
| `public/widget.js` | **Update** | Chat widget for marketplace models |
| `schema/model.schema.json` | **Update** | Add trainingModes, marketplace fields |
| `package.json` | **Update** | Add @mlc-ai/web-llm, @huggingface/transformers |

### Files to Keep As-Is

| File | Reason |
|---|---|
| `android/app/src/main/java/ai/toddler/app/*` | Native services work, just need new training payloads |
| `.github/workflows/android.yml` | CI pipeline works |
| `capacitor.config.json` | App config works |
| `vite.config.js` | Build config works |
| `vercel.json` | SPA routing works |
| `firestore.indexes.json` | Indexes work (may need additions) |
| `render.yaml` | Deployment config works |

---

## 17. Key Technical Decisions

### LLM Runtime: `@mlc-ai/web-llm`
- Runs SmolLM2, Llama, Phi entirely in the browser via WebGPU
- No server needed for inference
- 6MB initial bundle, model weights downloaded separately
- Streaming completions with `onChunk` callback
- Memory management: KV cache reset after each response

### RAG Storage: IndexedDB (local) + Firestore (cloud)
- Chunks stored as strings in IndexedDB on device
- Synced to Firestore for cloud inference
- Retrieval: TF-IDF cosine similarity (fast, no embedding model needed)
- Max 200 chunks on mobile, 2000 on desktop/cloud

### LoRA Training: TBD
- Desktop: Python sidecar with `peft` library
- Cloud: Modal/RunPod GPU worker with `peft`
- Adapter weights: ~10-50MB, stored separately from base model
- At inference: base model + adapter merged on-the-fly

### Model Storage
- Base models: Cached by web-llm in IndexedDB (browser) or downloaded to filesystem (desktop)
- Trained artifacts: RAG chunks in Firestore, LoRA adapters in Cloudinary
- Marketplace snapshots: Copied to marketplace Firestore collection

---

## 18. Security Considerations

| Area | Approach |
|---|---|
| **Auth** | Firebase Auth (email + Google) |
| **API keys** | Per-model `tdlr_live_...` keys, verified server-side |
| **CORS** | Explicit origins only (no wildcard) |
| **Rate limiting** | SlowAPI on all endpoints (60 req/min default) |
| **Model access** | RAG chunks only shared when model is published (user opts in) |
| **Marketplace moderation** | Flag system + manual review for v1 |
| **Data privacy** | Device training = data never leaves the device. Cloud training = data encrypted in transit + at rest |
| **Firebase config** | No dummy defaults. App crashes if config is missing |

---

*This is the new Toddler. No text classifiers. No CSV column mapping. Just: browse the Zoo, pick a model, train it on your data, and put it up for sale. Users are limited only by their device.*
