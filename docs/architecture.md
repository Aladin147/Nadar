# Architecture (Current — Shared Core)

This document describes the current architecture using a shared core with thin runtime adapters. It replaces the legacy MVP architecture (see architecture-mvp.md).

## Overview

- Shared business logic lives in `shared/` (runtime-agnostic)
- Thin adapters in `api/` expose Vercel serverless endpoints
- Server-side utilities and analysis live in `server/`
- React Native (Expo) client is in `apps/nadar-demo`

## Layers

1) Shared Core (shared/)
- Business logic for Assist/OCR/TTS
- Provider interfaces (AI, TTS, storage) and implementations
- Deterministic error mapping and telemetry emission

2) Runtime Adapters (api/*-shared.ts)
- 5–20 line endpoints that:
  - Parse/validate requests
  - Inject providers into core
  - Map core responses to HTTP JSON
- Endpoints:
  - POST /api/assist-shared
  - POST /api/ocr-shared
  - POST /api/tts-shared

3) Client (apps/nadar-demo)
- Screens: Welcome, Capture, Results, History, Settings
- Utilities: audio player (native+web), image downscale, cost tracker
- API client wrappers target the /api/*-shared endpoints

4) Server utilities (server/)
- Telemetry, cost analysis scripts (`server/scripts/cost.ts`)
- Operational helpers and pricing constants for reporting

## Data Flow (Assist)
1. App captures or selects image and calls /api/assist-shared with imageBase64 or imageRef
2. Adapter injects providers and calls shared core
3. Core runs inspection + generation; emits timing/token usage when available
4. Response includes:
   - speak (primary TTS-friendly text)
   - details[] (optional)
   - signals (ImageSignals)
   - followupToken (image reference for subsequent calls)
   - sessionId (optional)
   - timing, tokenUsage (when available)

## Image Cache & Follow-ups
- The API maintains an ephemeral cache of the last image via a token
- Prefer `followupToken` over "last" to avoid races between requests

## Error Codes
- INVALID_IMAGE, IMAGE_NOT_FOUND, INSPECTION_ERROR, GENERATION_ERROR, METHOD_NOT_ALLOWED
- NETWORK, TIMEOUT, QUOTA for transport/provider issues

## Telemetry & Costs
- Timing fields: inspection_ms, processing_ms, total_ms
- tokenUsage when provided by Gemini (input/output/total)
- Client cost tracker and server scripts use synchronized pricing constants
  - Gemini 2.5 Flash: $0.075/M input, $0.30/M output, $0.075/M image
  - ElevenLabs Flash v2.5: ~$0.015 per 1,000 chars

## Providers
- Vision/LLM: Gemini 2.5 Flash (thinking budget 0 for latency)
- TTS: ElevenLabs Flash v2.5 (primary); Gemini TTS supported

## Security & Privacy
- Ephemeral image handling; do not persist images server-side
- Structured error handling; minimal logs with no PII

## References
- API reference: docs/api.md
- Costs & pricing: docs/costs.md
- Shared core overview: shared/README.md

