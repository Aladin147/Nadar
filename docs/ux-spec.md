# Nadar UX Spec (Voice-first)

Principles
- Blind-first, minimal surface, accessible labels & hints
- One primary action per mode; small, consistent gesture set
- Short, structured speech; safety-first wording

Modes & Gestures
- Scene Description
  - Tap once → capture → IMMEDIATE/OBJECTS/NAVIGATION (brief)
  - Double-tap after output → one follow-up (reuses same image)
- Read (OCR-first)
  - Tap once → extract + 2-bullet summary; ask: “Do you want full readout?”
  - If yes → stream paragraphs via TTS
- Q&A
  - Double-tap on Scene/Read result or pick Q&A mode → one sentence answer

Audio feedback states
- Listening: beep; Processing: soft hum; Speaking: click + TTS
- Error: short descending tone + concise explanation

Accessibility
- VoiceOver/TalkBack navigation order; focus visible
- Large hit targets; high-contrast palette; dark by default
- All icons/buttons have accessible names, hints, and roles

Settings
- Language preference (Darija > Arabic > English)
- Verbosity default (Brief/Normal/Detailed)
- TTS speed (0.9x/1.0x/1.2x)

Errors (plain language)
- Network: “I couldn’t reach the server now. Try again.”
- Opaque image: “I couldn’t read that. Try a closer shot with better light.”

