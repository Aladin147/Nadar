# Accessibility Testing Framework

## Overview

Nadar is designed to be fully accessible to users with visual impairments. This document provides a comprehensive framework for testing accessibility features, focusing on VoiceOver (iOS) and TalkBack (Android) screen readers.

## Testing Prerequisites

### Required Tools
- **iOS**: iPhone/iPad with VoiceOver enabled
- **Android**: Android device with TalkBack enabled
- **Testing Apps**: Expo Go or built Nadar app
- **Audio**: Headphones for TTS testing

### Screen Reader Setup
- **VoiceOver**: Settings → Accessibility → VoiceOver → On
- **TalkBack**: Settings → Accessibility → TalkBack → On
- **Gesture Practice**: Complete built-in tutorials before testing

## Core Accessibility Principles

### 1. Semantic Structure
- All interactive elements must have meaningful labels
- Headings should follow logical hierarchy
- Content should flow in reading order

### 2. Navigation Patterns
- Single-finger swipe: Navigate between elements
- Double-tap: Activate focused element
- Three-finger swipe: Scroll content
- Rotor control: Quick navigation by element type

### 3. Feedback Requirements
- Immediate audio feedback for all actions
- Clear state announcements (loading, success, error)
- Progress indicators for long operations

## Testing Checklist

### Landing Screen
- [ ] App title announced clearly
- [ ] Mode descriptions read in logical order
- [ ] "Get Started" button properly labeled and focusable
- [ ] Navigation flows to onboarding or capture screen

### Onboarding Flow
- [ ] Permission requests clearly explained
- [ ] "Allow" buttons properly labeled
- [ ] Progress through steps announced
- [ ] Skip options available and announced

### Capture Screen
- [ ] Camera viewfinder has descriptive label
- [ ] Mode selector (Scene/OCR/QA) properly labeled
- [ ] Capture button clearly identified
- [ ] Flash toggle announced with state
- [ ] Settings button accessible

### Results Screen
- [ ] Generated text content readable
- [ ] Section headings (Immediate, Objects, Navigation) announced
- [ ] TTS playback controls labeled
- [ ] "Ask Follow-up" button accessible
- [ ] Back navigation clear

### Settings Screen
- [ ] All form fields properly labeled
- [ ] Dropdown/picker values announced
- [ ] Save/test buttons accessible
- [ ] Network discovery progress announced
- [ ] Error messages read clearly

## Common Pitfalls & Solutions

### Issue: Unlabeled Interactive Elements
**Problem**: Buttons, inputs without accessibility labels
**Solution**: Add `accessibilityLabel` prop to all interactive components
```jsx
<TouchableOpacity accessibilityLabel="Capture photo">
  <CameraIcon />
</TouchableOpacity>
```

### Issue: Poor Focus Order
**Problem**: Screen reader jumps around unpredictably
**Solution**: Use `accessibilityViewIsModal` and logical component ordering

### Issue: Missing State Announcements
**Problem**: Loading/error states not communicated
**Solution**: Use `accessibilityLiveRegion` for dynamic content
```jsx
<Text accessibilityLiveRegion="polite">
  {isLoading ? "Processing image..." : result}
</Text>
```

### Issue: Complex Gestures Required
**Problem**: Multi-touch or precise gestures needed
**Solution**: Provide alternative single-tap interactions

## Performance Targets

### Response Time Goals
- **Voice feedback**: < 100ms after interaction
- **TTS playback**: < 2s to start after text generation
- **Navigation**: < 500ms between screen transitions
- **Error announcements**: Immediate (< 50ms)

### Battery Considerations
- TTS should pause during low battery warnings
- Reduce background processing when screen reader active
- Optimize for longer usage sessions

## Testing Scenarios

### Scenario 1: First-Time User Journey
1. Launch app with VoiceOver enabled
2. Navigate through onboarding without sighted assistance
3. Grant permissions using only audio cues
4. Reach capture screen and understand available actions
5. **Success Criteria**: Complete setup in < 5 minutes

### Scenario 2: Photo Capture & Description
1. Navigate to capture screen
2. Select "Scene" mode using screen reader
3. Capture photo using double-tap
4. Wait for description generation
5. Listen to full description via TTS
6. **Success Criteria**: Understand image content from audio alone

### Scenario 3: Follow-up Questions
1. After receiving description, find "Ask Follow-up" button
2. Navigate to question input
3. Enter question using voice input or keyboard
4. Submit and receive answer
5. **Success Criteria**: Successful Q&A interaction

### Scenario 4: Settings Configuration
1. Navigate to settings screen
2. Change language preference
3. Adjust TTS speed
4. Test server connection
5. Save settings
6. **Success Criteria**: All settings accessible and functional

## Automated Testing Considerations

### React Native Testing Library
```jsx
// Example accessibility test
test('capture button is accessible', () => {
  const { getByLabelText } = render(<CaptureScreen />);
  const captureButton = getByLabelText('Capture photo');
  expect(captureButton).toBeTruthy();
});
```

### Accessibility Audit Tools
- **iOS**: Xcode Accessibility Inspector
- **Android**: Accessibility Scanner
- **React Native**: Flipper accessibility plugin

## Documentation Standards

### Component Documentation
Every UI component should document:
- Required accessibility props
- Expected screen reader behavior
- Keyboard navigation support
- Focus management

### Testing Reports
Document findings with:
- Device/OS version tested
- Screen reader version
- Issues found with severity levels
- Reproduction steps
- Proposed solutions

## Continuous Improvement

### User Feedback Integration
- Regular testing with actual visually impaired users
- Feedback collection through accessible channels
- Iterative improvements based on real usage

### Accessibility Metrics
- Track completion rates for key user flows
- Monitor TTS usage patterns
- Measure time-to-completion for common tasks
- Identify drop-off points in user journeys

---

## Quick Reference: Essential Gestures

### VoiceOver (iOS)
- **Navigate**: Single finger swipe left/right
- **Activate**: Double-tap
- **Scroll**: Three-finger swipe up/down
- **Rotor**: Two-finger rotate

### TalkBack (Android)
- **Navigate**: Swipe right/left
- **Activate**: Double-tap
- **Scroll**: Two-finger swipe up/down
- **Global gestures**: Swipe down then right for notifications

This framework ensures Nadar remains accessible to all users while maintaining high usability standards.
