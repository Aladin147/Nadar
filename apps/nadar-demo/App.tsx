import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import DemoScreen from "./src/screens/DemoScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#000000" />
      <DemoScreen />
    </SafeAreaProvider>
  );
}
