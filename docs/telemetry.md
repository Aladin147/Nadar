# Telemetry and Evaluation

## Purpose

Measure latency, reliability, and cost efficiency while protecting user privacy.

## Current Schema

### Timing Fields

All endpoints emit structured timing data:

```json
{
  "inspection_ms": 1200,    // Vision analysis time
  "processing_ms": 800,     // LLM generation time
  "total_ms": 2000         // End-to-end request time
}
```

### Token Usage (when available)

Gemini providers return token consumption:

```json
{
  "input": 800,            // Input tokens consumed
  "output": 1200,          // Output tokens generated
  "total": 2000           // Total tokens
}
```

### TTS Metrics

When text-to-speech is used:

- `tts_ms`: TTS generation time
- `chars_out`: Character count for cost calculation

### Engine Tracking

- `engine`: "flash" | "live" | other (AI model used)
- Provider selection affects cost and latency

### Error Classification

Structured error codes for analysis:

- `INVALID_IMAGE`: Missing/malformed image data
- `IMAGE_NOT_FOUND`: Cached image reference expired
- `INSPECTION_ERROR`: Vision analysis failure
- `GENERATION_ERROR`: LLM response failure
- `NETWORK`, `TIMEOUT`, `QUOTA`: Transport/provider issues

## Data Collection

### Server-side Logging

Structured JSON logs written to `telemetry.log`:

```json
{
  "ts": "2025-08-15T23:53:03.279Z",
  "endpoint": "/api/assist-shared",
  "timing": { "inspection_ms": 1200, "processing_ms": 800, "total_ms": 2000 },
  "tokenUsage": { "input": 800, "output": 1200, "total": 2000 },
  "engine": "flash",
  "tts_ms": 160,
  "chars_out": 45,
  "error_code": null
}
```

### Client-side Cost Tracking

Real-time cost estimation in the demo app:

- Token usage → cost calculation using current pricing
- TTS character count → ElevenLabs Flash v2.5 pricing
- Displayed in CompactCostDisplay with detailed modal

## Analysis Tools

### Cost Analysis Script

`server/scripts/cost.ts` processes telemetry logs:

```bash
npm run cost-estimate -- --input telemetry.log --days 7
```

Provides:

- Request statistics and success rates
- P50/P95/P99 latency analysis
- Cost breakdown by provider (Gemini/ElevenLabs)
- Hourly/daily/monthly projections
- Engine performance comparison

### Pricing Constants

Synchronized across client and server:

- `apps/nadar-demo/src/utils/costTracker.ts`
- `server/src/utils/costAnalysis.ts`
- `server/scripts/cost.ts`

Current rates:

- Gemini 2.5 Flash: $0.075/M input, $0.30/M output, $0.075/M image
- ElevenLabs Flash v2.5: $0.000015 per character (0.5 credits/char)

## Privacy & Retention

- **No PII**: Image content not logged; only metadata
- **Ephemeral**: Images cached briefly, then discarded
- **Opt-in**: Telemetry collection requires explicit consent
- **Rotation**: Logs rotated to prevent unbounded growth

## Monitoring Targets

- **Latency**: P95 < 3-4 seconds for Wi-Fi users
- **Error Rate**: < 5% across all endpoints
- **Cost Efficiency**: Track per-request costs vs. quality
- **Accessibility**: Response time suitable for TTS playback

## References

- Cost analysis: `server/scripts/README.md`
- Pricing details: `docs/costs.md`
- API contracts: `docs/api.md`

