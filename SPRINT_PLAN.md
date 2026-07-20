# Toddler — 3-Day Sprint Plan

**Goal:** Working demo where a user uploads documents, trains a model via RAG, and chats with an AI that knows their data — on web AND Android.

**The "wow" moment:** "I uploaded my medical docs and now my phone is answering health questions offline. No cloud. My data never left my device."

---

## Day 1 — Foundation + Zoo + Train Wizard

### Morning (4h): Clean slate + routes + components
- [ ] Rewrite `src/App.jsx` — new routes: `/zoo`, `/zoo/:id`, `/zoo/:id/train`, `/models`, `/models/:id`
- [ ] Create component files (empty shells):
  - `src/Zoo.jsx` — model catalog grid
  - `src/ModelDetail.jsx` — single model page
  - `src/TrainWizard.jsx` — RAG training flow
  - `src/MyModels.jsx` — user's trained models
  - `src/ChatPanel.jsx` — streaming chat with RAG
- [ ] Update sidebar navigation (Zoo / My Models / Marketplace / Devices)
- [ ] Remove old Dashboard.jsx references

### Afternoon (4h): Model Zoo + Backend catalog
- [ ] Seed Firestore `models/` collection with LLM catalog (6 models)
- [ ] Update backend `/models` endpoint to read from Firestore
- [ ] Build `Zoo.jsx` — fetch models, display cards with filter chips
- [ ] Build `ModelDetail.jsx` — specs, compatibility, "Train" button
- [ ] Test: Zoo loads models from backend, cards render correctly

---

## Day 2 — RAG + Chat (THE WOW DAY)

### Morning (4h): Web-LLM + RAG pipeline
- [ ] Install `@mlc-ai/web-llm` + `@huggingface/transformers` (for tokenization)
- [ ] Create `src/llm.js` — web-llm wrapper (load model, stream completions)
- [ ] Create `src/rag.js` — chunking pipeline (split docs, TF-IDF retrieval, context injection)
- [ ] Build `TrainWizard.jsx` — file upload → chunking → "Model trained!" (RAG mode)
- [ ] Test: Upload a .txt file → chunks created → stored in IndexedDB

### Afternoon (4h): Chat with RAG
- [ ] Build `ChatPanel.jsx` — streaming chat UI
- [ ] Wire up: user message → retrieve top-5 chunks → inject into system prompt → stream LLM response
- [ ] Show source attribution (chunk filename + confidence)
- [ ] Build `MyModels.jsx` — list user's RAG-trained models
- [ ] Test end-to-end: Upload docs → train → chat → model answers correctly

---

## Day 3 — Android + Polish + Demo

### Morning (4h): Android updates
- [ ] Update `MobileDashboard.jsx` — new Zoo tab (fetch from `/models`)
- [ ] Update Chat tab — wire to web-llm + RAG (same code as web)
- [ ] Test on Android: Zoo loads, train works, chat streams on-device
- [ ] Fix any Capacitor/web-llm compatibility issues

### Afternoon (4h): Polish + demo prep
- [ ] Backend: Add `/chat` endpoint for cloud fallback
- [ ] Polish UI: loading states, error handling, empty states
- [ ] Seed 2-3 marketplace models (hardcoded, just for show)
- [ ] Test full flow on web + Android
- [ ] Build APK via CI
- [ ] Demo script ready

---

## What's IN for the demo
✅ Model Zoo (6 models, filtered by device)
✅ RAG training (upload docs → chunks → instant)
✅ On-device chat (SmolLM2 360M via web-llm)
✅ Source attribution (which chunk, what confidence)
✅ My Models (list trained models)
✅ Works on web AND Android
✅ Backend model catalog (Firestore)

## What's OUT (deferred)
❌ LoRA fine-tuning (Phase 3)
❌ Marketplace publish/clone (stubs only)
❌ Vision models (Phase 5)
❌ Cloud GPU training (Phase 4)
❌ Reviews/ratings
❌ Device pairing flow
❌ Stripe billing
