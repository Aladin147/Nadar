# Telemetry and Evaluation

Purpose
- Measure latency, reliability, and usefulness. Protect privacy.

Metrics (anonymous)
- Request ID, timestamp, mode, device hints
- Timings: prep, upload, model, tts, total
- Token counts: input/output; model IDs
- Result length; error codes/classes
- Feedback: helpful? (yes/no)

Retention
- Minimal; rotate logs; opt-in only

Instrumentation
- App: wraps each request with timers; emits events
- Backend: request/response timing, error classification

Dashboards (initial)
- P50/P95 latencies per mode
- Error rate by class
- Usage by mode and by hour
- Token cost projections

