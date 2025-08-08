# Nadar MVP Scope and Acceptance Criteria

Goal
- Deliver a voice-first mobile companion that describes scenes, reads text, and answers short follow-ups in Moroccan Darija.

In Scope
- Modes: Scene Description, Read (OCR-first), Follow-up Q&A
- Voice-first UX: screen-reader friendly gestures; audio states; TTS for all outputs
- Prompts: mode-specific templates (Darija-first); verbosity control (Brief/Normal/Detailed)
- Provider: Gemini 2.5 Flash + TTS via thin backend wrapper; provider abstraction in code
- Privacy & Safety: ephemeral images; basic abuse control; safety-forward language
- Telemetry: anonymous latency/tokens/errors; quick “helpful?” capture

Out of Scope (MVP)
- Offline mode; smart model router; fine-tuned Darija model; identity recognition; cloud history

Acceptance Criteria
- Usability: ≥80% pilot users rate results “useful”
- TTS intelligibility: ≥85% Darija sentences rated “clear”
- Latency (4G/Wi‑Fi, median device): P50 Tap→Audio ≤ 3.5s; P95 ≤ 5.5s; P50 OCR ≤ 3.0s; P50 Scene ≤ 3.5s
- Reliability: Non-user-error failure < 2% requests; graceful error messaging
- Cost: ≤ $100/month for 20-user pilot (typical usage)

Latency Budget (targets)
- Prep (downscale/compress): 150–300ms
- Upload: 300–600ms
- Model reasoning: 1.5–2.2s
- TTS synth start: 600–900ms

Risks & Mitigations
- Latency spikes → client downscale; concise prompts; keep-alive; retry-once
- Darija quality → prompt cycles; uncertainty language; fallback to MSA/EN explicitly
- API rate/limits → simple backoff; informative errors
- Cost creep → brevity; cap daily usage in pilot

