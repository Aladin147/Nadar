# Nadar — AI‑Powered Visual Assistance

Nadar is a voice‑first assistive application that helps blind and low‑vision users understand their surroundings using the device camera and on‑device/gallery images. The project consists of a cross‑platform React Native (Expo) client and a TypeScript/Express server that wraps foundation models for vision understanding (Gemini) and text‑to‑speech (Gemini TTS with optional ElevenLabs fallback).

This README provides a technical overview for developers: architecture, setup, build, testing, endpoints, and operational guidance.

---

## Repository layout

- app/ — React Native (Expo) client
  - src/
    - screens/ — Landing, Capture, Results, History, Settings, MobileSetup
    - app/ — UI kit, theme, state, navigation
    - api/ — API client (fetch wrappers)
    - utils/ — audio, downscale, discovery helpers
- server/ — Node.js (TypeScript) API
  - src/
    - routes/ — /describe, /ocr, /qa, /tts
    - providers/ — GeminiProvider, ElevenLabsProvider, HybridProvider, IAIProvider
    - middleware/ — shared middleware (rate‑limiting, etc.)
- docs/ — design system and setup docs
- README-MOBILE.md — mobile testing & setup guide

---

## Core features

- Scene description — structured short outputs optimized for mobility and safety
- OCR — concise reading of text with optional summary prompt
- Q&A — ask a specific question about the scene
- TTS — text‑to‑speech playback (Gemini TTS, optional ElevenLabs fallback)
- History — minimal in-memory history recording on client for MVP
- Accessibility — consolidated onboarding, large touch targets, focused flows

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

Base URL: http://<host>:4000

- GET /health → { ok: true }

- POST /describe
  - { imageBase64: string, mimeType?: string, options?: { language?: 'darija'|'ar'|'en', verbosity?: 'brief'|'normal'|'detailed' } }
  - → { text: string, timings?, tokens?, structured? }

- POST /ocr
  - { imageBase64: string, mimeType?: string, options?: ... }
  - → { text: string, timings? }

- POST /qa
  - { imageBase64: string, question: string, mimeType?: string, options?: ... }
  - → { text: string, timings? }

- POST /tts
  - { text: string, voice?: string, provider?: 'gemini'|'elevenlabs' }
  - → { audioBase64: string, mimeType?: string }

Notes
- Requests enforce timeouts to keep latency predictable
- Inputs validated with zod schemas (server/src/routes/schemas.ts)
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

