import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Import screens
import WelcomeScreen from "./src/screens/WelcomeScreen";
import CaptureScreen from "./src/screens/CaptureScreen";
import ResultsScreen from "./src/screens/ResultsScreen";

// Define navigation types
export type RootStackParamList = {
  Welcome: undefined;
  Capture: undefined;
  Results: { response: any; sessionId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Welcome"
            screenOptions={{
              headerShown: false, // We'll use custom headers in each screen
              gestureEnabled: true,
              cardStyleInterpolator: ({ current, layouts }) => {
                return {
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.width, 0],
                        }),
                      },
                    ],
                  },
                };
              },
            }}
          >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Capture" component={CaptureScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
          </Stack.Navigator>
          <StatusBar style="light" backgroundColor="#000000" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
