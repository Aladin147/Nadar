import React, { useState } from 'react';
import MainScreen from './src/screens/MainScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LandingScreen from './src/screens/LandingScreen';
import { SafeAreaView } from 'react-native';

export default function App() {
  const [route, setRoute] = useState<'landing'|'main'|'settings'>('landing');
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {route === 'landing' && (
        <LandingScreen onStart={() => setRoute('main')} onDemo={() => setRoute('main')} onSettings={() => setRoute('settings')} />
      )}
      {route === 'main' && <MainScreen />}
      {route === 'settings' && <SettingsScreen />}
    </SafeAreaView>
  );
}

