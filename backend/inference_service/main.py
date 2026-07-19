import base64, io, json, math, os, pickle, re
import pandas as pd
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
import httpx


def key_for(request: Request):
    return request.headers.get("X-API-Key") or get_remote_address(request)

limiter = Limiter(key_func=key_for, default_limits=[os.getenv("INFERENCE_RATE_LIMIT", "60/minute")])
app = FastAPI(title="Toddler inference")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda _r, _e: Response("rate limit exceeded", 429))
app.add_middleware(SlowAPIMiddleware)
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost,capacitor://localhost").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["POST", "OPTIONS"], allow_headers=["Content-Type", "X-API-Key"])

if not firebase_admin._apps:
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    firebase_admin.initialize_app(credentials.Certificate(json.loads(raw))) if raw else firebase_admin.initialize_app()
db = firestore.client()

@app.get("/health")
def health(): return {"status": "ok", "service": "inference"}

def project(project_id, api_key):
    snap = db.collection("projects").document(project_id).get()
    if not snap.exists: raise HTTPException(404, "Project not found")
    data = snap.to_dict()
    if not api_key or not secrets_equal(str(data.get("api_key", "")), api_key): raise HTTPException(401, "Invalid API key")
    return data

def secrets_equal(a, b):
    import hmac
    return hmac.compare_digest(a.encode(), b.encode())

async def artifact(data):
    ref = data.get("artifactRef") or {}
    url = ref.get("secureUrl") if isinstance(ref, dict) else ref
    if url:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(url); response.raise_for_status(); raw = response.content
        return json.loads(raw) if str(url).endswith(".json") else pickle.loads(raw)
    # Transitional read-only compatibility; new writes must use artifactRef.
    if data.get("model_artifact_json"): return json.loads(base64.b64decode(data["model_artifact_json"]))
    if data.get("model_artifact"): return pickle.loads(base64.b64decode(data["model_artifact"]))
    raise HTTPException(409, "Model artifact is unavailable")

def predict_one(model, text):
    if hasattr(model, "predict"):
        label = model.predict([text])[0]
        probabilities = model.predict_proba([text])[0] if hasattr(model, "predict_proba") else [1]
        return str(label), float(max(probabilities))
    vocab = {word: i for i, word in enumerate(model["vocab"])}
    tokens = re.sub(r"[^a-z0-9\\s']+", " ", text.lower()).split()
    scores = list(model["logPrior"])
    for word in tokens:
        i = vocab.get(word)
        if i is not None:
            for c in range(len(scores)): scores[c] += model["logProb"][c][i]
    winner = max(range(len(scores)), key=scores.__getitem__)
    exps = [math.exp(s - scores[winner]) for s in scores]
    return str(model["classes"][winner]), exps[winner] / sum(exps)

@app.post("/predict")
@limiter.limit(os.getenv("PREDICT_RATE_LIMIT", "60/minute"))
async def predict(request: Request, project_id: str = Form(...), text: str = Form(...), x_api_key: str | None = Header(None, alias="X-API-Key")):
    label, confidence = predict_one(await artifact(project(project_id, x_api_key)), text)
    return {"prediction": label, "confidence": confidence, "weights": {}}

@app.post("/batch")
@limiter.limit(os.getenv("BATCH_RATE_LIMIT", "10/minute"))
async def batch(request: Request, project_id: str = Form(...), text_column: str = Form(...), file: UploadFile = File(...), x_api_key: str | None = Header(None, alias="X-API-Key")):
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024: raise HTTPException(413, "CSV exceeds 10 MB")
    frame = pd.read_csv(io.BytesIO(raw))
    if text_column not in frame: raise HTTPException(400, "Text column not found")
    model = await artifact(project(project_id, x_api_key))
    rows = [predict_one(model, str(value)) for value in frame[text_column]]
    frame["prediction"] = [x[0] for x in rows]; frame["confidence"] = [x[1] for x in rows]
    return Response(frame.to_csv(index=False), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=predictions.csv"})
