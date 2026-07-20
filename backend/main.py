import os
import io
import base64
import json
import secrets
import string
import re
import zipfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore, messaging

app = FastAPI(title="Toddler API", version="2.0")

# ─── CORS ─────────────────────────────────────────────────────────

_cors_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost,http://localhost:5173,http://localhost:4173,"
    "capacitor://localhost,https://toddler.ai,https://toddler-53xb.onrender.com"
)
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
if "*" in _cors_origins:
    raise RuntimeError("CORS_ORIGINS must list explicit origins; wildcard is forbidden")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Firebase ─────────────────────────────────────────────────────

db = None
try:
    if not firebase_admin._apps:
        cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if cred_json:
            cred = credentials.Certificate(json.loads(cred_json))
            firebase_admin.initialize_app(cred)
        else:
            try:
                firebase_admin.initialize_app()
            except Exception:
                pass
    db = firestore.client()
except Exception as e:
    print(f"Firebase Admin Warning: {e}")
    db = None


def _require_db():
    if db is None:
        raise HTTPException(status_code=503, detail="Firestore is not configured")
    return db


def generate_api_key():
    prefix = "tdlr_live_"
    chars = string.ascii_letters + string.digits
    return prefix + "".join(secrets.choice(chars) for _ in range(32))


def scrub_pii(text):
    text = re.sub(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "[EMAIL_REDACTED]", text)
    text = re.sub(r"\+?\d{10,12}", "[PHONE_REDACTED]", text)
    return text


# ─── Auth helpers ─────────────────────────────────────────────────

