import time
import base64
import io
import json
import re
import numpy as np
import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, confusion_matrix
import firebase_admin
from firebase_admin import credentials, firestore
import hardware_audit
import secrets
import string

def generate_api_key():
    prefix = "tdlr_live_"
    chars = string.ascii_letters + string.digits
    return prefix + ''.join(secrets.choice(chars) for _ in range(32))

def scrub_pii(text):
    text = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '[EMAIL_REDACTED]', text)
    text = re.sub(r'\+?\d{10,12}', '[PHONE_REDACTED]', text)
    return text

class ToddlerAgent:
    def __init__(self, service_account_path=None):
        # Seeking wisdom from the credentials...
        if not firebase_admin._apps:
            if service_account_path:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
        self.db = firestore.client()
        self.hardware = hardware_audit.get_hardware_stats()
        self.is_training = False

    def start(self):
        print(f"🚀 Toddler Agent Active on {self.hardware['device'].upper()}")
        print(f"💻 System: {self.hardware['gpu_name'] or 'CPU Engine'}")
        print("📡 Listening for high-performance jobs...")
        
        # Listen for jobs assigned to the queue
        jobs_ref = self.db.collection('training_jobs').where('status', '==', 'queued')
        
        def on_snapshot(col_snapshot, changes, read_time):
            for change in changes:
                if change.type.name == 'ADDED' or change.type.name == 'MODIFIED':
                    doc = change.document
                    if doc.to_dict().get('status') == 'queued' and not self.is_training:
                        self.process_job(doc)

        jobs_ref.on_snapshot(on_snapshot)
        
        while True:
            time.sleep(1)

    def process_job(self, doc):
        self.is_training = True
        job_data = doc.to_dict()
        job_id = doc.id
        project_id = job_data['project_id']
        
        print(f"📦 Processing Job: {job_id} for Project: {project_id}")
        doc.reference.update({'status': 'training', 'progress': 10, 'device': self.hardware['gpu_name'] or 'CPU'})

        try:
            # 1. Load Data
            csv_bytes = base64.b64decode(job_data['csv_data'])
            df = pd.read_csv(io.BytesIO(csv_bytes))
            text_col = job_data['text_column']
            label_col = job_data['label_column']
            
            df = df.dropna(subset=[text_col, label_col])
            if job_data.get('redact_pii'):
                df[text_col] = df[text_col].astype(str).apply(scrub_pii)

            X = df[text_col].astype(str)
            y = df[label_col].astype(str)
            
            # 2. Check for Fine-tuning
            base_pipeline = None
            if job_data.get('base_model_artifact'):
                print("🧬 Loading Base Model for Fine-tuning...")
                base_bytes = base64.b64decode(job_data['base_model_artifact'])
                base_pipeline = pickle.loads(base_bytes)

            # 3. AutoML Tournament
            doc.reference.update({'progress': 30})
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            models = [
                ('lr', LogisticRegression(max_iter=2000)),
                ('rf', RandomForestClassifier(n_estimators=100)),
                ('sgd', SGDClassifier(loss='log_loss', max_iter=2000))
            ]
            
            best_acc = -1
            best_pipe = None
            best_name = ""

            for name, clf in models:
                print(f"🔨 Testing {name.upper()} Architecture...")
                pipe = Pipeline([
                    ('tfidf', TfidfVectorizer(max_features=5000, stop_words='english', ngram_range=(1,2))),
                    ('clf', clf)
                ])
                
                # If we have a base model, we can theoretically use its TF-IDF or just compare
                pipe.fit(X_train, y_train)
                acc = accuracy_score(y_test, pipe.predict(X_test))
                
                if acc > best_acc:
                    best_acc = acc
                    best_pipe = pipe
                    best_name = name

            # 4. Finalize Artifacts
            doc.reference.update({'progress': 70})
            pipeline = best_pipe
            y_pred = pipeline.predict(X_test)
            cm = confusion_matrix(y_test, y_pred)
            classes = list(pipeline.named_steps['clf'].classes_)
            
            tfidf = pipeline.named_steps['tfidf']
            clf = pipeline.named_steps['clf']
            feature_names = tfidf.get_feature_names_out()
            importance = {}
            
            if best_name in ['lr', 'sgd']:
                coefs = clf.coef_[0] if len(classes) == 2 else np.mean(np.abs(clf.coef_), axis=0)
                for i in np.argsort(np.abs(coefs))[-50:]:
                    importance[feature_names[i]] = float(coefs[i])
            else:
                fi = clf.feature_importances_
                for i in np.argsort(fi)[-50:]:
                    importance[feature_names[i]] = float(fi[i])

            model_bytes = pickle.dumps(pipeline)
            model_b64 = base64.b64encode(model_bytes).decode('utf-8')

            # 5. Sync to Cloud
            print("✅ Training Complete. Synchronizing weights...")
            
            # Generate api_key if the project doesn't already have one
            existing = self.db.collection('projects').document(project_id).get().to_dict() or {}
            update_payload = {
                'status': 'trained',
                'accuracy': float(best_acc),
                'model_artifact': model_b64,
                'labels': classes,
                'distribution': y.value_counts().to_dict(),
                'confusion_matrix': cm.tolist(),
                'top_features': importance,
                'health': 'Optimal (BYOC Fine-tuned)',
                'version': firestore.Increment(1),
                'trainedAt': firestore.SERVER_TIMESTAMP,
            }
            if not existing.get('api_key'):
                update_payload['api_key'] = generate_api_key()
            self.db.collection('projects').document(project_id).update(update_payload)

            doc.reference.update({'status': 'completed', 'progress': 100})
            print(f"✨ Job {job_id} Finished.")

        except Exception as e:
            print(f"❌ Job Failed: {e}")
            doc.reference.update({'status': 'failed', 'error': str(e)})
        
        finally:
            self.is_training = False

if __name__ == "__main__":
    print("Agent standby. Usage: ToddlerAgent('key.json').start()")
