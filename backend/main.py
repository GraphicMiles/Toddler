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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    if not firebase_admin._apps:
        cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if cred_json:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    db = firestore.client()
except Exception as e:
    print(f"Firebase Admin Warning: {e}")

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
        # Instead of training here, we queue it for the BYOC Agent
        contents = await file.read()
        
        # Save CSV data to a 'pending_data' field (or Firebase Storage if available, 
        # but for Spark plan we'll use a string/blob in Firestore for small files)
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

        # Update project status
        db.collection('projects').document(project_id).update({
            'status': 'queued',
            'current_job_id': job_id
        })

        return {"status": "queued", "job_id": job_id}
    except Exception as e:
        print(f"Queue Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Training Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict(project_id: str = Form(...), text: str = Form(...)):
    try:
        project_ref = db.collection('projects').document(project_id)
        doc = project_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        data = doc.to_dict()
        model_b64 = data.get('model_artifact')
        if not model_b64:
            raise HTTPException(status_code=400, detail="Model artifact missing")
            
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
                # Binary case: coef_[0] refers to classes[1]
                weight = clf.coef_[0][idx] if class_idx == 1 else -clf.coef_[0][idx]
            else:
                weight = clf.coef_[class_idx][idx]
            weights[f_names[idx]] = float(weight * transformed[0, idx])

        # Active Learning Log
        db.collection('projects').document(project_id).collection('logs').add({
            'text': text,
            'prediction': str(prediction),
            'confidence': confidence,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'reviewed': False
        })

        return {
            "prediction": str(prediction), 
            "confidence": confidence, 
            "weights": weights
        }
    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch")
async def batch_predict(project_id: str = Form(...), text_column: str = Form(...), file: UploadFile = File(...)):
    try:
        project_ref = db.collection('projects').document(project_id)
        doc = project_ref.get()
        data = doc.to_dict()
        pipeline = pickle.loads(base64.b64decode(data['model_artifact']))
        
        df = pd.read_csv(io.BytesIO(await file.read()))
        df['prediction'] = pipeline.predict(df[text_column].astype(str))
        
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return Response(
            content=stream.getvalue(), 
            media_type="text/csv", 
            headers={"Content-Disposition": "attachment; filename=results.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/export")
async def export_project(project_id: str):
    try:
        doc = db.collection('projects').document(project_id).get()
        data = doc.to_dict()
        model_bytes = base64.b64decode(data['model_artifact'])
        
        # Create a zip in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            zip_file.writestr("model.pkl", model_bytes)
            
            # Simple python script
            script = f"""import pickle
import sys

# Toddler AI - Integration Script
# Project ID: {project_id}

def load_and_predict(text):
    with open('model.pkl', 'rb') as f:
        model = pickle.load(f)
    return model.predict([text])[0]

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(load_and_predict(sys.argv[1]))
    else:
        print("Usage: python toddler_run.py 'your text here'")
"""
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
            headers={"Content-Disposition": f"attachment; filename=toddler_export_{project_id}.zip"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/download")
async def download_model(project_id: str):
    try:
        doc = db.collection('projects').document(project_id).get()
        data = doc.to_dict()
        model_bytes = base64.b64decode(data['model_artifact'])
        return Response(
            content=model_bytes, 
            media_type="application/octet-stream", 
            headers={"Content-Disposition": f"attachment; filename=model_{project_id}.pkl"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Public catalog for the Android Model Zoo. Files are published only after
# their license and mobile memory profile have been reviewed.
MODEL_CATALOG = [
    {
        "id": "tiny-sentiment-v1", "name": "Tiny Sentiment", "type": "Text classification",
        "description": "Fast positive, negative and neutral predictions.", "format": "onnx",
        "sizeMb": 42, "parameterCount": 1000000, "minimumRamGb": 2,
        "trainingRamMb": 700, "inferenceRamMb": 250, "supportsTraining": True,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published", "downloadUrl": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/onnx/model_quantized.onnx"
    },
    {
        "id": "mobile-vision-v1", "name": "Vision Lite", "type": "Image classification",
        "description": "Compact image classification for low-memory devices.", "format": "tflite",
        "sizeMb": 28, "parameterCount": 2000000, "minimumRamGb": 2,
        "trainingRamMb": 620, "inferenceRamMb": 180, "supportsTraining": True,
        "supportsTesting": True, "license": "Apache-2.0", "status": "published"
    },
    {
        "id": "mini-embed-v1", "name": "Embed Mini", "type": "Text embeddings",
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
    if "db" not in globals():
        raise HTTPException(status_code=503, detail="Firestore is not configured")
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
    if "db" not in globals():
        raise HTTPException(status_code=503, detail="Firestore is not configured")
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
