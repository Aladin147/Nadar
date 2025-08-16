# Nadar — AI‑Powered Visual Assistance

Nadar is a voice‑first assistive application that helps blind and low‑vision users understand their surroundings using the device camera and on‑device/gallery images. The project consists of a cross‑platform React Native (Expo) client and a TypeScript/Express server that wraps foundation models for vision understanding (Gemini) and text‑to‑speech (Gemini TTS with optional ElevenLabs fallback).

This README provides a technical overview for developers: architecture, setup, build, testing, endpoints, and operational guidance.

## 🎯 Recent Improvements (2024)

### Phase 1: Critical Bug Fixes

- ✅ Fixed server routes error code mapping to preserve ProviderError codes
- ✅ Resolved Jest process leak in server tests with timer cleanup
- ✅ Fixed client HTTP method mismatch for getTTSProviders()
- ✅ Removed broken package scripts from app/package.json

### Phase 2: API & Error Handling

- ✅ Enhanced client error parsing to propagate server err_code values
- ✅ Fixed SettingsScreen server communication for mobile devices
- ✅ Optimized server version endpoint with cached git information
- ✅ Improved error handling consistency across client-server communication

### Phase 3: Code Quality & Testing

- ✅ DRY vision routes implementation with shared handler
- ✅ Added comprehensive GitHub Actions CI workflow for app package
- ✅ Fixed dependencies classification (moved @types/cors to devDependencies)
- ✅ Added environment configuration examples with server/.env.example

### Phase 4: Performance & UX

- ✅ Optimized network discovery with bounded concurrency and early termination
- ✅ Added image cache memory cap with LRU eviction
- ✅ Reviewed and adjusted rate limits based on usage patterns
- ✅ Enhanced resource utilization efficiency

### Phase 5: Infrastructure & Documentation

- ✅ Complete accessibility testing framework with VoiceOver/TalkBack procedures
- ✅ Production-ready Docker configurations with multi-stage builds
- ✅ Comprehensive deployment guide covering cloud platforms and VPS setup
- ✅ Enhanced telemetry system with consistent error codes and debugging info
- ✅ App linting and formatting setup with ESLint + Prettier integration

---

## Repository layout

- apps/nadar-demo — React Native (Expo) client
  - src/
    - screens/ — Welcome, Capture, Results, History, Settings
    - app/ — UI kit, theme, state, navigation
    - api/ — API client (fetch wrappers)
    - utils/ — audio, downscale, discovery helpers
- api/ — Vercel serverless endpoints (thin adapters)
  - /assist-shared.ts, /ocr-shared.ts, /tts-shared.ts (inject into shared core)
- server/ — Node.js (TypeScript) API & scripts
  - src/
    - utils/, scripts/, telemetry, cost analysis tools
- shared/ — Shared core business logic & providers
- docs/ — architecture, API reference, costs, telemetry (see docs/README.md)
- README-MOBILE.md — mobile testing & setup guide (canonical: docs/mobile-setup.md)

---

## Core features

- Scene description — structured short outputs optimized for mobility and safety
- OCR — concise reading of text with optional summary prompt
- Q&A — ask a specific question about the scene
- TTS — text‑to‑speech playback (Gemini TTS, optional ElevenLabs fallback)
- History — minimal in-memory history recording on client for MVP
- Accessibility — consolidated onboarding, large touch targets, focused flows

## 📚 Enhanced Documentation

- **[Accessibility Testing Guide](docs/accessibility-testing.md)** — Comprehensive VoiceOver/TalkBack testing procedures, performance targets, and systematic validation
- **[API Reference](docs/api-reference.md)** — Complete endpoint documentation with examples, error codes, rate limits, and SDK integration patterns
- **[Deployment Guide](docs/deployment-guide.md)** — Production deployment instructions for Docker, cloud platforms, VPS setup, and monitoring

## 🐳 Docker Support

Nadar now includes production-ready Docker configurations:

- **Multi-stage builds** with security hardening and health checks
- **Development environment** with hot reload and debugging support
- **Docker Compose** orchestration with networking, monitoring, and scaling options
- **Automated setup script** (`docker-setup.sh`) for easy environment management

Quick start with Docker:

```bash
# Development environment
./docker-setup.sh dev

# Production environment
./docker-setup.sh prod

# With monitoring (Prometheus + Grafana)
./docker-setup.sh monitoring
```

---

## Architecture overview

Client (Expo/React Native)

