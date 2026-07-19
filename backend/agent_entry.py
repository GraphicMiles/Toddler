"""Entry point for the BYOC training agent.

Loads the Firebase service account from the FIREBASE_SERVICE_ACCOUNT_JSON env
var (matches main.py), falls back to a file path if GOOGLE_APPLICATION_CREDENTIALS
is set, then starts the ToddlerAgent queue worker.

Modes (selected via CLI args or AGENT_MODE env var):
  --poll     Poll every AGENT_POLL_INTERVAL seconds (free-tier friendly).
  --once     Process one batch and exit (cron / HTTP-triggered).
  default    Firestore realtime listener mode (always-on hosts).
"""
import os
import sys
import json
import tempfile
import firebase_admin
from agent import ToddlerAgent

if __name__ == "__main__":
    cred_path = None
    cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if cred_json:
        cred_dict = json.loads(cred_json)
        tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False)
        json.dump(cred_dict, tmp)
        tmp.flush()
        cred_path = tmp.name
    elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        cred_path = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
    else:
        if not firebase_admin._apps:
            try:
                firebase_admin.initialize_app()
            except Exception as e:
                raise RuntimeError(
                    "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS "
                    f"to start the BYOC training agent. ({e})"
                )

    agent = ToddlerAgent(cred_path)
    if "--poll" in sys.argv:
        interval = int(os.getenv("AGENT_POLL_INTERVAL", "20"))
        agent.poll_loop(interval=interval)
    elif "--once" in sys.argv:
        result = agent.process_batch(limit=5)
        print(f"[agent] one-shot result: {result}")
    else:
        agent.start()
