import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../Pantallas/LoginScreen";
import RegisterScreen from "../Pantallas/RegisterScreen";
import MainTabs from "./MainTabs";
import { obtenerSesionActiva, SesionActiva } from "../Contexto/session";
import { theme } from "../Constantes/theme";

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [sesionActiva, setSesionActiva] = useState<SesionActiva | null>(null);

  useEffect(() => {
    const verificarSesion = async () => {
      const sesion = await obtenerSesionActiva();
      setSesionActiva(sesion);
      setCargandoSesion(false);
    };

    verificarSesion();
  }, []);

  if (cargandoSesion) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando sesion...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={sesionActiva ? "Home" : "Login"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={MainTabs} initialParams={sesionActiva || {}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.primaryStrong,
    fontWeight: "700"
  }
});
