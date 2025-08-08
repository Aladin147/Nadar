import React from 'react';
import { SafeAreaView } from 'react-native';
import { AppProvider, useAppState } from './src/app/state/AppContext';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import LandingScreen from './src/screens/LandingScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import SettingsScreen from './src/screens/SettingsScreen';

function AppContent() {
  const { state, dispatch } = useAppState();

  function handleNavigate(route: any) {
    dispatch({ type: 'NAVIGATE', route });
  }

  function handleStartOnboarding() {
    dispatch({ type: 'NAVIGATE', route: 'onboarding' });
  }

  function handleCompleteOnboarding() {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    dispatch({ type: 'NAVIGATE', route: 'capture' });
  }

  function renderScreen() {
    switch (state.currentRoute) {
      case 'landing':
        return (
          <LandingScreen
            onStart={handleStartOnboarding}
            onDemo={handleStartOnboarding}
            onSettings={() => handleNavigate('settings')}
          />
        );
      case 'onboarding':
        return <OnboardingScreen onComplete={handleCompleteOnboarding} />;
      case 'capture':
        return <CaptureScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <CaptureScreen />;
    }
  }

  return (
    <AppNavigator currentRoute={state.currentRoute} onNavigate={handleNavigate}>
      {renderScreen()}
    </AppNavigator>
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

