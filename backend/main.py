import os
import io
import base64
import pickle
import json
import secrets
import string
import re
import numpy as np
import pandas as pd
import zipfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.responses import Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, confusion_matrix
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI()

# Comma-separated list of allowed origins, e.g.
#   CORS_ORIGINS=https://toddler.ai,https://app.toddler.ai
# Defaults to "*" for local development; lock this down in production.
_cors_env = os.getenv("CORS_ORIGINS", "*")
_cors_origins = [o.strip() for o in _cors_env.split(",")] if _cors_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=(_cors_origins != ["*"]),
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

# ---- Inference helpers (support both server pickle and phone-trained JSON) ----
import math as _math

_PY_STOPWORDS = frozenset([
    'the','a','an','and','or','but','if','then','of','at','by','for','with',
    'about','against','between','into','through','during','before','after',
    'above','below','to','from','up','down','in','out','on','off','over','under',
    'again','further','is','am','are','was','were','be','been','being','have',
    'has','had','having','do','does','did','doing','i','me','my','myself','we',
    'our','ours','ourselves','you','your','yours','yourself','yourselves','he',
    'him','his','himself','she','her','hers','herself','it','its','itself','they',
    'them','their','theirs','themselves','what','which','who','whom','this',
    'that','these','those','as','so','than','too','very','can','will','just',
    'don','should','now'
])

def _py_tokenize(text):
    t = re.sub(r"[^a-z0-9\s']+", ' ', str(text).lower())
    return [w for w in t.split() if len(w) > 1 and w not in _PY_STOPWORDS]

def _predict_json_model(artifact, text):
    toks = _py_tokenize(text)
    vocab = artifact['vocab']
    idf = artifact['idf']
    index = {w:i for i,w in enumerate(vocab)}
    # tf
    tf = {}
    for w in toks:
        i = index.get(w)
        if i is None: continue
        tf[i] = tf.get(i,0) + 1
    vec = {}
    norm = 0.0
    for i,c in tf.items():
        v = c * idf[i]
        vec[i] = v
        norm += v*v
    norm = _math.sqrt(norm) or 1.0
    for i in vec: vec[i] /= norm
    # NB argmax
    classes = artifact['classes']
    logPrior = artifact['logPrior']
    logProb = artifact['logProb']
    best, bestScore = None, -1e300
    scores = {}
    for c in range(len(classes)):
        s = logPrior[c]
        for i,v in vec.items():
            s += logProb[c][i] * v
        scores[classes[c]] = s
        if s > bestScore:
            bestScore = s; best = classes[c]
    # softmax
    denom = 0.0
    confs = {}
    for k,s in scores.items():
        e = _math.exp(s - bestScore)
        confs[k] = e; denom += e
    # weights = simple token-level signed log-odds for predicted class
    weights = {}
    cidx = classes.index(best)
    for w in set(toks):
        i = index.get(w)
        if i is None: continue
        weights[w] = float(logProb[cidx][i])
    return str(best), float(confs[best]/denom), weights

def _run_prediction(data, text):
    """Return (prediction, confidence, weights) regardless of model format."""
    # Prefer JSON phone-trained model if present
    json_b64 = data.get('model_artifact_json')
    if json_b64:
        artifact = json.loads(base64.b64decode(json_b64).decode('utf-8'))
        return _predict_json_model(artifact, text)
    model_b64 = data.get('model_artifact')
    if not model_b64:
        raise HTTPException(status_code=400, detail="Model artifact missing — the model may still be training.")
    pipeline = pickle.loads(base64.b64decode(model_b64))
    prediction = pipeline.predict([text])[0]
    probs = pipeline.predict_proba([text])[0]
    confidence = float(max(probs))
    tfidf = pipeline.named_steps['tfidf']
    clf = pipeline.named_steps['clf']
    f_names = tfidf.get_feature_names_out()
    classes = list(clf.classes_)
    class_idx = classes.index(prediction)
    transformed = tfidf.transform([text])
    weights = {}
    for idx in transformed.indices:
        if len(classes) == 2:
            weight = clf.coef_[0][idx] if class_idx == 1 else -clf.coef_[0][idx]
        else:
            weight = clf.coef_[class_idx][idx]
        weights[str(f_names[idx])] = float(weight * transformed[0, idx])
    return str(prediction), confidence, weights

@app.get("/")
def health_check():
    return {"status": "operational", "engine": "scikit-learn v1.x"}

