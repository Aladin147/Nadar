# Costs & Pricing

This document centralizes pricing assumptions and how the app estimates/records costs.

## Providers & Pricing (current)

- Gemini 2.5 Flash (text+vision)
  - Input tokens: $0.075 per 1M tokens
  - Output tokens: $0.30 per 1M tokens
  - Image tokens: $0.075 per 1M tokens
- Gemini Live
  - Input: $0.15 per 1M tokens
  - Output: $0.60 per 1M tokens
  - Image: $0.15 per 1M tokens
- ElevenLabs Flash v2.5 (TTS)
  - 0.5 credits per character
  - ~$0.015 per 1,000 characters (plan-dependent)

Notes:
- ElevenLabs pricing varies by plan; we use 0.5 credits/char as default for Flash v2.5.
- Update these values if providers change pricing.

## Client-side Cost Tracker (apps/nadar-demo)

- Uses constants in `apps/nadar-demo/src/utils/costTracker.ts`
- Tracks per-request token estimates and TTS character counts
- Displays a compact summary in the Results screen with a detail modal

Token estimation:
- Roughly 4 characters per token for Gemini estimation (heuristic)

## Server-side Cost Analysis

- Scripts in `server/scripts/cost.ts` and compiled `cost.js`
- Reads structured telemetry logs
- Aggregates token estimates, TTS characters, and computes costs using the same pricing constants

## Telemetry Fields

- timing: inspection_ms, processing_ms, total_ms
- tokenUsage (optional): input, output, total (from provider)
- engine: "flash" | "live" | other
- tts_ms: number (if TTS used)
- chars_out: number (tts character count)

## Updating Pricing

1. Change constants in:
   - apps/nadar-demo/src/utils/costTracker.ts
   - server/src/utils/costAnalysis.ts
   - server/scripts/cost.ts (and recompile if needed)
2. Note change here with date + rationale.

## Example

- 3,000 output tokens (Gemini Flash): 3,000 / 1,000,000 * $0.30 = $0.0009
- 1,200 input tokens: 1,200 / 1,000,000 * $0.075 = $0.00009
- 600 image tokens: 600 / 1,000,000 * $0.075 = $0.000045
- 800 TTS characters (EL Flash v2.5): 800 * $0.000015 = $0.012
- Total ≈ $0.0130

