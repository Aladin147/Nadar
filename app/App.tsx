import React from 'react';
import { SafeAreaView, Platform } from 'react-native';
import { AppProvider, useAppState } from './src/app/state/AppContext';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import LandingScreen from './src/screens/LandingScreen';
import MobileSetupScreen from './src/screens/MobileSetupScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { isApiConfigured } from './src/config';

function AppContent() {
  const { state, dispatch } = useAppState();

  function handleNavigate(route: any) {
    dispatch({ type: 'NAVIGATE', route });
  }

  function renderScreen() {
    // Show mobile setup screen if on mobile and no API is configured
    if (Platform.OS !== 'web' && !isApiConfigured() && state.currentRoute !== 'settings') {
      return (
        <MobileSetupScreen
          onComplete={() => handleNavigate('capture')}
        />
      );
    }

    switch (state.currentRoute) {
      case 'landing':
        return (
          <LandingScreen
            onSettings={() => handleNavigate('settings')}
          />
        );
      case 'capture':
        return <CaptureScreen />;
      case 'results':
        return <ResultsScreen />;
      case 'history':
        return <HistoryScreen />;
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

