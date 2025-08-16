# Cost Estimator Utility

The cost estimator utility analyzes telemetry data from the Nadar server to provide detailed cost breakdowns and performance metrics for Gemini AI and ElevenLabs TTS usage.

## Features

- **Token Estimation**: Estimates Gemini tokens using ~4 characters per token ratio
- **Cost Calculation**: Maps to current Gemini Flash/Live and ElevenLabs pricing (Flash v2.5 at 0.5 credits/char)
- **Performance Metrics**: P95 latency tracking and error rate analysis
- **Engine Comparison**: Breakdown by AI engine (Gemini Flash vs Live)
- **Cost Projections**: Hourly, daily, and monthly cost projections
- **Filtering**: Analyze data from specific time periods

## Usage

### Basic Usage

```bash
# Analyze default telemetry.log file
npm run cost-estimate

# Analyze specific log file
npm run cost-estimate -- --input path/to/telemetry.log

# Analyze only the last 7 days
npm run cost-estimate -- --input telemetry.log --days 7

# Show help
npm run cost-estimate -- --help
```

### Direct TypeScript Execution

```bash
# Run directly with ts-node
ts-node scripts/cost.ts --input sample-telemetry.log

# With time filtering
ts-node scripts/cost.ts --input logs/production.log --days 30
```

## Output Format

The utility provides a comprehensive report including:

### Request Statistics
- Total requests processed
- Success rate and error breakdown
- Time period analyzed

### Latency Statistics
- Average, P50, P95, and P99 response times
- Performance analysis across engines

### Cost Breakdown
- Gemini AI costs (input, output, image tokens)
- ElevenLabs TTS costs (character-based)
- Total cost and per-request averages

### Engine Comparison
- Request distribution across engines
- Cost and performance per engine
- Average latency by engine type

### Cost Projections
- Hourly usage rate
- Daily and monthly projections
- Cost optimization recommendations

## Pricing Information

The utility uses current pricing as of 2024:

### Gemini 2.5 Flash
- Input tokens: $0.075 per 1M tokens
- Output tokens: $0.30 per 1M tokens
- Image tokens: $0.075 per 1M tokens

### Gemini Live (Real-time)
- Input tokens: $0.15 per 1M tokens (2x Flash)
- Output tokens: $0.60 per 1M tokens (2x Flash)
- Image tokens: $0.15 per 1M tokens (2x Flash)

### ElevenLabs TTS
- ~$0.00004 per character (~25k characters per $1)

## Token Estimation

The utility estimates tokens using these methods:

1. **Text Tokens**: ~4 characters per token (rough approximation)
2. **Image Tokens**: ~10 tokens per KB of image data (very rough estimate)
3. **Input Tokens**: Estimated from system prompts and user input
4. **Output Tokens**: Calculated from response character count

> **Note**: Token estimates are approximations. Actual token usage may vary based on content complexity and language.

## Telemetry Data Format

The utility expects JSON lines format with telemetry data containing:

```json
{
  "ts": "2024-01-15T10:30:00.000Z",
  "mode": "assist",
  "engine": "gemini",
  "route_path": "/assist",
  "image_bytes": 45000,
  "audio_bytes_in": 0,
  "total_ms": 2500,
  "model_ms": 2000,
  "tts_ms": 500,
  "chars_out": 180,
  "ok": true,
  "provider_name": "gemini"
}
```

## Warnings and Recommendations

The utility provides automatic warnings for:

- **High Error Rate**: >5% error rate suggests system issues
- **High Latency**: P95 >5 seconds indicates performance problems
- **High Costs**: Monthly projections >$100 suggest cost optimization needed

## Testing

Run the test suite to verify functionality:

```bash
npm test -- src/scripts/cost.test.ts
```

## Sample Data

Use the included `sample-telemetry.log` for testing:

```bash
npm run cost-estimate -- --input sample-telemetry.log
```

This provides a realistic example of cost analysis output with mixed request types and engines.