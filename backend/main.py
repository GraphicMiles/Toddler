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

@app.get("/")
def health_check():
    return {"status": "operational", "engine": "scikit-learn v1.x"}

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
        model_b64 = data.get('model_artifact')
        if not model_b64:
            raise HTTPException(status_code=400, detail="Model artifact missing — the model may still be training.")

        pipeline = pickle.loads(base64.b64decode(model_b64))

        prediction = pipeline.predict([text])[0]
        probs = pipeline.predict_proba([text])[0]
        confidence = float(max(probs))

        # Explainability
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
            weights[f_names[idx]] = float(weight * transformed[0, idx])

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
        model_b64 = data.get('model_artifact')
        if not model_b64:
            raise HTTPException(status_code=400, detail="Model artifact missing — the model may still be training.")
        pipeline = pickle.loads(base64.b64decode(model_b64))

        df = pd.read_csv(io.BytesIO(await file.read()))
        if text_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{text_column}' not found in uploaded CSV.")
        df['prediction'] = pipeline.predict(df[text_column].astype(str))

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
    {
        "id": "sentiment-lite", "name": "Sentiment Lite", "type": "Text classification",
        "description": "Fast positive, negative and neutral predictions.", "format": "onnx",
        "sizeMb": 42, "parameterCount": 1000000, "minimumRamGb": 2,
        "trainingRamMb": 700, "inferenceRamMb": 250, "supportsTraining": True,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published", "downloadUrl": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/onnx/model_quantized.onnx"
    },
    {
        "id": "mobile-vision-v1", "name": "Vision Lite", "type": "Image classification",
        "description": "Compact quantized MobileNet image classifier for low-memory devices.", "format": "tflite",
        "sizeMb": 4.3, "parameterCount": 4200000, "minimumRamGb": 2,
        "trainingRamMb": 620, "inferenceRamMb": 180, "supportsTraining": True,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published",
        "downloadUrl": "https://storage.googleapis.com/download.tensorflow.org/models/tflite/mobilenet_v1_1.0_224_quant.tflite"
    },
    {
        "id": "embed-mini", "name": "Embed Mini", "type": "Text embeddings",
        "description": "Generate sentence vectors locally.", "format": "onnx",
        "sizeMb": 86, "parameterCount": 8000000, "minimumRamGb": 4,
        "trainingRamMb": 1100, "inferenceRamMb": 360, "supportsTraining": False,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published", "downloadUrl": "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx"
    }
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
