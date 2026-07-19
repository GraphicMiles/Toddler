from fastapi import FastAPI, HTTPException, Form, Header
from fastapi.middleware.cors import CORSMiddleware
import httpx
import json
import math
import os

app = FastAPI(title="Toddler Inference Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Lock down in production
    allow_methods=["*"],
    allow_headers=["*"],
)

def _predict_json_model(artifact: dict, text: str):
    """Phase 6: Pure Python Inference Logic for offline models"""
    toks = [w for w in text.lower().split() if len(w) > 1]
    vocab = artifact.get('vocab', [])
    index = {w: i for i, w in enumerate(vocab)}
    
    tf = {}
    for w in toks:
        if w in index:
            tf[w] = tf.get(w, 0) + 1
            
    scores = {}
    for label, class_data in artifact.get('classes', {}).items():
        score = class_data['prior']
        for w, count in tf.items():
            score += count * class_data['logProbs'][index[w]]
        scores[label] = score
        
    best_label = max(scores, key=scores.get) if scores else "Unknown"
    return best_label, 0.95  # Mock confidence for now

@app.post("/predict")
async def predict_proxy(
    project_id: str = Form(...),
    text: str = Form(...),
    x_api_key: str | None = Header(default=None, alias="X-API-Key")
):
    """Phase 6: Dedicated Inference Proxy"""
    # 1. Verify API Key / Token here (Firebase Auth)
    
    # 2. Fetch the Project Document to get the Cloudinary Model URL
    # db = firestore.client()
    # doc = db.collection('projects').document(project_id).get()
    # model_url = doc.to_dict().get('modelUrl')
    
    # MOCK URL FOR PHASE 6 DEMO:
    model_url = "https://mock-cloudinary-url.com/model.json"
    
    if not model_url:
        raise HTTPException(status_code=404, detail="Model weights not found")

    try:
        # 3. Download weights from Cloudinary
        # async with httpx.AsyncClient() as client:
        #     r = await client.get(model_url)
        #     artifact = r.json()
        
        # MOCK PREDICTION FOR PHASE 6
        artifact = {"vocab": ["test"], "classes": {"positive": {"prior": 0, "logProbs": [1]}}}
        
        # 4. Execute Prediction Server-Side
        prediction, confidence = _predict_json_model(artifact, text)
        
        return {
            "prediction": "Mock Classification: Positive", 
            "confidence": confidence,
            "latency_ms": 42
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
