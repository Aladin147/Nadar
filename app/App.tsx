import React, { useState } from 'react';
import MainScreen from './src/screens/MainScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { PrimaryButton } from './src/app/components/PrimaryButton';
import { SafeAreaView, View } from 'react-native';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {showSettings ? <SettingsScreen /> : <MainScreen />}
      <View style={{ position: 'absolute', top: 10, right: 10 }}>
        <PrimaryButton title={showSettings ? 'Close' : 'Settings'} onPress={()=>setShowSettings(!showSettings)} />
      </View>
    </SafeAreaView>
  );
}

