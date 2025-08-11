# Nadar API Reference

## Overview

The Nadar API provides vision AI capabilities including image description, OCR, and visual question answering, plus text-to-speech services. All endpoints accept JSON payloads and return structured responses with telemetry data.

**Base URL**: `http://localhost:4000` (development)  
**Content-Type**: `application/json`  
**Rate Limits**: Tiered by endpoint type (see [Rate Limiting](#rate-limiting))

## Authentication

Currently, no authentication is required. The API is designed for local network usage during development.

## Common Request Patterns

### Image Submission
Images can be provided in two ways:

1. **Direct Base64**: Include `imageBase64` field with base64-encoded image data
2. **Session Reference**: Use `imageRef: "last"` with `sessionId` to reference a previously uploaded image

### Session Management
Include a `sessionId` (any string) to enable image caching for follow-up requests:

```json
{
  "sessionId": "user-session-123",
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
  "mimeType": "image/jpeg"
}
```

## Endpoints

### Health Check

**GET** `/health`

Returns server health status.

**Response:**
```json
{
  "ok": true
}
```

**Rate Limit**: 300 requests/minute

---

### Version Information

**GET** `/version`

Returns server version and build information.

**Response:**
```json
{
  "commit": "a1b2c3d4e5f6...",
  "builtAt": "2024-01-15T10:30:00.000Z"
}
```

**Rate Limit**: 300 requests/minute

---

### Image Description

**POST** `/describe`

Generates natural language descriptions of images.

**Request Body:**
```json
{
  "imageBase64": "base64-encoded-image-data",
  "mimeType": "image/jpeg",
  "sessionId": "optional-session-id",
  "options": {
    "language": "darija",
    "verbosity": "detailed"
  }
}
```

**Parameters:**
- `imageBase64` (string, conditional): Base64-encoded image data
- `imageRef` (string, conditional): Use `"last"` to reference cached image
- `sessionId` (string, optional): Session identifier for image caching
- `mimeType` (string, optional): Image MIME type, defaults to `image/jpeg`
- `options` (object, optional):
  - `language` (string): `"darija"`, `"english"`, `"french"`, `"arabic"`
  - `verbosity` (string): `"brief"`, `"detailed"`

**Response:**
```json
{
  "text": "A detailed description of the image...",
  "structured": {
    "immediate": "Quick safety/navigation info",
    "objects": ["person", "car", "building"],
    "navigation": "Spatial layout description"
  },
  "timings": {
    "model": 1250,
    "total": 1300
  }
}
```

**Rate Limit**: 30 requests/minute

---

### Optical Character Recognition (OCR)

**POST** `/ocr`

Extracts text from images.

**Request Body:**
```json
{
  "imageBase64": "base64-encoded-image-data",
  "mimeType": "image/jpeg",
  "sessionId": "optional-session-id",
  "options": {
    "language": "darija"
  }
}
```

**Query Parameters:**
- `full` (boolean): Set to `true` for detailed OCR with formatting

**Response:**
```json
{
  "text": "Extracted text content...",
  "timings": {
    "model": 800,
    "total": 850
  }
}
```

**Rate Limit**: 30 requests/minute

---

### Visual Question Answering

**POST** `/qa`

Answers questions about image content.

**Request Body:**
```json
{
  "imageBase64": "base64-encoded-image-data",
  "question": "What color is the car?",
  "mimeType": "image/jpeg",
  "sessionId": "optional-session-id",
  "options": {
    "language": "darija"
  }
}
```

**Parameters:**
- `question` (string, required): Question about the image
- Other parameters same as `/describe`

**Response:**
```json
{
  "text": "The car is blue.",
  "timings": {
    "model": 950,
    "total": 1000
  }
}
```

**Rate Limit**: 30 requests/minute

---

### Text-to-Speech

**POST** `/tts`

Converts text to speech audio.

**Request Body:**
```json
{
  "text": "Text to convert to speech",
  "options": {
    "provider": "elevenlabs",
    "voice": "default",
    "rate": 1.0
  }
}
```

**Parameters:**
- `text` (string, required): Text to synthesize
- `options` (object, optional):
  - `provider` (string): `"elevenlabs"` or `"gemini"`
  - `voice` (string): Voice identifier
  - `rate` (number): Speech rate (0.5-2.0)

**Response:**
- **Content-Type**: `audio/mpeg` or `audio/wav`
- **Body**: Binary audio data

**Rate Limit**: 120 requests/minute

---

### TTS Provider Configuration

**POST** `/tts/provider`

Updates the server's TTS provider preference.

**Request Body:**
```json
{
  "provider": "elevenlabs"
}
```

**Response:**
```json
{
  "provider": "elevenlabs",
  "message": "TTS provider updated successfully"
}
```

**Rate Limit**: 120 requests/minute

---

## Error Handling

All endpoints return structured error responses with specific error codes:

```json
{
  "message": "Human-readable error message",
  "err_code": "SPECIFIC_ERROR_CODE"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_INPUT` | Request validation failed | 400 |
| `NO_IMAGE` | No image provided or cached image not found | 400 |
| `RATE_LIMIT_GENERAL` | General rate limit exceeded | 429 |
| `RATE_LIMIT_VISION` | Vision endpoint rate limit exceeded | 429 |
| `RATE_LIMIT_HEALTH` | Health endpoint rate limit exceeded | 429 |
| `NETWORK` | Network connectivity issues | 500 |
| `TIMEOUT` | Request timeout | 500 |
| `QUOTA` | API quota exceeded | 500 |
| `PROVIDER_ERROR` | Upstream provider error | 500 |

## Rate Limiting

The API implements tiered rate limiting:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General | 120 requests | 1 minute |
| Vision (`/describe`, `/ocr`, `/qa`) | 30 requests | 1 minute |
| Health (`/health`, `/version`, `/debug/*`) | 300 requests | 1 minute |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit for the current window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the current window resets

## Response Format

All successful responses include:
- **Primary Data**: Main response content (`text`, `structured`, etc.)
- **Timings**: Performance metrics in milliseconds
- **Metadata**: Additional context when applicable

## Image Caching

Images are cached server-side for 2 minutes when a `sessionId` is provided:
- **Cache Size**: Maximum 50 entries with LRU eviction
- **TTL**: 2 minutes from last access
- **Usage**: Enables follow-up questions without re-uploading images

## Debug Endpoints

### Cache Statistics

**GET** `/debug/cache`

Returns image cache statistics.

**Response:**
```json
{
  "imageCache": {
    "size": 5,
    "maxEntries": 50,
    "ttlMs": 120000
  }
}
```

**Rate Limit**: 300 requests/minute

---

## SDK Integration

For React Native apps, use the provided client:

```typescript
import { describe, ocr, qa, tts } from './api/client';

// Image description
const result = await describe({
  imageBase64: base64Image,
  options: { language: 'darija', verbosity: 'detailed' }
});

// Follow-up question
const answer = await qa({
  imageRef: 'last',
  sessionId: 'user-session',
  question: 'What color is the car?'
});
```

## Environment Variables

See `.env.example` files for configuration options:
- `GEMINI_API_KEY`: Required for vision and TTS
- `ELEVENLABS_API_KEY`: Optional for enhanced TTS
- `PORT`: Server port (default: 4000)
- `GEMINI_TIMEOUT_MS`: Vision request timeout
- `GEMINI_TTS_TIMEOUT_MS`: TTS request timeout

## Examples

### Complete Image Analysis Workflow

```bash
# 1. Upload and describe image
curl -X POST http://localhost:4000/describe \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo-session",
    "imageBase64": "'$(base64 -i photo.jpg)'",
    "mimeType": "image/jpeg",
    "options": {
      "language": "darija",
      "verbosity": "detailed"
    }
  }'

# 2. Ask follow-up question using cached image
curl -X POST http://localhost:4000/qa \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo-session",
    "imageRef": "last",
    "question": "How many people are in this image?",
    "options": {
      "language": "darija"
    }
  }'

# 3. Convert description to speech
curl -X POST http://localhost:4000/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Description text from step 1",
    "options": {
      "provider": "elevenlabs",
      "rate": 1.0
    }
  }' \
  --output description.mp3
```

### Error Handling Example

```javascript
try {
  const result = await fetch('/describe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64Image })
  });

  if (!result.ok) {
    const error = await result.json();
    console.error(`Error ${error.err_code}: ${error.message}`);

    // Handle specific error types
    switch (error.err_code) {
      case 'RATE_LIMIT_VISION':
        // Wait and retry
        break;
      case 'NO_IMAGE':
        // Prompt user to select image
        break;
      case 'QUOTA':
        // Show quota exceeded message
        break;
    }
  }
} catch (networkError) {
  console.error('Network error:', networkError);
}
```
