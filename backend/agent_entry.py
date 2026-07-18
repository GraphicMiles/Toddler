"""Entry point for the BYOC training agent.

Loads the Firebase service account from the FIREBASE_SERVICE_ACCOUNT_JSON env
var (matches main.py), falls back to a file path if GOOGLE_APPLICATION_CREDENTIALS
is set, then starts the ToddlerAgent queue listener.
"""
import os
import json
import tempfile
import firebase_admin
from agent import ToddlerAgent

if __name__ == "__main__":
    cred_path = None
    cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if cred_json:
        # Write to a temp file because ToddlerAgent expects a path
        cred_dict = json.loads(cred_json)
        tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False)
        json.dump(cred_dict, tmp)
        tmp.flush()
        cred_path = tmp.name
    elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        cred_path = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
    else:
        # Let firebase_admin.initialize_app() use default ADC
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        # Can't run agent without db; bail out loudly
        raise RuntimeError(
            "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS "
            "to start the BYOC training agent."
        )

    ToddlerAgent(cred_path).start()