- CameraView (Expo) for capture on mobile; image picker on web
- Segmented modes: scene | ocr | qa
- Results screen with structured sections and TTS playback
- Settings screen stores API base, language, verbosity, TTS provider
- State: lightweight context in app/src/app/state
- UI Kit aligned to the design guide (theme.ts, Card/Button/Chip/etc.)

Server (Express + TypeScript)

- Providers implement IAIProvider interface
  - GeminiProvider — vision and TTS (primary)
  - ElevenLabsProvider — optional TTS fallback
  - HybridProvider — orchestrates provider selection/fallback
- Routes: /describe, /ocr, /qa, /tts (zod input validation)
- Ops: morgan logging, express-rate-limit, CORS, JSON body parser
- Enhanced telemetry with consistent error codes, route paths, and debugging info
- Comprehensive error handling with ProviderError preservation

## 🧪 Testing & Quality Assurance

- **Server**: 27 comprehensive tests covering providers, error handling, and telemetry
- **App**: Jest + Expo testing setup with utility function validation
- **CI/CD**: GitHub Actions workflows for both server and app packages
- **Code Quality**: ESLint + Prettier integration with consistent formatting rules
- **Type Safety**: Strict TypeScript configuration with comprehensive type checking

---

## Server: configuration

Environment variables (server/.env or process env):

- GEMINI_API_KEY — required for Gemini models
- GEMINI_TIMEOUT_MS — optional, default 30000
- GEMINI_TTS_TIMEOUT_MS — optional, default 20000
- ELEVENLABS_API_KEY — optional (enables ElevenLabs TTS fallback)
- PORT — optional, default 4000

Server binds to 0.0.0.0:PORT for LAN/tunnel access.

---

## App: configuration

- EXPO_PUBLIC_API_BASE — optional override for default API base on web
- On mobile, API base is set in Settings (persisted). A Mobile Setup screen guides discovery or manual entry.

---

## Install & run

Requirements

- Node.js 20+
- npm 10+
- Expo Go (for device testing)

Install

- Server
  - cd server && npm install
- App
  - cd app && npm install

Development

- Server (dev, ts-node):
  - cd server && npm run dev
- App (web):
  - cd app && npm run web
- App (Expo Go with tunnel):
  - cd app && npm run mobile

Build

- Server (TypeScript → dist):
  - cd server && npm run build
- Start built server:
  - node dist/index.js

Mobile connectivity

- See README-MOBILE.md and docs/mobile-setup.md for LAN vs tunnel setup, auto‑discovery, and troubleshooting.

---

## HTTP API (server)

Base URL: `http://HOST:4000` (example)

- GET /health → { ok: true }

**Note**: Current production API uses `/api/*-shared` endpoints. See `docs/api.md` for complete reference.

Legacy server endpoints (if running locally):

- POST /describe
- POST /ocr
- POST /qa
- POST /tts

Notes:

- Requests enforce timeouts to keep latency predictable
- Current production uses shared-core architecture with Vercel serverless endpoints
- HybridProvider decides how to serve TTS (Gemini primary; ElevenLabs if configured)

---

## Client internals (selected)

- CaptureScreen — camera/web upload, mode selection, dispatches API calls
- ResultsScreen — shows structured output, actions (copy/share/tts)
- SettingsScreen — API base, language, verbosity, TTS provider; connection test
- MobileSetupScreen — auto‑discovery and manual configuration helpers
- API client — app/src/api/client.ts (resolveApiBase, retry, health test)

---

## Testing

Server

- Unit tests (jest, ts-jest configured)
- Run: cd server && npm test

App

- Jest + jest-expo scaffolded (expand with component tests as features grow)
- Run: cd app && npm test

---

## Troubleshooting

CI: lockfile mismatch

- Regenerate app/server package-lock.json with `npm install` in each package

Mobile cannot reach server

- Ensure both devices on same LAN and server bound to 0.0.0.0
- Use `npm run mobile` (tunnel) as a fallback for quick tests
- Use Settings → Test Connection or MobileSetup auto‑discovery

Camera/Photo permissions

- Re‑run onboarding from Landing screen, accept camera & library permissions

---

## Security & secrets

- Do not commit API keys or prompt files
- .gitignore excludes common key/cert patterns, Sys_Prompts, and prototype HTMLs
- If a sensitive file was added, run `git rm --cached <file>` then commit

---

## Conventions

- TypeScript strict across server/client
- Accessible, focused UX; avoid adding friction to core flow
- Commit messages: conventional commits (feat/fix/docs/chore)

---

## License

TBD.