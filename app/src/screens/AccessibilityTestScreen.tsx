import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  AccessibilityInfo,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FocusableElement {
  id: string;
  label: string;
  role: string;
  focused: boolean;
}

export default function AccessibilityTestScreen() {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState<boolean | null>(null);
  const [focusOrder, setFocusOrder] = useState<FocusableElement[]>([]);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    // Check if screen reader is enabled
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
    
    // Listen for screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => subscription?.remove();
  }, []);

  const runFocusOrderTest = () => {
    setCurrentTest('Focus Order Test');
    
    // Simulate focus order enumeration
    const mockFocusOrder: FocusableElement[] = [
      { id: 'header', label: 'Accessibility Test Mode', role: 'header', focused: false },
      { id: 'status', label: `Screen Reader: ${isScreenReaderEnabled ? 'Enabled' : 'Disabled'}`, role: 'text', focused: false },
      { id: 'focus-test', label: 'Test Focus Order', role: 'button', focused: false },
      { id: 'gesture-test', label: 'Test Gestures', role: 'button', focused: false },
      { id: 'tts-test', label: 'Test TTS Announcements', role: 'button', focused: false },
      { id: 'navigation-test', label: 'Test Navigation Flow', role: 'button', focused: false },
    ];

    setFocusOrder(mockFocusOrder);
    
    // Announce test start
    AccessibilityInfo.announceForAccessibility('Focus order test started. Navigating through elements.');
  };

  const runGestureTest = () => {
    setCurrentTest('Gesture Test');
    
    Alert.alert(
      'Gesture Test',
      'Try these gestures:\n\n' +
      '• Single tap: Select element\n' +
      '• Double tap: Activate element\n' +
      '• Swipe right: Next element\n' +
      '• Swipe left: Previous element\n' +
      '• Three-finger swipe: Scroll\n\n' +
      'This alert should be announced by screen reader.',
      [
        {
          text: 'Test Passed',
          onPress: () => {
            AccessibilityInfo.announceForAccessibility('Gesture test completed successfully');
            setCurrentTest(null);
          }
        },
        {
          text: 'Test Failed',
          onPress: () => {
            AccessibilityInfo.announceForAccessibility('Gesture test failed. Check accessibility settings.');
            setCurrentTest(null);
          }
        }
      ]
    );
  };

  const runTTSTest = () => {
    setCurrentTest('TTS Test');
    
    const testMessages = [
      'Testing text-to-speech announcement',
      'This is a longer message to test speech clarity and pacing',
      'Special characters: @#$%^&*()_+ should be handled properly',
      'Numbers: 123 456 789 should be read clearly',
    ];

    let messageIndex = 0;
    
    const announceNext = () => {
      if (messageIndex < testMessages.length) {
        AccessibilityInfo.announceForAccessibility(testMessages[messageIndex]);
        messageIndex++;
        setTimeout(announceNext, 3000); // Wait 3 seconds between announcements
      } else {
        AccessibilityInfo.announceForAccessibility('TTS test completed');
        setCurrentTest(null);
      }
    };

    announceNext();
  };

  const runNavigationTest = () => {
    setCurrentTest('Navigation Test');
    
    // Test navigation announcements
    AccessibilityInfo.announceForAccessibility('Navigation test started. Testing screen transitions and focus management.');
    
    setTimeout(() => {
      AccessibilityInfo.announceForAccessibility('Simulating screen change. Focus should move to main content.');
    }, 2000);
    
    setTimeout(() => {
      AccessibilityInfo.announceForAccessibility('Navigation test completed. Check that focus moved appropriately.');
      setCurrentTest(null);
    }, 4000);
  };

  const clearTests = () => {
    setCurrentTest(null);
    setFocusOrder([]);
    AccessibilityInfo.announceForAccessibility('Test results cleared');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        accessibilityLabel="Accessibility test screen content"
      >
        <Text 
          style={styles.header}
          accessibilityRole="header"
          accessibilityLabel="Accessibility Test Mode"
        >
          Accessibility Test Mode
        </Text>

        <View style={styles.statusContainer}>
          <Text 
            style={styles.statusText}
            accessibilityLabel={`Screen Reader Status: ${isScreenReaderEnabled ? 'Enabled' : 'Disabled'}`}
          >
            Screen Reader: {isScreenReaderEnabled === null ? 'Checking...' : isScreenReaderEnabled ? 'Enabled' : 'Disabled'}
          </Text>
          
          <Text 
            style={styles.statusText}
            accessibilityLabel={`Platform: ${Platform.OS}`}
          >
            Platform: {Platform.OS}
          </Text>
        </View>

        {!isScreenReaderEnabled && (
          <View style={styles.warningContainer}>
            <Text 
              style={styles.warningText}
              accessibilityLabel="Warning: Screen reader is not enabled. Enable VoiceOver on iOS or TalkBack on Android to test accessibility features."
            >
              ⚠️ Screen reader not enabled. Enable VoiceOver (iOS) or TalkBack (Android) for full testing.
            </Text>
          </View>
        )}

        <View style={styles.testContainer}>
          <Text 
            style={styles.sectionHeader}
            accessibilityRole="header"
            accessibilityLabel="Available Tests"
          >
            Available Tests
          </Text>

          <TouchableOpacity
            style={styles.testButton}
            onPress={runFocusOrderTest}
            accessibilityLabel="Test Focus Order - Check the sequence of focusable elements"
            accessibilityHint="Double tap to start focus order test"
          >
            <Text style={styles.buttonText}>Test Focus Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={runGestureTest}
            accessibilityLabel="Test Gestures - Verify screen reader gestures work correctly"
            accessibilityHint="Double tap to start gesture test"
          >
            <Text style={styles.buttonText}>Test Gestures</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={runTTSTest}
            accessibilityLabel="Test TTS Announcements - Check text-to-speech clarity"
            accessibilityHint="Double tap to start TTS test"
          >
            <Text style={styles.buttonText}>Test TTS Announcements</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={runNavigationTest}
            accessibilityLabel="Test Navigation Flow - Check focus management during navigation"
            accessibilityHint="Double tap to start navigation test"
          >
            <Text style={styles.buttonText}>Test Navigation Flow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.clearButton]}
            onPress={clearTests}
            accessibilityLabel="Clear Test Results"
            accessibilityHint="Double tap to clear all test results"
          >
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {currentTest && (
          <View style={styles.currentTestContainer}>
            <Text 
              style={styles.currentTestText}
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Currently running: ${currentTest}`}
            >
              Running: {currentTest}
            </Text>
          </View>
        )}

        {focusOrder.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text 
              style={styles.sectionHeader}
              accessibilityRole="header"
              accessibilityLabel="Focus Order Results"
            >
              Focus Order Results
            </Text>
            {focusOrder.map((element, index) => (
              <View key={element.id} style={styles.focusItem}>
                <Text 
                  style={styles.focusItemText}
                  accessibilityLabel={`${index + 1}. ${element.label}, Role: ${element.role}`}
                >
                  {index + 1}. {element.label} ({element.role})
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#e8f4f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  testContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  currentTestContainer: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentTestText: {
    fontSize: 16,
    color: '#155724',
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  focusItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  focusItemText: {
    fontSize: 14,
    color: '#333',
  },
});