def verify_bearer_token(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Firebase bearer token required")
    if not firebase_admin._apps:
        raise HTTPException(status_code=503, detail="Firebase Admin is not configured")
    try:
        from firebase_admin import auth as fb_auth
        return fb_auth.verify_id_token(authorization[7:])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")


def _resolve_project(project_id: str, x_api_key: str | None = None, authorization: str | None = None):
    """Resolve a project by ID. Supports both bearer token and API key auth."""
    database = _require_db()

    # Try API key auth first
    if x_api_key:
        doc = database.collection("projects").document(project_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        data = doc.to_dict()
        if data.get("api_key") != x_api_key:
            raise HTTPException(status_code=403, detail="Invalid API key")
        return data, doc

    # Bearer token auth
    user = verify_bearer_token(authorization)
    doc = database.collection("projects").document(project_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Project not found")
    data = doc.to_dict()
    if data.get("ownerUid") != user["uid"]:
        raise HTTPException(status_code=403, detail="Not your project")
    return data, doc


# ─── Health ───────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "ok", "service": "toddler-control-plane"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ─── Model Catalog ────────────────────────────────────────────────

MODEL_CATALOG = [
    {
        "id": "smollm2-360m", "name": "SmolLM2 360M", "task": "chat",
        "family": "smollm2", "params": 360000000, "sizeMb": 150, "minRamGb": 4,
        "runsOn": ["mobile", "desktop", "cloud"], "trainingModes": ["rag", "lora"],
        "license": "Apache-2.0", "trainer": "web-llm",
        "description": "Tiny but capable language model by Hugging Face. Runs on phones with 4GB+ RAM.",
    },
    {
        "id": "smollm2-1.7b", "name": "SmolLM2 1.7B", "task": "chat",
        "family": "smollm2", "params": 1700000000, "sizeMb": 900, "minRamGb": 6,
        "runsOn": ["desktop", "cloud"], "trainingModes": ["rag", "lora"],
        "license": "Apache-2.0", "trainer": "web-llm",
        "description": "Mid-size model. Great balance of speed and capability. Desktop and cloud only.",
    },
    {
        "id": "llama-3.2-3b", "name": "Llama 3.2 3B", "task": "chat",
        "family": "llama", "params": 3200000000, "sizeMb": 1700, "minRamGb": 8,
        "runsOn": ["desktop", "cloud"], "trainingModes": ["rag", "lora"],
        "license": "Llama 3.2", "trainer": "web-llm",
        "description": "Code-capable language model. Handles complex reasoning and coding tasks. Desktop only.",
    },
    {
        "id": "qwen2.5-1.5b", "name": "Qwen 2.5 1.5B", "task": "chat",
        "family": "qwen", "params": 1500000000, "sizeMb": 800, "minRamGb": 6,
        "runsOn": ["desktop", "cloud"], "trainingModes": ["rag", "lora"],
        "license": "Apache-2.0", "trainer": "web-llm",
        "description": "Strong multilingual model from Alibaba. Excellent for Asian language tasks.",
    },
    {
        "id": "phi-3-mini", "name": "Phi-3 Mini 3.8B", "task": "chat",
        "family": "phi", "params": 3800000000, "sizeMb": 2200, "minRamGb": 8,
        "runsOn": ["desktop", "cloud"], "trainingModes": ["rag", "lora"],
        "license": "MIT", "trainer": "web-llm",
        "description": "Microsoft's small-but-mighty model. Excellent reasoning for its size.",
    },
    {
        "id": "mobilenet-v3", "name": "MobileNet V3 Small", "task": "classification",
        "family": "mobilenet", "sizeMb": 11, "minRamGb": 2,
        "runsOn": ["mobile", "desktop", "cloud"], "trainingModes": ["transfer"],
        "license": "Apache-2.0", "trainer": "tfjs",
        "description": "Lightweight image classification. Train on your own image categories.",
    },
]


@app.get("/models")
def list_models(platform: str = "web", ram_gb: float = 16):
    """Model catalog filtered by device capability."""
    # Try Firestore first
    if db:
        try:
            docs = db.collection("models").where("status", "==", "published").get()
            models = [d.to_dict() for d in docs]
            if models:
                filtered = [
                    m for m in models
                    if m.get("minRamGb", 0) <= ram_gb
                    and platform in m.get("runsOn", ["web", "mobile", "desktop", "cloud"])
                ]
                return {"models": filtered}
        except Exception:
            pass
    # Fallback to seed catalog
    return {"models": MODEL_CATALOG}


# ─── Chat / Predict ───────────────────────────────────────────────

@app.post("/chat")
async def chat_proxy(
    project_id: str = Form(...),
    text: str = Form(...),
    authorization: str | None = Header(default=None),
):
    """Proxy chat. Retrieves RAG context from Firestore."""
    user = verify_bearer_token(authorization)
    database = _require_db()

    doc = database.collection("projects").document(project_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Project not found")
    data = doc.to_dict()
    if data.get("ownerUid") != user["uid"]:
        raise HTTPException(status_code=403, detail="Not your project")
    if data.get("status") != "trained":
        raise HTTPException(status_code=400, detail="Model is not trained yet")

    sources = []
    rag_context = ""
    if data.get("trainingMode") == "rag":
        chunks = data.get("ragChunks", [])
        if chunks:
            query_words = set(text.lower().split())
            scored = []
            for chunk in chunks:
                chunk_words = set(chunk.get("text", "").lower().split())
                overlap = len(query_words & chunk_words)
                scored.append((overlap, chunk))
            scored.sort(key=lambda x: -x[0])
            for _, chunk in scored[:5]:
                sources.append({
                    "source": chunk.get("source", "unknown"),
                    "chunkIndex": chunk.get("index", 0),
                    "preview": chunk.get("text", "")[:100],
                })
            rag_context = "\n\n".join(c.get("text", "") for _, c in scored[:5])
        else:
            count = data.get("chunkCount", 0)
            sources = [{"source": f"dataset_{i}", "chunkIndex": i} for i in range(min(3, count))]

    if rag_context:
        response_text = (
            f"[RAG Context Retrieved — {len(sources)} chunks]\n\n"
            "The model found relevant information in your knowledge base. "
            "To get an AI-generated answer, open the Toddler app on your phone or desktop.\n\n"
            "Relevant sources:\n" + "\n".join(f"• {s['source']} (chunk {s['chunkIndex']})" for s in sources)
        )
    else:
        response_text = (
            "No relevant chunks found. The model may need more training data, "
            "or try rephrasing your question."
        )

    return {
        "response": response_text,
        "sources": sources,
        "latency_ms": 12,
        "mode": "rag_context_only",
    }


@app.post("/predict")
async def predict(
    project_id: str = Form(...),
    text: str = Form(None),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    """Predict via API key auth. Retrieves RAG context."""
    data, doc = _resolve_project(project_id, x_api_key=x_api_key)
    if data.get("status") != "trained":
        raise HTTPException(status_code=400, detail="Model is not trained yet")

    sources = []
    if data.get("trainingMode") == "rag":
        chunks = data.get("ragChunks", [])
        count = data.get("chunkCount", 0)
        if chunks:
            query_words = set((text or "").lower().split())
            scored = [(len(query_words & set(c.get("text", "").lower().split())), c) for c in chunks]
            scored.sort(key=lambda x: -x[0])
            for _, chunk in scored[:5]:
                sources.append({"source": chunk.get("source", "unknown"), "chunkIndex": chunk.get("index", 0)})
        else:
            sources = [{"source": f"dataset_{i}", "chunkIndex": i} for i in range(min(3, count))]

    return {
        "prediction": "See sources below. Full LLM inference runs on-device.",
        "sources": sources,
        "confidence": 0.0,
    }


@app.post("/batch")
async def batch_predict(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    text_column: str = Form(...),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    raise HTTPException(status_code=501, detail="Batch inference not available yet.")


# ─── Export / Download ────────────────────────────────────────────

@app.get("/projects/{project_id}/export")
async def export_project(
    project_id: str,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
):
    try:
        data, doc = _resolve_project(project_id, x_api_key=x_api_key, authorization=authorization)
        resolved_id = doc.id

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zf:
            json_b64 = data.get("model_artifact_json")
            if json_b64:
                artifact = json.loads(base64.b64decode(json_b64).decode("utf-8"))
                zf.writestr("model.json", json.dumps(artifact, indent=2))
                readme = f"# {data.get('name')}\n\nOn-device Bayes model.\n"
            else:
                model_b64 = data.get("model_artifact")
                if not model_b64:
                    raise HTTPException(status_code=400, detail="Model artifact missing.")
                zf.writestr("model.pkl", base64.b64decode(model_b64))
                readme = f"# {data.get('name')}\n\nRequires: pip install scikit-learn pandas\n"
            zf.writestr("README.md", readme)

        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/x-zip-compressed",
            headers={"Content-Disposition": f"attachment; filename=toddler_{resolved_id}.zip"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/projects/{project_id}/download")
async def download_model(
    project_id: str,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
):
    try:
        data, doc = _resolve_project(project_id, x_api_key=x_api_key, authorization=authorization)
        resolved_id = doc.id
        json_b64 = data.get("model_artifact_json")
        if json_b64:
            body = json.dumps(json.loads(base64.b64decode(json_b64).decode("utf-8")), indent=2).encode("utf-8")
            return Response(content=body, media_type="application/json",
                            headers={"Content-Disposition": f"attachment; filename=model_{resolved_id}.json"})
        model_b64 = data.get("model_artifact")
        if not model_b64:
            raise HTTPException(status_code=400, detail="Model artifact missing.")
        return Response(content=base64.b64decode(model_b64), media_type="application/octet-stream",
                        headers={"Content-Disposition": f"attachment; filename=model_{resolved_id}.pkl"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Datasets ─────────────────────────────────────────────────────

@app.post("/datasets")
async def create_dataset(payload: dict, authorization: str | None = Header(default=None)):
    user = verify_bearer_token(authorization)
    database = _require_db()
    required = ("name", "publicId", "secureUrl", "bytes", "format")
    if any(not payload.get(key) for key in required):
        raise HTTPException(status_code=400, detail="Dataset metadata is incomplete")
    data = {
        "ownerUid": user["uid"], "name": payload["name"],
        "cloudinaryPublicId": payload["publicId"], "secureUrl": payload["secureUrl"],
        "sizeBytes": payload["bytes"], "format": payload["format"],
        "status": "ready", "createdAt": firestore.SERVER_TIMESTAMP,
    }
    ref = database.collection("users").document(user["uid"]).collection("datasets").document()
    ref.set(data)
    return {"id": ref.id, "dataset": {**data, "createdAt": None}}


@app.get("/datasets")
def list_datasets(authorization: str | None = Header(default=None)):
    user = verify_bearer_token(authorization)
    database = _require_db()
    rows = []
    for doc in database.collection("users").document(user["uid"]).collection("datasets").stream():
        item = doc.to_dict()
        item["id"] = doc.id
        rows.append(item)
    return {"datasets": rows}


# ─── Uploads ──────────────────────────────────────────────────────

@app.post("/uploads/sign")
def sign_cloudinary_upload(resource_type: str = "raw", authorization: str | None = Header(default=None)):
    user = verify_bearer_token(authorization)
    import cloudinary
    import cloudinary.utils
    import time

    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
    )
    timestamp = int(time.time())
    folder = f"toddler/datasets/{user['uid']}"
    preset = os.getenv("CLOUDINARY_SIGNED_UPLOAD_PRESET")
    params = {"timestamp": timestamp, "folder": folder}
    if preset:
        params["upload_preset"] = preset
    return {
        "timestamp": timestamp,
        "signature": cloudinary.utils.api_sign_request(params, os.environ["CLOUDINARY_API_SECRET"]),
        "apiKey": os.environ["CLOUDINARY_API_KEY"],
        "cloudName": os.environ["CLOUDINARY_CLOUD_NAME"],
        "folder": folder,
        "uploadPreset": preset,
    }


# ─── Train ────────────────────────────────────────────────────────

@app.post("/train")
async def queue_training_job(
    project_id: str = Form(...),
    dataset_url: str = Form(...),
    model_id: str = Form(None),
    training_mode: str = Form("rag"),
    runner: str = Form("auto"),
    text_column: str = Form(None),
    label_column: str = Form(None),
    authorization: str | None = Header(default=None),
):
    database = _require_db()
    verify_bearer_token(authorization)

    doc_ref = database.collection("projects").document(project_id)
    doc_snap = doc_ref.get()
    if not doc_snap.exists:
        raise HTTPException(status_code=404, detail="Project not found")

    doc_ref.update({
        "status": "queued",
        "datasetUrl": dataset_url,
        "datasetConfig": {"textColumn": text_column, "labelColumn": label_column},
    })

    job_ref = database.collection("training_jobs").document()
    job_ref.set({
        "project_id": project_id,
        "dataset_url": dataset_url,
        "model_id": model_id,
        "training_mode": training_mode,
        "runner": runner,
        "status": "queued",
        "progress": 0,
        "created_at": firestore.SERVER_TIMESTAMP,
    })

    # FCM wake-up
    try:
        owner = doc_snap.to_dict().get("ownerUid")
        if owner:
            devices = database.collection("users").document(owner).collection("devices").where("status", "==", "online").get()
            tokens = [d.to_dict().get("fcmToken") for d in devices if d.to_dict().get("fcmToken")]
            if tokens:
                messaging.send_multicast(messaging.MulticastMessage(
                    data={"action": "WAKE_WORKER", "job_id": job_ref.id, "project_id": project_id},
                    tokens=tokens,
                ))
    except Exception as e:
        print(f"FCM Dispatch Error: {e}")

    return {"job_id": job_ref.id, "status": "queued"}


# ─── Projects ─────────────────────────────────────────────────────

@app.delete("/projects/{project_id}")
def delete_project(project_id: str, authorization: str | None = Header(default=None)):
    user = verify_bearer_token(authorization)
    database = _require_db()
    ref = database.collection("projects").document(project_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("ownerUid") != user["uid"]:
        raise HTTPException(status_code=404, detail="Project not found")
    ref.delete()
    return {"status": "deleted", "project_id": project_id}


@app.delete("/account")
def delete_account(authorization: str | None = Header(default=None)):
    user = verify_bearer_token(authorization)
    try:
        from firebase_admin import auth as fb_auth
        fb_auth.delete_user(user["uid"])
        return {"status": "deleted"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Account deletion failed: {exc}")
