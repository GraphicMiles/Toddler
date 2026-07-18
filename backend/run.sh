#!/bin/bash
# Starts the BYOC training agent + FastAPI server.
#
# AGENT_MODE env var picks the worker strategy:
#   listener — Firestore on_snapshot, for always-on paid hosting (default).
#   poll     — Polling every AGENT_POLL_INTERVAL seconds (works on free tier
#              where long-lived websockets get reaped).
#   off      — Don't start a background worker; rely on HTTP kick (/_agent/run)
#              or an external cron to drain the queue.
set -e

AGENT_MODE="${AGENT_MODE:-poll}"
AGENT_POLL_INTERVAL="${AGENT_POLL_INTERVAL:-20}"

start_agent() {
  if [ -n "$FIREBASE_SERVICE_ACCOUNT_JSON" ] || [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "[toddler] Starting BYOC training agent (mode=$AGENT_MODE, interval=${AGENT_POLL_INTERVAL}s)"
    if [ "$AGENT_MODE" = "poll" ]; then
      AGENT_POLL_INTERVAL="$AGENT_POLL_INTERVAL" python agent_entry.py --poll &
    elif [ "$AGENT_MODE" = "listener" ]; then
      python agent_entry.py &
    else
      echo "[toddler] AGENT_MODE=off — background worker disabled"
    fi
    AGENT_PID=$!
  else
    echo "[toddler] Warning: FIREBASE_SERVICE_ACCOUNT_JSON not set; BYOC agent will not start."
  fi
}

start_agent

# Reap agent on exit
trap 'if [ -n "$AGENT_PID" ]; then kill "$AGENT_PID" 2>/dev/null || true; fi' EXIT

echo "[toddler] Starting FastAPI server on :${PORT:-7860}"
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-7860}"
