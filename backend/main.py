import os
import io
import base64
import pickle
import json
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
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

@app.get("/")
def health_check():
    return {"status": "operational", "engine": "scikit-learn v1.x"}

import secrets
import string

# ... existing code ...

def generate_api_key():
    prefix = "tdlr_live_"
    chars = string.ascii_letters + string.digits
    return prefix + ''.join(secrets.choice(chars) for _ in range(32))

import re

def scrub_pii(text):
    # Scrub Emails
    text = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '[EMAIL_REDACTED]', text)
    # Scrub Phone Numbers (Basic)
    text = re.sub(r'\+?\d{10,12}', '[PHONE_REDACTED]', text)
    return text

@app.post("/train")
async def train_model(
    project_id: str = Form(...),
    text_column: str = Form(...),
    label_column: str = Form(...),
    redact_pii: bool = Form(False),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        df = df.dropna(subset=[text_column, label_column])
        
        # 🧠 FEATURE 30: PII REDACTION
        if redact_pii:
            df[text_column] = df[text_column].astype(str).apply(scrub_pii)

        X = df[text_column].astype(str)
        y = df[label_column].astype(str)
        
        # ... (rest of training logic) ...
        # Ensure 'version' is incremented and 'api_key' is generated if missing
        
        project_ref = db.collection('projects').document(project_id)
        project_ref.update({
            'version': firestore.Increment(1),
            'redacted': redact_pii,
            # ... (other updates) ...
        })

        # 🧠 FEATURE 11: HEALTH AUDIT
        class_counts = y.value_counts()
        imbalanced = (class_counts.max() / class_counts.min()) > 4 if len(class_counts) > 0 else False
        health_status = "Warning: Imbalanced Data" if imbalanced else "Optimal"

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # 🧠 FEATURE 1: AUTO-ML TOURNAMENT (Simulated for speed in v1.1)
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(max_features=10000, stop_words='english', ngram_range=(1,2))),
            ('clf', LogisticRegression(max_iter=2000, C=1.0, solver='lbfgs'))
        ])
        
        pipeline.fit(X_train, y_train)
        
        y_pred = pipeline.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        cm = confusion_matrix(y_test, y_pred)
        classes = list(pipeline.named_steps['clf'].classes_)
        
        # 🧠 FEATURE 4: GLOBAL TOP FEATURES
        tfidf = pipeline.named_steps['tfidf']
        clf = pipeline.named_steps['clf']
        feature_names = tfidf.get_feature_names_out()
        
        importance = {}
        if len(classes) == 2:
            coefs = clf.coef_[0]
            for i in np.argsort(np.abs(coefs))[-50:]:
                importance[feature_names[i]] = float(coefs[i])
        else:
            coefs = np.mean(np.abs(clf.coef_), axis=0)
            for i in np.argsort(coefs)[-50:]:
                importance[feature_names[i]] = float(coefs[i])

        model_bytes = pickle.dumps(pipeline)
        model_b64 = base64.b64encode(model_bytes).decode('utf-8')

        project_ref = db.collection('projects').document(project_id)
        project_ref.update({
            'status': 'trained',
            'accuracy': float(acc),
            'model_artifact': model_b64,
            'labels': classes,
            'distribution': y.value_counts().to_dict(),
            'confusion_matrix': cm.tolist(),
            'top_features': importance,
            'health': health_status,
            'api_key': generate_api_key(),
            'version': firestore.Increment(1),
            'trainedAt': firestore.SERVER_TIMESTAMP
        })

        return {"status": "success", "accuracy": float(acc)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict(project_id: str = Form(...), text: str = Form(...)):
    try:
        project_ref = db.collection('projects').document(project_id)
        doc = project_ref.get()
        if not doc.exists: raise HTTPException(status_code=404)
        
        data = doc.to_dict()
        pipeline = pickle.loads(base64.b64decode(data['model_artifact']))
        
        prediction = pipeline.predict([text])[0]
        probs = pipeline.predict_proba([text])[0]
        conf = float(max(probs))

        # Explainability
        tfidf = pipeline.named_steps['tfidf']
        clf = pipeline.named_steps['clf']
        f_names = tfidf.get_feature_names_out()
        class_idx = list(clf.classes_).index(prediction)
        
        transformed = tfidf.transform([text])
        weights = {}
        for idx in transformed.indices:
            # Binary fallback
            coef_val = clf.coef_[0][idx] if len(clf.classes_) == 2 else clf.coef_[class_idx][idx]
            weights[f_names[idx]] = float(coef_val * transformed[0, idx])

        return {"prediction": str(prediction), "confidence": conf, "weights": weights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch")
async def batch_predict(project_id: str = Form(...), text_column: str = Form(...), file: UploadFile = File(...)):
    try:
        project_ref = db.collection('projects').document(project_id)
        doc = project_ref.get()
        pipeline = pickle.loads(base64.b64decode(doc.to_dict()['model_artifact']))
        
        df = pd.read_csv(io.BytesIO(await file.read()))
        df['prediction'] = pipeline.predict(df[text_column].astype(str))
        
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return Response(content=stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=results.csv"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/download")
async def download_model(project_id: str):
    doc = db.collection('projects').document(project_id).get()
    model_bytes = base64.b64decode(doc.to_dict()['model_artifact'])
    return Response(content=model_bytes, media_type="application/octet-stream", headers={"Content-Disposition": f"attachment; filename=model.pkl"})
