import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import StackNavigator from "./src/Navegacion/StackNavigator";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <StackNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
