import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import HomeScreen from "../Pantallas/HomeScreen";
import StudentProfileScreen from "../Pantallas/StudentProfileScreen";
import InstructorsScreen from "../Pantallas/InstructorsScreen";
import ClassesScreen from "../Pantallas/ClassesScreen";
import PaymentsScreen from "../Pantallas/PaymentsScreen";
import AttendanceScreen from "../Pantallas/AttendanceScreen";
import InstitutionalScreen from "../Pantallas/InstitutionalScreen";
import { SesionActiva } from "../Contexto/session";
import { theme } from "../Constantes/theme";

const Tab = createBottomTabNavigator();

const tabIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Inicio: "home",
  Alumno: "person",
  Instructores: "groups",
  Clases: "sports",
  Pagos: "payments",
  Asistencia: "check-circle",
  Institucion: "corporate-fare"
};

type MainTabsProps = {
  route?: {
    params?: Partial<SesionActiva>;
  };
};

export default function MainTabs({ route }: MainTabsProps) {
  const sesion: SesionActiva = {
    autenticado: true,
    correo: route?.params?.correo || "",
    usuarioId: route?.params?.usuarioId || "",
    perfilId: route?.params?.perfilId || null,
    role: route?.params?.role || "alumno"
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleAlign: "center",
        headerShown: false,
        sceneStyle: {
          paddingTop: 62
        },
        tabBarStyle: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
          borderTopWidth: 0,
          height: 62
        },
        tabBarLabelStyle: {
          fontWeight: "700",
          fontSize: 11
        },
        tabBarItemStyle: {
          paddingVertical: 6
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={tabIcons[route.name]} size={size} color={color} />
        ),
        headerStyle: {
          backgroundColor: theme.colors.surface
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: "800"
        }
      })}
    >
      <Tab.Screen name="Inicio">
        {(props) => <HomeScreen {...props} sesion={sesion} />}
      </Tab.Screen>
      <Tab.Screen name="Alumno">
        {(props) => <StudentProfileScreen {...props} sesion={sesion} />}
      </Tab.Screen>
      <Tab.Screen name="Instructores">
        {(props) => <InstructorsScreen {...props} sesion={sesion} />}
      </Tab.Screen>
      <Tab.Screen name="Clases">
        {(props) => <ClassesScreen {...props} sesion={sesion} />}
      </Tab.Screen>
      <Tab.Screen name="Pagos">
        {(props) => <PaymentsScreen {...props} sesion={sesion} />}
      </Tab.Screen>
      <Tab.Screen name="Asistencia">
        {(props) => <AttendanceScreen {...props} sesion={sesion} />}
      </Tab.Screen>
      <Tab.Screen name="Institucion">
        {(props) => <InstitutionalScreen {...props} sesion={sesion} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
