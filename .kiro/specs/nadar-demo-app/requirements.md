# Nadar Demo App Requirements

## Introduction

The Nadar Demo App is a focused demonstration layer that showcases the core capabilities of the Nadar AI-powered visual assistance platform through a streamlined, single-screen experience. This demo app will serve as a practical showcase for stakeholders and users to experience Nadar's key features in a guided format, while also serving as a testbed for improved assist quality, telemetry, and cost visibility.

## Requirements

### Requirement 1: Streamlined Demo Experience

**User Story:** As a stakeholder or potential user, I want to experience a focused demonstration of Nadar's core capabilities in under 60 seconds, so that I can quickly understand the value proposition without complexity.

#### Acceptance Criteria

1. WHEN the demo app launches THEN the system SHALL present a single assist screen with shutter and mic controls
2. WHEN demonstrating features THEN the system SHALL provide a tour mode with 3 canned scenarios (office, street, menu)
3. WHEN running tour mode THEN the system SHALL replay saved image/audio with mocked responses for consistent demos
4. WHEN completing scenarios THEN the system SHALL auto-play TTS for the main paragraph response
5. WHEN showing additional details THEN the system SHALL provide collapsible "More" section with bullet points

### Requirement 2: Enhanced Assist Quality

**User Story:** As a user, I want improved response quality with single-paragraph, action-first answers, so that I get more useful and concise information.

#### Acceptance Criteria

1. WHEN processing images THEN the system SHALL perform fast image inspection to detect text, hazards, people count, and lighting quality
2. WHEN generating responses THEN the system SHALL provide single-paragraph Darija responses (≤2 sentences) with safety/next-step first
3. WHEN text is detected THEN the system SHALL bias answers to mention visible text and expose "Read all text" button
4. WHEN questions are provided THEN the system SHALL answer the user question first in the response
5. WHEN routing responses THEN the system SHALL use inspection signals to determine appropriate response format

### Requirement 3: Comprehensive Telemetry and Cost Visibility

**User Story:** As a product team member, I want detailed telemetry and cost tracking, so that I can monitor performance, usage patterns, and operational costs.

#### Acceptance Criteria

1. WHEN processing requests THEN the system SHALL log comprehensive metrics including timing, engine used, bytes processed, and signals detected
2. WHEN estimating costs THEN the system SHALL calculate Gemini token costs and ElevenLabs usage costs in real-time
3. WHEN accessing metrics THEN the system SHALL provide a /metrics endpoint showing recent calls, latency percentiles, error rates, and cost breakdowns
4. WHEN analyzing usage THEN the system SHALL track which features generate the most engagement and success
5. WHEN monitoring performance THEN the system SHALL provide P95 latency tracking and cost projections

### Requirement 4: Interactive Follow-up Capabilities

**User Story:** As a user, I want to ask follow-up questions without retaking photos, so that I can get additional information about the same scene efficiently.

#### Acceptance Criteria

1. WHEN receiving responses THEN the system SHALL provide up to 3 suggested follow-up question chips
2. WHEN tapping follow-up chips THEN the system SHALL send questions using the last captured image without re-capture
3. WHEN text is detected THEN the system SHALL offer "Read all text" button that performs full OCR readout
4. WHEN performing full text readout THEN the system SHALL use chunked TTS for long text content
5. WHEN managing sessions THEN the system SHALL maintain image context for follow-up interactions

### Requirement 5: Quality Guardrails and User Guidance

**User Story:** As a user, I want helpful guidance when image quality is poor, so that I can capture better images and get more accurate results.

#### Acceptance Criteria

1. WHEN image confidence is low THEN the system SHALL provide Darija guidance like "ما واضحش… قرّب الكاميرا ولا زيد ضو"
2. WHEN lighting conditions are poor THEN the system SHALL suggest better lighting before processing
3. WHEN images are unclear THEN the system SHALL offer recapture suggestions automatically
4. WHEN processing fails THEN the system SHALL provide clear, actionable error messages in the user's preferred language
5. WHEN quality issues are detected THEN the system SHALL log quality metrics for continuous improvement

### Requirement 6: Engine Comparison and Flexibility

**User Story:** As a developer, I want to compare different AI engines in real-time, so that I can evaluate performance and choose the best option for different scenarios.

#### Acceptance Criteria

1. WHEN in development mode THEN the system SHALL provide toggle between classic assist and live/assist (audio+image)
2. WHEN switching engines THEN the system SHALL maintain the same user interface while changing backend processing
3. WHEN comparing results THEN the system SHALL log performance differences between engines
4. WHEN testing capabilities THEN the system SHALL allow real-time comparison of response quality and speed
5. WHEN evaluating costs THEN the system SHALL track and compare operational costs between different engines

### Requirement 7: Accessibility and Voice-First Design

**User Story:** As a blind or low-vision user, I want seamless screen reader integration and voice-first interactions, so that I can use the demo app effectively with assistive technology.

#### Acceptance Criteria

1. WHEN results arrive THEN the system SHALL move screen reader focus to the main response paragraph
2. WHEN using voice controls THEN the system SHALL provide clear audio announcements for mic start/stop states
3. WHEN navigating the interface THEN the system SHALL ensure Play/Stop buttons are easily reachable via screen reader
4. WHEN using VoiceOver/TalkBack THEN the system SHALL provide smooth navigation flow without accessibility barriers
5. WHEN interacting with controls THEN the system SHALL provide appropriate haptic feedback and audio cues

### Requirement 8: Offline Demo Reliability

**User Story:** As a presenter, I want the demo to work reliably in any environment, so that I can demonstrate Nadar without depending on internet connectivity.

#### Acceptance Criteria

1. WHEN running offline THEN the system SHALL use pre-recorded responses and cached demo scenarios
2. WHEN simulating API calls THEN the system SHALL provide realistic timing delays to match online experience
3. WHEN displaying metrics THEN the system SHALL show representative performance data even offline
4. WHEN switching connectivity states THEN the system SHALL seamlessly transition without user disruption
5. WHEN presenting in any environment THEN the system SHALL provide consistent demo experience regardless of network conditions