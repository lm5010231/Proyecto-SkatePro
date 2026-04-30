import AsyncStorage from "@react-native-async-storage/async-storage";

export const ACTIVE_SESSION_KEY = "sesionActiva";

export type UserRole = "admin" | "instructor" | "alumno";

export type SesionActiva = {
  autenticado: true;
  correo: string;
  usuarioId: string;
  perfilId: string | null;
  role: UserRole;
};

export async function obtenerSesionActiva(): Promise<SesionActiva | null> {
  const data = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);

  if (!data) {
    return null;
  }

  try {
    const sesion = JSON.parse(data);
    if (
      sesion?.autenticado !== true ||
      typeof sesion?.correo !== "string" ||
      typeof sesion?.usuarioId !== "string" ||
      (sesion?.perfilId !== null && typeof sesion?.perfilId !== "string") ||
      (sesion?.role !== "admin" &&
        sesion?.role !== "instructor" &&
        sesion?.role !== "alumno")
    ) {
      await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
      return null;
    }
    return sesion as SesionActiva;
  } catch {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    return null;
  }
}

export async function guardarSesionActiva(sesion: SesionActiva) {
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sesion));
}

export async function cerrarSesionActiva() {
  await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
}
