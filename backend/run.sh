#!/bin/sh
set -eu
# The control plane must never execute training jobs. Device/cloud runners are
# separate processes and claim work transactionally through the API.
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-7860}"
