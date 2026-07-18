#!/bin/bash
# Starts both the BYOC training agent (Firestore queue listener) and the FastAPI server.
set -e

# Start the agent in the background if the service account is configured.
if [ -n "$FIREBASE_SERVICE_ACCOUNT_JSON" ] || [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "[toddler] Starting BYOC training agent..."
  python agent_entry.py &
  AGENT_PID=$!
else
  echo "[toddler] Warning: FIREBASE_SERVICE_ACCOUNT_JSON not set; BYOC agent will not start."
fi

echo "[toddler] Starting FastAPI server on :${PORT:-7860}"
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-7860}"
