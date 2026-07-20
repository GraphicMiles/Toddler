import os
import io
import base64
import json
import secrets
import string
import re
import zipfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.responses import Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore, messaging

app = FastAPI(title="Toddler API", version="2.0")

@app.get("/")
def health():
    return {"status": "ok", "service": "toddler-control-plane"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Comma-separated list of allowed origins, e.g.
#   CORS_ORIGINS=https://toddler.ai,https://app.toddler.ai
# Defaults to "*" for local development; lock this down in production.
_cors_env = os.getenv("CORS_ORIGINS", "http://localhost,capacitor://localhost")
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

db = None
try:
    if not firebase_admin._apps:
        cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if cred_json:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
        else:
            # Use default ADC; works on GCP/Cloud Shell. Outside GCP we let
            # Firestore calls fail gracefully per-endpoint.
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
    return prefix + ''.join(secrets.choice(chars) for _ in range(32))

def scrub_pii(text):
    text = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '[EMAIL_REDACTED]', text)
    text = re.sub(r'\+?\d{10,12}', '[PHONE_REDACTED]', text)
    return text

@app.post("/predict")
async def predict(project_id: str = Form(...), text: str = Form(None), x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    raise HTTPException(status_code=501, detail="Inference moved to dedicated service (Phase 2).")

@app.post("/batch")
async def batch_predict(project_id: str = Form(...), file: UploadFile = File(...), text_column: str = Form(...), x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    raise HTTPException(status_code=501, detail="Batch inference moved to dedicated service (Phase 2).")

@app.get("/projects/{project_id}/export")
async def export_project(project_id: str, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    try:
        _, doc = _resolve_project(project_id, x_api_key)
        data = doc.to_dict()
        resolved_id = doc.id

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            json_b64 = data.get('model_artifact_json')
            if json_b64:
                artifact = json.loads(base64.b64decode(json_b64).decode('utf-8'))
                zip_file.writestr("model.json", json.dumps(artifact, indent=2))
                script = (
                    'import json, math, re, sys\n\n'
                    f'# Toddler AI - Integration Script (on-device Bayes model)\n'
                    f'# Project ID: {resolved_id}\n\n'
                    'STOPWORDS = set("the a an and or but if then of at by for with about against between into through during before after above below to from up down in out on off over under again further is am are was were be been being have has had having do does did doing i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she her hers herself it its itself they them their theirs themselves what which who whom this that these those as so than too very can will just don should now".split())\n\n'
                    'def tok(s):\n'
                    '    s = re.sub(r"[^a-z0-9\\s\']+", " ", str(s).lower())\n'
                    '    return [w for w in s.split() if len(w) > 1 and w not in STOPWORDS]\n\n'
                    'with open("model.json") as f:\n'
                    '    m = json.load(f)\n'
                    'idx = {w:i for i,w in enumerate(m["vocab"])}\n\n'
                    'def predict(text):\n'
                    '    toks = tok(text); tf = {}\n'
                    '    for w in toks:\n'
                    '        i = idx.get(w)\n'
                    '        if i is None: continue\n'
                    '        tf[i] = tf.get(i, 0) + 1\n'
                    '    vec = {}; norm = 0.0\n'
                    '    for i,c in tf.items():\n'
                    '        v = c * m["idf"][i]; vec[i] = v; norm += v*v\n'
                    '    norm = math.sqrt(norm) or 1.0\n'
                    '    for i in vec: vec[i] /= norm\n'
                    '    best, bestS = None, -1e300\n'
                    '    for c in range(len(m["classes"])):\n'
                    '        s = m["logPrior"][c]\n'
                    '        for i,v in vec.items(): s += m["logProb"][c][i] * v\n'
                    '        if s > bestS: bestS = s; best = m["classes"][c]\n'
                    '    return best\n\n'
                    'if __name__ == "__main__":\n'
                    '    if len(sys.argv) > 1: print(predict(sys.argv[1]))\n'
                    '    else: print("Usage: python toddler_run.py \'your text here\'")\n'
                )
                zip_file.writestr("toddler_run.py", script)
                readme = f"""# Toddler AI Project: {data.get('name')}

On-device Bayes model (JSON format). No dependencies beyond the Python stdlib:
`python toddler_run.py "your sample text"`
"""
            else:
                model_b64 = data.get('model_artifact')
                if not model_b64:
                    raise HTTPException(status_code=400, detail="Model artifact missing.")
                model_bytes = base64.b64decode(model_b64)
                zip_file.writestr("model.pkl", model_bytes)
                script = f'''import sys

# Toddler AI - Integration Script
# Project ID: {resolved_id}

def load_and_predict(text):
    with open('model.pkl', 'rb') as f:
        model = pickle.load(f)
    return model.predict([text])[0]

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(load_and_predict(sys.argv[1]))
    else:
        print("Usage: python toddler_run.py 'your text here'")
'''
                zip_file.writestr("toddler_run.py", script)
                readme = f"""# Toddler AI Project: {data.get('name')}

To run your model locally:
1. Install requirements: `pip install scikit-learn pandas`
2. Run the script: `python toddler_run.py "your sample text"`
"""
            zip_file.writestr("README.md", readme)

        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/x-zip-compressed",
            headers={"Content-Disposition": f"attachment; filename=toddler_export_{resolved_id}.zip"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/download")
async def download_model(project_id: str, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    try:
        _, doc = _resolve_project(project_id, x_api_key)
        data = doc.to_dict()
        resolved_id = doc.id
        json_b64 = data.get('model_artifact_json')
        if json_b64:
            artifact = json.loads(base64.b64decode(json_b64).decode('utf-8'))
            body = json.dumps(artifact, indent=2).encode('utf-8')
            return Response(
                content=body,
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=model_{resolved_id}.json"}
            )
        model_b64 = data.get('model_artifact')
        if not model_b64:
            raise HTTPException(status_code=400, detail="Model artifact missing.")
        model_bytes = base64.b64decode(model_b64)
        return Response(
            content=model_bytes,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename=model_{resolved_id}.pkl"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Seed model catalog — served until Firestore models/ collection is seeded.
MODEL_CATALOG = [
    {
        "id": "smollm2-360m", "name": "SmolLM2 360M", "task": "chat",
        "family": "smollm2", "params": 360000000, "sizeMb": 150, "minRamGb": 4,
        "runsOn": ["mobile", "desktop", "cloud"], "trainingModes": ["rag", "lora"],
        "license": "Apache-2.0", "trainer": "web-llm",
        "description": "Tiny but capable language model by Hugging Face. Runs on phones with 4GB+ RAM. Perfect for personal assistants and document chat.",
    },
    {
        "id": "smollm2-1.7b", "name": "SmolLM2 1.7B", "task": "chat",
        "family": "smollm2", "params": 1700000000, "sizeMb": 900, "minRamGb": 6,
        "runsOn": ["desktop", "cloud"], "trainingModes": ["rag", "lora"],
        "license": "Apache-2.0", "trainer": "web-llm",
        "description": "Mid-size model with great balance of speed and capability. Desktop and cloud only.",
    },
    {
        "id": "llama-3.2-3b", "name": "Llama 3.2 3B", "task": "chat",
        "family": "llama", "params": 3200000000, "sizeMb": 1700, "minRamGb": 8,
        "runsOn": ["desktop", "cloud"], "trainingModes": ["rag", "lora"],
        "license": "Llama 3.2", "trainer": "web-llm",
        "description": "Code-capable language model. Handles complex reasoning, coding tasks, and detailed analysis. Desktop only.",
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
        "description": "Microsoft's small-but-mighty model. Excellent reasoning capabilities for its size.",
    },
    {
        "id": "mobilenet-v3", "name": "MobileNet V3 Small", "task": "classification",
        "family": "mobilenet", "sizeMb": 11, "minRamGb": 2,
        "runsOn": ["mobile", "desktop", "cloud"], "trainingModes": ["transfer"],
        "license": "Apache-2.0", "trainer": "tfjs",
        "description": "Lightweight image classification model. Train on your own image categories.",
    },
]

@app.get("/models")
def list_models():
    return {"models": MODEL_CATALOG}

@app.get("/models/recommended")
def recommended_models(ram_gb: float = 2, storage_mb: float = 2048, task: str | None = None):
    available_training_ram = max(256, ram_gb * 1024 * 0.45)
    models = [m for m in MODEL_CATALOG if m["sizeMb"] <= storage_mb and m["trainingRamMb"] <= available_training_ram and (not task or task.lower() in m["type"].lower())]
    return {"ramGb": ram_gb, "availableTrainingRamMb": round(available_training_ram), "models": models}

def verify_bearer_token(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Firebase bearer token required")
    if not firebase_admin._apps:
        raise HTTPException(status_code=503, detail="Firebase Admin is not configured")
    try:
        from firebase_admin import auth
        return auth.verify_id_token(authorization[7:])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

@app.post("/datasets")
async def create_dataset(payload: dict, authorization: str | None = Header(default=None)):
    user = verify_bearer_token(authorization)
    db = _require_db()
    required = ("name", "publicId", "secureUrl", "bytes", "format")
    if any(not payload.get(key) for key in required):
        raise HTTPException(status_code=400, detail="Dataset metadata is incomplete")
    data = {
        "ownerUid": user["uid"], "name": payload["name"],
        "cloudinaryPublicId": payload["publicId"], "secureUrl": payload["secureUrl"],
        "sizeBytes": payload["bytes"], "format": payload["format"],
        "status": "ready", "createdAt": firestore.SERVER_TIMESTAMP
    }
    ref = db.collection("users").document(user["uid"]).collection("datasets").document()
    ref.set(data)
    return {"id": ref.id, "dataset": {**data, "createdAt": None}}

@app.get("/datasets")
def list_datasets(authorization: str | None = Header(default=None)):
    user = verify_bearer_token(authorization)
    db = _require_db()
    rows = []
    for doc in db.collection("users").document(user["uid"]).collection("datasets").stream():
        item = doc.to_dict(); item["id"] = doc.id; rows.append(item)
    return {"datasets": rows}

@app.post("/uploads/sign")
def sign_cloudinary_upload(resource_type: str = "raw", authorization: str | None = Header(default=None)):
    """Create a short-lived Cloudinary signature; the API secret stays on Render."""
    user = verify_bearer_token(authorization)
    import cloudinary, cloudinary.utils, time
    cloudinary.config(cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"], api_key=os.environ["CLOUDINARY_API_KEY"], api_secret=os.environ["CLOUDINARY_API_SECRET"], secure=True)
    timestamp = int(time.time())
    folder = f"toddler/datasets/{user['uid']}"
    preset = os.getenv("CLOUDINARY_SIGNED_UPLOAD_PRESET")
    params = {"timestamp": timestamp, "folder": folder}
    if preset:
        params["upload_preset"] = preset
    return {"timestamp": timestamp, "signature": cloudinary.utils.api_sign_request(params, os.environ["CLOUDINARY_API_SECRET"]), "apiKey": os.environ["CLOUDINARY_API_KEY"], "cloudName": os.environ["CLOUDINARY_CLOUD_NAME"], "folder": folder, "uploadPreset": preset}

@app.delete("/projects/{project_id}")
def delete_project(project_id: str, authorization: str | None = Header(default=None)):
    user = verify_bearer_token(authorization)
    db = _require_db()
    ref = db.collection("projects").document(project_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("ownerUid", doc.to_dict().get("owner_uid")) != user["uid"]:
        raise HTTPException(status_code=404, detail="Project not found")
    ref.delete()
    return {"status": "deleted", "project_id": project_id}

@app.delete("/account")
def delete_account(authorization: str | None = Header(default=None)):
    user = verify_bearer_token(authorization)
    try:
        from firebase_admin import auth
        auth.delete_user(user["uid"])
        return {"status": "deleted"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Account deletion failed: {exc}")
\n
@app.post("/train")
async def queue_training_job(
    project_id: str = Form(...),
    dataset_url: str = Form(...),
    text_column: str = Form(None),
    label_column: str = Form(None),
    authorization: str | None = Header(default=None)
):
    """Phase 2: Creates a training job for BYOC or Cloud workers using the signed Cloudinary dataset URL."""
    db = _require_db()
    
    # 1. Update the project document with dataset parameters
    doc_ref = db.collection("projects").document(project_id)
    doc_ref.update({
        "status": "queued",
        "datasetUrl": dataset_url,
        "datasetConfig": {
            "textColumn": text_column,
            "labelColumn": label_column
        }
    })
    
    # 2. Add job to the central training_jobs queue
    job_ref = db.collection("training_jobs").document()
    job_ref.set({
        "project_id": project_id,
        "dataset_url": dataset_url,
        "runner": "auto",  # Allows mobile BYOC, desktop BYOC, or cloud to claim it
        "status": "queued",
        "progress": 0,
        "created_at": firestore.SERVER_TIMESTAMP
    })

    # 3. Dispatch Silent FCM Wake-up Call to user's registered BYOC devices
    try:
        user_uid = doc_ref.get().to_dict().get('ownerUid')
        if user_uid:
            devices = db.collection("users").document(user_uid).collection("devices").where("status", "==", "online").get()
            tokens = [d.to_dict().get("fcmToken") for d in devices if d.to_dict().get("fcmToken")]
            
            if tokens:
                message = messaging.MulticastMessage(
                    data={
                        "action": "WAKE_WORKER",
                        "job_id": job_ref.id,
                        "project_id": project_id
                    },
                    tokens=tokens,
                )
                messaging.send_multicast(message)
                print(f"Dispatched silent wake-up to {len(tokens)} worker devices.")
    except Exception as e:
        print(f"FCM Dispatch Error: {e}")

    return {"job_id": job_ref.id, "status": "queued"}


@app.get("/models")
def list_models(platform: str = "web", ram_gb: float = 16):
    """Unified Model Catalog. Returns models filtered by hardware capability."""
    try:
        # Try Firestore first
        if db:
            try:
                models_ref = db.collection("models").where("status", "==", "published").get()
                models = [m.to_dict() for m in models_ref]
                if models:
                    filtered = [m for m in models if m.get("minRamGb", 0) <= ram_gb and platform in m.get("runsOn", ["web", "mobile", "desktop", "cloud"])]
                    return {"models": filtered}
            except Exception:
                pass
        # Fallback to seed catalog
        filtered = [m for m in MODEL_CATALOG if m.get("minRamGb", 0) <= ram_gb]
        return {"models": filtered}
    except Exception as e:
        return {"models": MODEL_CATALOG}
