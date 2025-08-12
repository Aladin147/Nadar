import React, { useEffect, useState } from 'react';
import { SafeAreaView, Platform } from 'react-native';
import { AppProvider, useAppState } from './src/app/state/AppContext';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import LandingScreen from './src/screens/LandingScreen';
import MobileSetupScreen from './src/screens/MobileSetupScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
// import AccessibilityTestScreen from './src/screens/AccessibilityTestScreen';
import { isApiConfigured, isApiConfiguredAsync } from './src/config';
import { Toast } from './src/app/components/Toast';

function AppContent() {
  const { state, dispatch } = useAppState();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  // Check API configuration on mount and when returning from settings
  useEffect(() => {
    checkApiConfiguration();
  }, [state.currentRoute]);

  // Also check when the app becomes active (for settings changes)
  useEffect(() => {
    if (state.currentRoute === 'capture' || state.currentRoute === 'landing') {
      checkApiConfiguration();
    }
  }, [state.currentRoute]);

  async function checkApiConfiguration() {
    if (Platform.OS === 'web') {
      setIsConfigured(isApiConfigured());
    } else {
      const configured = await isApiConfiguredAsync();
      setIsConfigured(configured);
    }
  }

  function handleNavigate(route: any) {
    dispatch({ type: 'NAVIGATE', route });
  }

  function renderScreen() {
    // Show loading while checking configuration
    if (isConfigured === null) {
      return null; // or a loading screen
    }

    // Show mobile setup screen if on mobile and no API is configured
    if (Platform.OS !== 'web' && !isConfigured && state.currentRoute !== 'settings') {
      return <MobileSetupScreen onComplete={() => {
        checkApiConfiguration(); // Refresh configuration state
        handleNavigate('capture');
      }} />;
    }

    switch (state.currentRoute) {
      case 'landing':
        return <LandingScreen onSettings={() => handleNavigate('settings')} />;
      case 'capture':
        return <CaptureScreen />;
      case 'results':
        return <ResultsScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'accessibility-test':
        return <CaptureScreen />; // Fallback to capture screen
      default:
        return <CaptureScreen />;
    }
  }

  return (
    <>
      <AppNavigator currentRoute={state.currentRoute} onNavigate={handleNavigate}>
        {renderScreen()}
      </AppNavigator>

      {/* Global Toast */}
      {state.toast && (
        <Toast
          message={state.toast.message}
          type={state.toast.type}
          visible={state.toast.visible}
          onHide={() => dispatch({ type: 'HIDE_TOAST' })}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </SafeAreaView>
  );
}
