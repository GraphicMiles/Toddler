# Free-tier operations

## Render cold starts
Create external 5–10 minute checks for both `CONTROL_URL/health` and `INFERENCE_URL/health`. This is a zero-bill workaround, not an availability guarantee. Monitor job-created-to-dispatched latency.

## Firestore
Review Firebase Usage daily during launch. Alerts/watch points: 40,000 reads/day and 16,000 writes/day. Heartbeats are foreground/training only: idle foreground every 5 minutes; training every 30–60 seconds. Progress writes occur only at 5 percentage-point boundaries. Queue queries must include `ownerUid`.

## Cloudinary
The free pool is shared storage, bandwidth, and transformations. Review the Cloudinary usage dashboard weekly and at 20/25 credits. Raw artifact limits vary by plan and account; verify the account's current raw upload limit before enabling any model whose artifact can exceed it. Large uploads must use Cloudinary's chunked `upload_large` flow. Delete assets when their dataset/project is explicitly deleted.

## Deployment separation
The control-plane service runs `backend/main.py`. The inference service runs `backend/inference_service/main.py`. Do not deploy the agent in the control-plane container.
