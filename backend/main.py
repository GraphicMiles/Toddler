import os
import io
import base64
import pickle
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, confusion_matrix
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI()

# Enable CORS for Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin
# You will need to set GOOGLE_APPLICATION_CREDENTIALS or provide service account JSON
try:
    if not firebase_admin._apps:
        # For Render, we will use an Env Var containing the JSON string
        cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if cred_json:
            import json
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

@app.post("/train")
async def train_model(
    project_id: str = Form(...),
    text_column: str = Form(...),
    label_column: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        # 1. Read CSV
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        if len(df) > 2000:
            raise HTTPException(status_code=400, detail="File too large. Max 2,000 rows.")

        # 2. Basic Cleaning
        df = df.dropna(subset=[text_column, label_column])
        X = df[text_column].astype(str)
        y = df[label_column].astype(str)

        # 3. Split & Train
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(max_features=5000, stop_words='english')),
            ('clf', LogisticRegression(max_iter=1000))
        ])
        
        pipeline.fit(X_train, y_train)
        
        # 4. Evaluate
        y_pred = pipeline.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # 5. Serialize Model to Base64
        model_bytes = pickle.dumps(pipeline)
        model_b64 = base64.b64encode(model_bytes).decode('utf-8')

        # 6. Update Firestore directly from Backend
        project_ref = db.collection('projects').document(project_id)
        project_ref.update({
            'status': 'trained',
            'accuracy': float(accuracy),
            'model_artifact': model_b64,
            'labels': list(pipeline.named_steps['clf'].classes_)
        })

        return {
            "status": "success",
            "accuracy": float(accuracy),
            "project_id": project_id
        }

    except Exception as e:
        print(f"Training Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict(project_id: str = Form(...), text: str = Form(...)):
    try:
        # 1. Fetch model from Firestore
        project_ref = db.collection('projects').document(project_id)
        doc = project_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        data = doc.to_dict()
        model_b64 = data.get('model_artifact')
        
        # 2. Deserialize
        model_bytes = base64.b64decode(model_b64)
        pipeline = pickle.loads(model_bytes)
        
        # 3. Predict
        prediction = pipeline.predict([text])[0]
        probabilities = pipeline.predict_proba([text])[0]
        confidence = float(max(probabilities))

        # 4. Explainability (Feature Importance)
        tfidf = pipeline.named_steps['tfidf']
        clf = pipeline.named_steps['clf']
        feature_names = tfidf.get_feature_names_out()
        
        # Get the index of the predicted class
        class_idx = list(clf.classes_).index(prediction)
        
        # Calculate weights for this specific text
        transformed_text = tfidf.transform([text])
        weights = {}
        
        # Get word indices from the TF-IDF vector
        word_indices = transformed_text.indices
        for idx in word_indices:
            word = feature_names[idx]
            # weight = coef * tfidf_value
            weight = clf.coef_[class_idx][idx] * transformed_text[0, idx]
            weights[word] = float(weight)

        return {
            "prediction": str(prediction),
            "confidence": confidence,
            "weights": weights
        }
    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/download")
async def download_model(project_id: str):
    try:
        project_ref = db.collection('projects').document(project_id)
        doc = project_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        data = doc.to_dict()
        model_b64 = data.get('model_artifact')
        model_bytes = base64.b64decode(model_b64)
        
        return Response(
            content=model_bytes,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename=toddler_model_{project_id}.pkl"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
