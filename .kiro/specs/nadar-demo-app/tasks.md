# Implementation Plan

## P0 - Assist Quality & Telemetry (Critical Path)

- [x] 1. Implement fast image inspector service

  - Create server/src/services/imageInspector.ts with lightweight Gemini call
  - Return JSON: {has_text: boolean, hazards: string[], people_count: number, lighting_ok: boolean, confidence: number}
  - Add to existing /assist route before main processing
  - **Done when**: Inspector logs signals per request and can branch on has_text
  - **Dependencies**: None
  - _Requirements: 2.2, 3.1_

- [x] 2. Single-paragraph assist responses

  - Rewrite scene/QA prompt: one short Darija paragraph (≤2 sentences), safety/next-step first
  - Answer user question first if provided, then context
  - Return details[] separately for "More" expansion
  - **Done when**: Results screen shows one paragraph; sections gone; "More" shows extra bullets
  - **Dependencies**: Task 1 (needs signals for routing)
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 3. Route using inspection signals

  - If has_text=true → bias answer to mention visible text, expose "Read all text"
  - Else → regular scene answer
  - If question present → answer it first in paragraph
  - **Done when**: Photos with text reliably surface "Read all", answers prioritize questions
  - **Dependencies**: Tasks 1, 2
  - _Requirements: 2.2, 2.4_

- [x] 4. Extend telemetry schema

  - Add to log: {ts, mode, engine, total_ms, model_ms, tts_ms, image_bytes, audio_bytes_in, chars_out, signals, ok, err_code}
  - One JSON line per request with all timing/usage data
  - **Done when**: Logs show engine, timings, bytes, and signals for every request
  - **Dependencies**: Task 1 (needs signals)
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Cost estimator utility

  - Create scripts/cost.ts: estimate Gemini tokens (~chars/4), ElevenLabs minutes
  - Map to current Flash/Live rates and plan overage costs
  - **Done when**: Running script prints per-call and aggregate $, P95 latency, cost breakdown
  - **Dependencies**: Task 4 (needs telemetry data)
  - _Requirements: 3.2, 3.5_

- [x] 6. Add /metrics endpoint


  - Return last N calls, P95 latency, error mix, total estimated cost
  - Dev-only JSON dashboard format
  - **Done when**: Can open /metrics and see quick dashboard JSON
  - **Dependencies**: Tasks 4, 5
  - _Requirements: 3.3, 3.4_

## P1 - Demo App & Core Features

- [ ] 7. Create demo app shell

  - Initialize apps/nadar-demo (or branch) reusing API client
  - One screen: Assist with shutter + mic, no tabs
  - Basic image capture → API call → response flow
  - **Done when**: Can capture photo, get paragraph response, hear TTS
  - **Dependencies**: Tasks 1-3 (needs enhanced assist API)
  - _Requirements: 1.1, 1.2_

- [ ] 8. Enhanced results display

  - Auto-TTS the main paragraph response
  - "More" collapsible section shows details[] bullets
  - Show "Read all text" button when signals.has_text=true
  - **Done when**: Results screen plays audio automatically, shows expandable details
  - **Dependencies**: Task 7, Task 3 (needs has_text signal)
  - _Requirements: 1.5, 2.3, 7.1_

- [ ] 9. "Read all text" functionality

  - Button calls /ocr?full=true with imageRef:"last"
  - Use existing chunked TTS for full readout
  - **Done when**: Text images offer and perform full readout without re-capture
  - **Dependencies**: Task 8
  - _Requirements: 4.3, 4.4_

- [ ] 10. Follow-up question chips

  - Server returns followup_suggest (≤3), display as tappable chips
  - Tap sends question with imageRef:"last" (no re-capture)
  - **Done when**: Tap chips → new answer using same image
  - **Dependencies**: Task 9 (needs session management)
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 11. Engine comparison toggle

  - Small dev menu: switch between assist (classic) and live/assist (audio+image)
  - Toggle flips backend path, same UI
  - **Done when**: Toggle switches engines, can hear/feel difference in real-time
  - **Dependencies**: Task 7
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 12. Tour mode (if time)
  - Button replays 3 canned sessions (office, street, menu)
  - Use saved image/audio + mocked responses
  - **Done when**: Can demo end-to-end in 60s without touching MVP app
  - **Dependencies**: Task 8
  - _Requirements: 1.3, 8.1, 8.2_

## P1 - Quality Guardrails

- [ ] 13. Confidence/lighting guidance

  - If confidence < 0.4 or lighting_ok=false, prepend tip: "ما واضحش… قرّب الكاميرا ولا زيد ضو"
  - **Done when**: Low-quality shots get helpful recapture guidance automatically
  - **Dependencies**: Task 1 (needs confidence/lighting signals)
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 14. Enhanced error handling
  - Clear error messages in user's preferred language
  - Graceful degradation for network/API failures
  - **Done when**: Users get actionable guidance for common failure modes
  - **Dependencies**: Task 7
  - _Requirements: 5.4, 8.3, 8.4_

## P2 - CI & Accessibility (Quick Wins)

- [ ] 15. CI pipeline

  - GitHub Actions: typecheck → lint → unit tests → minimal Playwright (Landing + Results)
  - **Done when**: CI is green on every commit
  - **Dependencies**: Task 7 (needs demo app structure)
  - _Requirements: 7.7_

- [ ] 16. A11y improvements
  - When result arrives, move screen-reader focus to paragraph
  - Play/Stop buttons reachable via screen reader
  - Mic has start/stop announcements
  - **Done when**: VoiceOver/TalkBack flow is smooth
  - **Dependencies**: Task 8
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

## P2 - Polish & Monitoring (Later)

- [ ] 17. Performance optimization

  - Parallel image inspection + main AI call
  - Cache repeated demo scenarios
  - **Done when**: Response time consistently under target latency
  - **Dependencies**: Tasks 1, 7\_

- [ ] 18. Cost monitoring dashboard

  - Real-time cost tracking with usage alerts
  - Soft limits with user notification
  - **Done when**: Can monitor and control costs in real-time
  - **Dependencies**: Tasks 5, 6\_

- [ ] 19. Offline demo mode

  - Cached scenarios for offline presentation
  - Seamless online/offline switching
  - **Done when**: Demo works consistently regardless of connectivity
  - **Dependencies**: Task 12\_

- [ ] 20. Analytics collection
  - Optional feedback after demo sections
  - Anonymous usage tracking for feature engagement
  - **Done when**: Can measure demo effectiveness and user engagement
  - **Dependencies**: Task 12\_
