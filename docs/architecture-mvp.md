# Architecture (MVP - Legacy)

App (React Native, TypeScript)
- Screens: Scene, Read, Q&A, Settings
- Components: CaptureButton, StatusStrip, ModeChips, AudioControls
- Providers: IAIProvider interface + GeminiProvider implementation
- Services: telemetry, prompts, ttsPlayback
- Utils: imageDownscale, latencyTimer
- Store: mode, lastImage, settings

Backend (Node.js, Express)
- Routes: /describe, /ocr, /qa, /tts
- Provider module: gemini.ts (wraps Gemini API)
- Middleware: rateLimit, logging
- No image persistence; ephemeral handling

Provider interface (IAIProvider)
- describe({ image, options }): Promise<{ text, timings, tokens }>
- ocr({ image, options }): Promise<{ text, timings, tokens }>
- qa({ image, question, options }): Promise<{ text, timings, tokens }>
- tts({ text, voice, options }): Promise<{ audio, timings, tokens }>

API contracts
- POST /describe { image, mode, verbosity, language }
- POST /ocr { image, language }
- POST /qa { image, question, language }
- POST /tts { text, voice }

Privacy & Safety
- Ephemeral image data; redact PII in logs; opt-in telemetry

