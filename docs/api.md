# Nadar API Reference (Shared Endpoints)

This document defines the canonical request/response contracts for the shared API endpoints used by the demo app and server. All endpoints are available under the same base URL (Vercel serverless).

- Base URL (production): <https://nadar-server-hxtkpxxnd-aladin147s-projects.vercel.app>
- Content-Type: application/json
- Authentication: none (demo)
- Languages: `darija` (default), `ar`, `en`

## Common Objects

### ImageSignals

```json
{
  "has_text": true,
  "hazards": ["stairs"],
  "people_count": 0,
  "lighting_ok": true,
  "confidence": 0.92
}
```

### Timing

```json
{
  "inspection_ms": 1200,
  "processing_ms": 800,
  "total_ms": 2000
}
```

### TokenUsage (optional)

```json
{
  "input": 800,
  "output": 1200,
  "total": 2000
}
```

### Error shape

```json
{
  "error": "Missing imageRef",
  "err_code": "INVALID_IMAGE",
  "details": "Provide imageBase64 or followupToken"
}
```

---

## POST /api/assist-shared

Analyze an image (by reference or inline) and optionally answer a question.

Request (one of `imageRef` or `imageBase64` is required):

```json
{
  "sessionId": "abc123",
  "imageRef": "token123",
  "imageBase64": "...",
  "language": "darija",
  "question": "what is this?",
  "verbosity": "normal"
}
```

Response:

```json
{
  "speak": "A bag of rice on a kitchen counter.",
  "details": ["Brand: ..."],
  "signals": { "has_text": true, "hazards": [], "people_count": 0, "lighting_ok": true, "confidence": 0.9 },
  "followup_suggest": ["read text"],
  "followupToken": "token123",
  "sessionId": "abc123",
  "timing": { "inspection_ms": 1200, "processing_ms": 800, "total_ms": 2000 },
  "tokenUsage": { "input": 800, "output": 1200, "total": 2000 }
}
```

Errors: 400, 404, 405, 500 with error shape.

---

## POST /api/ocr-shared

Extract text from the cached image.

Request:

```json
{
  "sessionId": "abc123",
  "imageRef": "token123",
  "full": true,
  "language": "darija"
}
```

Response:

```json
{
  "text": "Ingredients: ...",
  "blocks": ["Ingredients:", "..."] ,
  "sessionId": "abc123",
  "timing": { "inspection_ms": 300, "processing_ms": 400, "total_ms": 700 }
}
```

Errors: 400, 404, 405, 500 with error shape.

---

## POST /api/tts-shared

Text-to-speech with Gemini TTS or ElevenLabs. Defaults to ElevenLabs Flash v2.5 for speed/cost.

Request:

```json
{
  "text": "Hello world",
  "voice": "Kore",
  "provider": "elevenlabs",
  "rate": 1.0
}
```

Response:

```json
{
  "audioBase64": "...",
  "mimeType": "audio/mpeg",
  "timing": { "processing_ms": 160, "total_ms": 220 }
}
```

Errors: 400, 500 with error shape.

---

## POST /api/session/clear

Clear rolling session memory and cached images.

Request:

```json
{
  "sessionId": "abc123"
}
```

Response:

```json
{
  "success": true,
  "message": "Session cleared",
  "sessionId": "abc123",
  "timestamp": "2025-08-15T23:53:03.279Z",
  "processingTime": 42
}
```

---

## Error Codes (mapping)

- INVALID_IMAGE: Missing/invalid image data
- IMAGE_NOT_FOUND: Provided `imageRef` not found or expired
- INSPECTION_ERROR: Vision analysis failure
- GENERATION_ERROR: LLM response generation failure
- METHOD_NOT_ALLOWED: Non-POST/unsupported method
- NETWORK, TIMEOUT, QUOTA: Transport/provider layer issues

---

## Notes

- Prefer `followupToken` over "last" for follow-up calls to ensure correct image reference
- `tokenUsage` appears when the provider returns usage metadata (Gemini)
- ElevenLabs defaults to Flash v2.5 (low latency, lower cost); see docs/costs.md