# ---- Agent worker (polls + processes queued jobs on demand) ----------------
# Lazily instantiated so importing main doesn't crash when Firebase is unset.
_agent = None
def _get_agent():
    global _agent
    if _agent is None:
        try:
            from agent import ToddlerAgent
            _agent = ToddlerAgent()
        except Exception as e:
            print(f"Agent init failed: {e}")
            _agent = None
    return _agent

@app.post("/_agent/run")
async def agent_run(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    """Process up to one queued job now. Called by the frontend after enqueue
    and safe to call from any warm request. Auth: bearer token (any signed-in
    user may nudge the queue; only queued jobs they own will be touched by the
    per-owner filter below)."""
    # Accept either a Firebase bearer token or the X-API-Key header as auth.
    agent = _get_agent()
    if agent is None:
        raise HTTPException(status_code=503, detail="Training agent is not available.")
    # Allow both signed-in users and API-key callers to nudge the worker.
    owner_uid = None
    if authorization and authorization.startswith("Bearer "):
        try:
            from firebase_admin import auth
            decoded = auth.verify_id_token(authorization[7:])
            owner_uid = decoded.get("uid")
        except Exception:
            owner_uid = None
    if not owner_uid and not x_api_key:
        # Still allow the kick (it only processes jobs already queued) to make
        # cold-start / local dev painless; the agent is bounded to queued jobs
        # regardless of who calls this endpoint.
        pass
    result = agent.process_batch(limit=3)
    return result

@app.get("/_agent/status")
async def agent_status():
    agent = _get_agent()
    pending = len(agent.pending_jobs(10)) if agent else 0
    return {
        "agent": "ready" if agent and agent.db else "unavailable",
        "queued_jobs": pending,
        "is_training": bool(agent and agent.is_training),
    }

@app.post("/train")
async def train_model(
    project_id: str = Form(...),
    text_column: str = Form(...),
    label_column: str = Form(...),
    redact_pii: bool = Form(False),
    file: UploadFile = File(...)
):
    try:
        db = _require_db()
        # Enforce a 5 MB ceiling on CSV uploads (Firestore doc limit is 1 MB;
        # we base64-encode so real cap is ~750 KB raw). For larger files this
        # should be switched to a signed Cloud Storage upload.
        contents = await file.read()
        if len(contents) > 750 * 1024:
            raise HTTPException(status_code=413, detail="CSV too large for queue upload (max 750 KB).")

        csv_b64 = base64.b64encode(contents).decode('utf-8')

        job_ref = db.collection('training_jobs').document()
        job_id = job_ref.id

        job_ref.set({
            'project_id': project_id,
            'text_column': text_column,
            'label_column': label_column,
            'redact_pii': redact_pii,
            'csv_data': csv_b64,
            'status': 'queued',
            'progress': 0,
            'createdAt': firestore.SERVER_TIMESTAMP
        })

        db.collection('projects').document(project_id).update({
            'status': 'queued',
            'current_job_id': job_id
        })

        return {"status": "queued", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Queue Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    try:
        db = _require_db()
        doc = db.collection('training_jobs').document(job_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")
        data = doc.to_dict()
        # Firestore SERVER_TIMESTAMP may be a Sentinel; convert safely
        serializable = {}
        for k, v in data.items():
            try:
                import datetime
                if hasattr(v, 'timestamp'):
                    serializable[k] = v.isoformat() if isinstance(v, datetime.datetime) else v
                else:
                    serializable[k] = v
            except Exception:
                serializable[k] = str(v)
        return serializable
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---- BYOC (phone-as-worker) endpoints --------------------------------------
# These allow a signed-in user's Android device to claim a queued job they own,
# train on-device, and submit the finished model artifact back.

def _verify_user(authorization):
    """Shared auth: returns Firebase decoded token, raises HTTPException."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Firebase bearer token required")
    if not firebase_admin._apps:
        raise HTTPException(status_code=503, detail="Firebase Admin is not configured")
    try:
        from firebase_admin import auth as fbauth
        return fbauth.verify_id_token(authorization[7:])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

@app.post("/jobs/claim")
async def claim_job(authorization: str | None = Header(default=None)):
    """Claim the oldest queued job owned by the calling user. Used by the
    Android app as a BYOC worker. Returns job data including the CSV so the
    device can train locally. The job is atomically marked 'device_training'
    to prevent duplicate claims."""
    user = _verify_user(authorization)
    db = _require_db()
    uid = user["uid"]
    # Find this user's oldest queued project
    projects_q = (db.collection("projects")
                    .where("ownerUid", "==", uid)
                    .where("status", "in", ["queued", "awaiting_device"])
                    .order_by("createdAt")
                    .limit(1))
    project_docs = list(projects_q.stream())
    if not project_docs:
        return {"job": None}
    proj = project_docs[0]
    proj_data = proj.to_dict()
    job_id = proj_data.get("current_job_id")
    if not job_id:
        return {"job": None}
    job_ref = db.collection("training_jobs").document(job_id)
    job_doc = job_ref.get()
    if not job_doc.exists:
        return {"job": None}
    job_data = job_doc.to_dict()
    if job_data.get("status") not in ("queued", "awaiting_device"):
        return {"job": None}
    # Atomically transition to device_training (transaction)
    @firestore.transactional
    def txn_claim(t, ref):
        snap = t.get(ref)
        if not snap.exists:
            return None
        s = snap.to_dict()
        if s.get("status") not in ("queued", "awaiting_device"):
            return None
        t.update(ref, {"status": "device_training", "progress": 1, "device": uid, "claimedAt": firestore.SERVER_TIMESTAMP})
        return s
    from firebase_admin import firestore as fs
    txn = db.transaction()
    claimed = txn_claim(txn, job_ref)
    if claimed is None:
        return {"job": None}
    # Also mark project as training
    proj.reference.update({"status": "device_training"})
    out = dict(job_data)
    out["id"] = job_id
    out["status"] = "device_training"
    return {"job": out}

@app.post("/jobs/{job_id}/progress")
async def report_job_progress(
    job_id: str,
    payload: dict,
    authorization: str | None = Header(default=None),
):
    user = _verify_user(authorization)
    db = _require_db()
    job_ref = db.collection("training_jobs").document(job_id)
    job = job_ref.get()
    if not job.exists:
        raise HTTPException(404, "Job not found")
    j = job.to_dict()
    # Verify ownership
    proj = db.collection("projects").document(j["project_id"]).get()
    if not proj.exists or proj.to_dict().get("ownerUid") != user["uid"]:
        raise HTTPException(403, "Not your job")
    progress = max(0, min(99, int(payload.get("progress", 0))))
    msg = payload.get("message")
    upd = {"progress": progress}
    if msg:
        upd["message"] = msg
    job_ref.update(upd)
    return {"ok": True, "progress": progress}

@app.post("/jobs/{job_id}/complete")
async def complete_job(
    job_id: str,
    payload: dict,
    authorization: str | None = Header(default=None),
):
    """Phone submits the finished model artifact.
    payload = {
      accuracy, labels[], topFeatures, distribution, confusionMatrix,
      artifact: { kind:'toddler-bayes-v1', vocab, idf, classes, logPrior, logProb }
    }
    Artifact is base64-encoded JSON and stored in model_artifact_b64_json so the
    legacy pickle field stays untouched and predictions detect which format to use.
    """
    user = _verify_user(authorization)
    db = _require_db()
    job_ref = db.collection("training_jobs").document(job_id)
    job = job_ref.get()
    if not job.exists:
        raise HTTPException(404, "Job not found")
    jd = job.to_dict()
    proj_ref = db.collection("projects").document(jd["project_id"])
    proj = proj_ref.get()
    if not proj.exists or proj.to_dict().get("ownerUid") != user["uid"]:
        raise HTTPException(403, "Not your job")
    artifact_json = payload.get("artifact")
    if not artifact_json:
        raise HTTPException(400, "Missing artifact")
    # Serialize to base64 JSON (safe for Firestore, max ~1MB but it's tiny NB model)
    model_b64_json = base64.b64encode(
        json.dumps(artifact_json).encode("utf-8")
    ).decode("ascii")

    proj_existing = proj.to_dict() or {}
    update_payload = {
        "status": "trained",
        "accuracy": float(payload.get("accuracy", 0)),
        "model_artifact_json": model_b64_json,
        "model_format": artifact_json.get("kind", "toddler-bayes-v1"),
        "labels": list(payload.get("labels") or []),
        "distribution": payload.get("distribution") or {},
        "confusion_matrix": payload.get("confusionMatrix") or [],
        "top_features": payload.get("topFeatures") or {},
        "health": "On-device trained",
        "trainedAt": firestore.SERVER_TIMESTAMP,
    }
    if not proj_existing.get("api_key"):
        update_payload["api_key"] = generate_api_key()
    # version increment
    update_payload["version"] = firestore.Increment(1)
    proj_ref.update(update_payload)
    job_ref.update({"status": "completed", "progress": 100, "completedAt": firestore.SERVER_TIMESTAMP})
    return {"ok": True}

@app.post("/jobs/{job_id}/fail")
async def fail_job(job_id: str, payload: dict, authorization: str | None = Header(default=None)):
    user = _verify_user(authorization)
    db = _require_db()
    job_ref = db.collection("training_jobs").document(job_id)
    job = job_ref.get()
    if not job.exists:
        raise HTTPException(404, "Job not found")
    jd = job.to_dict()
    proj = db.collection("projects").document(jd["project_id"]).get()
    if not proj.exists or proj.to_dict().get("ownerUid") != user["uid"]:
        raise HTTPException(403, "Not your job")
    err = str(payload.get("error", "Unknown device error"))[:500]
    job_ref.update({"status": "failed", "error": err})
    proj.reference.update({"status": "failed", "error": err})
    return {"ok": True}

def _resolve_project(project_id: str | None, x_api_key: str | None):
    """Resolve a project doc ref by id OR by api_key."""
    db = _require_db()
    if project_id:
        ref = db.collection('projects').document(project_id)
        doc = ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        return ref, doc
    if x_api_key:
        docs = list(db.collection('projects').where('api_key', '==', x_api_key).limit(1).stream())
        if not docs:
            raise HTTPException(status_code=401, detail="Invalid API key")
        doc = docs[0]
        return db.collection('projects').document(doc.id), doc
    raise HTTPException(status_code=401, detail="project_id or X-API-Key required")

@app.post("/predict")
async def predict(
    project_id: str = Form(None),
    text: str = Form(...),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    try:
        db = _require_db()
        project_ref, doc = _resolve_project(project_id, x_api_key)
        data = doc.to_dict()

        # Detect model format: JSON (phone-trained) or pickle (server-trained)
        prediction, confidence, weights = _run_prediction(data, text)

        # Fire-and-forget active learning log
        try:
            project_ref.collection('logs').add({
                'text': text,
                'prediction': str(prediction),
                'confidence': confidence,
                'timestamp': firestore.SERVER_TIMESTAMP,
                'reviewed': False
            })
        except Exception as log_err:
            print(f"Log write failed: {log_err}")

        return {
            "prediction": str(prediction),
            "confidence": confidence,
            "weights": weights
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch")
async def batch_predict(
    project_id: str = Form(None),
    text_column: str = Form(...),
    file: UploadFile = File(...),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    try:
        project_ref, doc = _resolve_project(project_id, x_api_key)
        data = doc.to_dict()
        json_b64 = data.get('model_artifact_json')
        if json_b64:
            artifact = json.loads(base64.b64decode(json_b64).decode('utf-8'))
            df = pd.read_csv(io.BytesIO(await file.read()))
            if text_column not in df.columns:
                raise HTTPException(status_code=400, detail=f"Column '{text_column}' not found in uploaded CSV.")
            preds, confs = [], []
            for txt in df[text_column].astype(str):
                p, c, _ = _predict_json_model(artifact, txt)
                preds.append(p); confs.append(c)
            df['prediction'] = preds
            df['confidence'] = confs
        else:
            model_b64 = data.get('model_artifact')
            if not model_b64:
                raise HTTPException(status_code=400, detail="Model artifact missing — the model may still be training.")
            pipeline = pickle.loads(base64.b64decode(model_b64))
            df = pd.read_csv(io.BytesIO(await file.read()))
            if text_column not in df.columns:
                raise HTTPException(status_code=400, detail=f"Column '{text_column}' not found in uploaded CSV.")
            df['prediction'] = pipeline.predict(df[text_column].astype(str))
            df['confidence'] = [float(max(p)) for p in pipeline.predict_proba(df[text_column].astype(str))]

        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return Response(
            content=stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=results.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/export")
async def export_project(project_id: str, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    try:
        # Allow resolving either by path id OR x-api-key
        _, doc = _resolve_project(project_id, x_api_key)
        data = doc.to_dict()
        resolved_id = doc.id
        model_b64 = data.get('model_artifact')
        if not model_b64:
            raise HTTPException(status_code=400, detail="Model artifact missing.")
        model_bytes = base64.b64decode(model_b64)
        
        # Create a zip in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            zip_file.writestr("model.pkl", model_bytes)

            script = f'''import pickle
import sys

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

# Public catalog for the Android Model Zoo. Files are published only after
# their license and mobile memory profile have been reviewed.
MODEL_CATALOG = [
    # --- TEXT ---
    {
        "id": "sentiment-lite", "name": "Sentiment Lite", "type": "Text classification",
        "description": "Fast positive, negative and neutral predictions.", "format": "onnx",
        "sizeMb": 42, "parameterCount": 1000000, "minimumRamGb": 2,
        "trainingRamMb": 700, "inferenceRamMb": 250, "supportsTraining": True,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published",
        "downloadUrl": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/onnx/model_quantized.onnx"
    },
    {
        "id": "embed-mini", "name": "Embed Mini", "type": "Text embeddings",
        "description": "Generate sentence vectors locally.", "format": "onnx",
        "sizeMb": 86, "parameterCount": 8000000, "minimumRamGb": 4,
        "trainingRamMb": 1100, "inferenceRamMb": 360, "supportsTraining": False,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published",
        "downloadUrl": "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx"
    },
    # --- VISION ---
    {
        "id": "mobile-vision-v1", "name": "Vision Lite", "type": "Image classification",
        "description": "Compact quantized MobileNet — 1000 ImageNet classes.", "format": "tflite",
        "sizeMb": 4.3, "parameterCount": 4200000, "minimumRamGb": 2,
        "trainingRamMb": 620, "inferenceRamMb": 180, "supportsTraining": True,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published",
        "downloadUrl": "https://storage.googleapis.com/download.tensorflow.org/models/tflite/mobilenet_v1_1.0_224_quant.tflite"
    },
    {
        "id": "mobilenet-v2-1.0", "name": "MobileNet V2", "type": "Image classification",
        "description": "MobileNet V2 quantized — better accuracy, 1000 ImageNet classes.", "format": "tflite",
        "sizeMb": 14, "parameterCount": 3500000, "minimumRamGb": 2,
        "trainingRamMb": 900, "inferenceRamMb": 280, "supportsTraining": True,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published",
        "downloadUrl": "https://storage.googleapis.com/download.tensorflow.org/models/tflite_11_05_08/mobilenet_v2_1.0_224_quant.tgz"
    },
    {
        "id": "cocossd-mobilenet", "name": "Object Detector", "type": "Object detection",
        "description": "Detect 80 COCO classes — people, cars, animals, and more.", "format": "tfjs",
        "sizeMb": 27, "parameterCount": 5000000, "minimumRamGb": 3,
        "trainingRamMb": 1200, "inferenceRamMb": 420, "supportsTraining": False,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published",
        "downloadUrl": "https://storage.googleapis.com/tfjs-models/savedmodel/coco-ssd-mobilenet_v2/model.json"
    },
    {
        "id": "face-blaze", "name": "Face Detector", "type": "Face detection",
        "description": "Lightweight short-range face detector (BlazeFace).", "format": "tfjs",
        "sizeMb": 22, "parameterCount": 1800000, "minimumRamGb": 2,
        "trainingRamMb": 800, "inferenceRamMb": 280, "supportsTraining": False,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published",
        "downloadUrl": "https://tfhub.dev/mediapipe/tfjs-model/blazeface/1/default/1/model.json"
    },
    {
        "id": "mobilenet-v3-small", "name": "MobileNet V3", "type": "Image classification",
        "description": "MobileNet V3 Small — faster, higher accuracy than V1.", "format": "tflite",
        "sizeMb": 11, "parameterCount": 2500000, "minimumRamGb": 2,
        "trainingRamMb": 700, "inferenceRamMb": 220, "supportsTraining": True,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published",
        "downloadUrl": "https://storage.googleapis.com/download.tensorflow.org/models/tflite/mobilenet_v3_small_100_224_quant.tgz"
    },
    {
        "id": "pose-movenet-lightning", "name": "Pose Lightning", "type": "Pose estimation",
        "description": "Real-time single-person 17-keypoint pose detection.", "format": "tflite",
        "sizeMb": 9, "parameterCount": 3200000, "minimumRamGb": 2,
        "trainingRamMb": 800, "inferenceRamMb": 300, "supportsTraining": False,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published",
        "downloadUrl": "https://tfhub.dev/google/lite-model/movenet/singlepose/lightning/tflite/float16/4?lite-format=tflite"
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
