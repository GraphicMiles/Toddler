"""Toddler BYOC training agent.

Can run in three modes:
1. Long-lived listener (run.sh / agent_entry.py) — uses Firestore on_snapshot,
   suited for always-on paid hosting.
2. Polling worker   — `process_one()` / `process_batch()` are synchronous
   helpers the REST API calls. Works on serverless / free-tier hosts where
   long-lived connections get killed.
3. Test loop        — `poll_loop()` polls Firestore every N seconds.

Kept as a single file so it can be imported from the FastAPI app or run
standalone.
"""
import time
import base64
import io
import json
import re
import os
import threading
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
import secrets
import string

try:
    import hardware_audit  # type: ignore
except Exception:  # hardware_audit is optional
    hardware_audit = None


def generate_api_key():
    prefix = "tdlr_live_"
    chars = string.ascii_letters + string.digits
    return prefix + ''.join(secrets.choice(chars) for _ in range(32))


def scrub_pii(text):
    text = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '[EMAIL_REDACTED]', text)
    text = re.sub(r'\+?\d{10,12}', '[PHONE_REDACTED]', text)
    return text


def _get_db(service_account_path=None):
    """Return a firestore client, initializing firebase_admin if needed."""
    if not firebase_admin._apps:
        if service_account_path:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        else:
            # JSON in env?
            cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            if cred_json:
                cred_dict = json.loads(cred_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
            else:
                try:
                    firebase_admin.initialize_app()
                except Exception:
                    return None
    try:
        return firestore.client()
    except Exception:
        return None


class ToddlerAgent:
    def __init__(self, service_account_path=None):
        self.db = _get_db(service_account_path)
        self.hardware = (hardware_audit.get_hardware_stats()
                         if hardware_audit else
                         {"device": "cpu", "gpu_name": None})
        self.is_training = False
        self._lock = threading.Lock()

    # ---------------- training core (sync, callable from anywhere) ----------------
    def process_job(self, doc):
        """Train one job document. Safe to call from polling or the listener.

        Atomically claims the job from queued/awaiting_device so a BYOC phone
        and the server agent can't both train the same job.
        """
        with self._lock:
            if self.is_training:
                return False
            self.is_training = True
        try:
            # Atomically transition the job to 'training' only if it's still
            # available. If a phone already claimed it, bail out.
            db = self.db
            txn = db.transaction()

            @firestore.transactional
            def _claim(t, ref):
                snap = t.get(ref)
                if not snap.exists:
                    return None
                s = snap.to_dict() or {}
                if s.get("status") not in ("queued", "awaiting_device"):
                    return None
                t.update(ref, {"status": "training", "progress": 10,
                               "device": self.hardware.get('gpu_name') or 'CPU',
                               "claimedAt": firestore.SERVER_TIMESTAMP})
                return s

            claimed = _claim(txn, doc.reference)
            if claimed is None:
                print(f"[agent] Job {doc.id} already claimed by another worker — skipping")
                return False

            job_data = {**claimed, **(doc.to_dict() or {})}
            job_id = doc.id
            project_id = job_data['project_id']
            print(f"[agent] Processing job {job_id} for project {project_id}")

            # 1. Load data
            csv_bytes = base64.b64decode(job_data['csv_data'])
            df = pd.read_csv(io.BytesIO(csv_bytes))
            text_col = job_data['text_column']
            label_col = job_data['label_column']
            df = df.dropna(subset=[text_col, label_col])
            if job_data.get('redact_pii'):
                df[text_col] = df[text_col].astype(str).apply(scrub_pii)
            X = df[text_col].astype(str)
            y = df[label_col].astype(str)

            doc.reference.update({'progress': 30})
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42)

            # 2. AutoML tournament (smaller ensemble for 512MB free tier)
            models = [
                ('sgd', SGDClassifier(loss='log_loss', max_iter=1000, tol=1e-3)),
                ('lr', LogisticRegression(max_iter=1000, C=1.0, solver='liblinear')),
            ]
            # Only add RandomForest if dataset is small and memory allows
            if len(df) <= 20000:
                models.append(('rf', RandomForestClassifier(n_estimators=50, n_jobs=1)))

            best_acc, best_pipe, best_name = -1, None, ""
            for name, clf in models:
                print(f"[agent]   training {name}…")
                pipe = Pipeline([
                    ('tfidf', TfidfVectorizer(max_features=3000,
                                              stop_words='english',
                                              ngram_range=(1, 2))),
                    ('clf', clf)
                ])
                pipe.fit(X_train, y_train)
                acc = accuracy_score(y_test, pipe.predict(X_test))
                if acc > best_acc:
                    best_acc, best_pipe, best_name = acc, pipe, name

            # 3. Build explainability payload
            doc.reference.update({'progress': 70})
            classes = list(best_pipe.named_steps['clf'].classes_)
            cm = confusion_matrix(y_test, best_pipe.predict(X_test))

            tfidf = best_pipe.named_steps['tfidf']
            clf = best_pipe.named_steps['clf']
            feature_names = tfidf.get_feature_names_out()
            importance = {}
            try:
                if best_name in ('lr', 'sgd'):
                    coefs = clf.coef_[0] if len(classes) == 2 else np.mean(np.abs(clf.coef_), axis=0)
                    for i in np.argsort(np.abs(coefs))[-50:]:
                        importance[str(feature_names[i])] = float(coefs[i])
                elif best_name == 'rf':
                    fi = clf.feature_importances_
                    for i in np.argsort(fi)[-50:]:
                        importance[str(feature_names[i])] = float(fi[i])
            except Exception as e:
                print(f"[agent] feature importance skipped: {e}")

            model_b64 = base64.b64encode(pickle.dumps(best_pipe)).decode('utf-8')

            # 4. Sync to project doc
            existing = self.db.collection('projects').document(project_id).get().to_dict() or {}
            payload = {
                'status': 'trained',
                'accuracy': float(best_acc),
                'model_artifact': model_b64,
                'labels': classes,
                'distribution': y.value_counts().to_dict(),
                'confusion_matrix': cm.tolist(),
                'top_features': importance,
                'health': 'Optimal',
                'version': firestore.Increment(1),
                'trainedAt': firestore.SERVER_TIMESTAMP,
            }
            if not existing.get('api_key'):
                payload['api_key'] = generate_api_key()
            self.db.collection('projects').document(project_id).update(payload)
            doc.reference.update({'status': 'completed', 'progress': 100})
            print(f"[agent] Job {job_id} completed ({best_name}, acc={best_acc:.3f})")
            return True

        except Exception as e:
            print(f"[agent] Job failed: {e}")
            try:
                doc.reference.update({'status': 'failed', 'error': str(e), 'progress': 0})
            except Exception:
                pass
            return False
        finally:
            self.is_training = False

    # ---------------- dispatch helpers ----------------
    def pending_jobs(self, limit=5):
        """Return up to `limit` queued jobs, oldest first."""
        if self.db is None:
            return []
        try:
            try:
                q = (self.db.collection('training_jobs')
                     .where('status', 'in', ['queued', 'awaiting_device'])
                     .order_by('createdAt')
                     .limit(limit))
                results = list(q.stream())
                if results:
                    return results
            except Exception as idx_err:
                print(f"[agent] ordered query unavailable ({idx_err}); falling back")
            q = (self.db.collection('training_jobs')
                 .where('status', 'in', ['queued', 'awaiting_device'])
                 .limit(max(limit * 5, 50)))
            rows = list(q.stream())
            def _key(d):
                ts = (d.to_dict() or {}).get('createdAt')
                try:
                    return ts.timestamp() if hasattr(ts, 'timestamp') else 0
                except Exception:
                    return 0
            rows.sort(key=_key)
            return rows[:limit]
        except Exception as e:
            print(f"[agent] pending_jobs error: {e}")
            return []

    def process_batch(self, limit=1):
        """Process up to `limit` queued jobs now (used by the REST kick endpoint)."""
        if self.db is None:
            return {"ok": False, "error": "Firestore not configured"}
        done = []
        for doc in self.pending_jobs(limit=limit):
            if self.process_job(doc):
                done.append(doc.id)
        return {"ok": True, "processed": done, "is_training": self.is_training}

    # ---------------- long-running modes ----------------
    def start(self):
        """Firestore realtime listener mode (always-on hosts)."""
        if self.db is None:
            raise RuntimeError("Cannot start listener without a Firestore client.")
        print(f"[agent] Starting BYOC listener on {self.hardware.get('device','cpu').upper()}")
        jobs_ref = self.db.collection('training_jobs').where('status', '==', 'queued')

        def on_snapshot(col_snapshot, changes, read_time):
            for change in changes:
                if change.type.name in ('ADDED', 'MODIFIED'):
                    doc = change.document
                    if doc.to_dict().get('status') == 'queued' and not self.is_training:
                        # Spawn in thread so the listener doesn't block
                        threading.Thread(target=self.process_job, args=(doc,), daemon=True).start()

        jobs_ref.on_snapshot(on_snapshot)
        while True:
            time.sleep(1)

    def poll_loop(self, interval=15, burst=1):
        """Polling mode — works on every host (incl. free tier where long-lived
        websockets are killed). Checks every `interval` seconds and processes
        up to `burst` pending jobs."""
        if self.db is None:
            raise RuntimeError("Cannot poll without a Firestore client.")
        print(f"[agent] Polling every {interval}s…")
        while True:
            try:
                self.process_batch(limit=burst)
            except Exception as e:
                print(f"[agent] poll error: {e}")
            time.sleep(interval)


if __name__ == "__main__":
    import sys
    agent = ToddlerAgent()
    if "--poll" in sys.argv:
        interval = int(os.getenv("AGENT_POLL_INTERVAL", "15"))
        agent.poll_loop(interval=interval)
    elif "--once" in sys.argv:
        # Run one batch and exit (useful for cron/HTTP-triggered workers)
        result = agent.process_batch(limit=5)
        print(f"[agent] one-shot result: {result}")
    else:
        agent.start()
