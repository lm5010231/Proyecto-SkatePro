import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { supabase } from "../Servicios/supabase";
import {
  guardarSesionActiva,
  obtenerSesionActiva,
  SesionActiva,
  UserRole
} from "../Contexto/session";
import { theme } from "../Constantes/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MISSING_USUARIOS_TABLE_HINT =
  "Falta la tabla public.usuarios en Supabase. Ejecuta el script mobile/supabase-schema.sql en el SQL Editor.";
const INVALID_CREDENTIALS_HINT =
  "No se pudo iniciar sesion. Verifica correo y contrasena. Si es un admin precargado, primero crea ese usuario en Supabase Auth con el mismo correo.";

function getUsuariosTableErrorMessage(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  if (message.includes("could not find the table") && message.includes("usuarios")) {
    return MISSING_USUARIOS_TABLE_HINT;
  }
  return null;
}

type LoginScreenProps = {
  navigation: any;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { width, height } = useWindowDimensions();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const validarSesion = async () => {
      const sesion = await obtenerSesionActiva();
      if (sesion) {
        navigation.replace("Home", sesion);
      }
    };

    validarSesion();
  }, [navigation]);

  const handleLogin = async () => {
    if (!supabase) {
      Alert.alert("Configura Supabase", "Faltan variables en el archivo .env.");
      return;
    }

    const correoLimpio = correo.trim().toLowerCase();
    const passwordLimpio = password.trim();
    setMensajeError("");

    if (!correoLimpio || !passwordLimpio) {
      setMensajeError("Completa correo y contrasena.");
      return;
    }

    if (!EMAIL_REGEX.test(correoLimpio)) {
      setMensajeError("Ingresa un correo valido.");
      return;
    }

    try {
      setCargando(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: correoLimpio,
        password: passwordLimpio
      });

      if (error || !data?.user) {
        const authMessage = error?.message?.toLowerCase() || "";
        if (authMessage.includes("invalid login credentials")) {
          const { data: perfilExistente } = await supabase
            .from("usuarios")
            .select("id")
            .eq("correo", correoLimpio)
            .maybeSingle();

          setMensajeError(perfilExistente ? INVALID_CREDENTIALS_HINT : "Credenciales invalidas.");
          return;
        }
        setMensajeError(error?.message || "Credenciales invalidas.");
        return;
      }

      const authUserId = data.user.id;
      let profileRole: UserRole = "alumno";
      let perfilId: string | null = null;

      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios")
        .select("id, rol, auth_user_id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (perfilError) {
        const perfilHint = getUsuariosTableErrorMessage(perfilError);
        if (perfilHint) {
          setMensajeError(perfilHint);
          return;
        }
        console.warn("No se pudo consultar perfil por auth_user_id", perfilError.message);
      }

      if (perfil) {
        profileRole = (perfil.rol || "alumno") as UserRole;
        perfilId = perfil.id;
      } else {
        const { data: byEmail } = await supabase
          .from("usuarios")
          .select("id, rol")
          .eq("correo", correoLimpio)
          .maybeSingle();

        if (byEmail) {
          profileRole = (byEmail.rol || "alumno") as UserRole;
          perfilId = byEmail.id;
          await supabase
            .from("usuarios")
            .update({ auth_user_id: authUserId })
            .eq("id", byEmail.id);
        } else {
          const { data: createdProfile, error: createProfileError } = await supabase
            .from("usuarios")
            .insert([
            {
              auth_user_id: authUserId,
                correo: correoLimpio,
                nombre: correoLimpio.split("@")[0],
                telefono: "",
                metodo_pago: "efectivo",
                rol: "alumno"
            }
            ])
            .select("id, rol")
            .single();

          if (createProfileError) {
            const createHint = getUsuariosTableErrorMessage(createProfileError);
            if (createHint) {
              setMensajeError(createHint);
              return;
            }
            setMensajeError(createProfileError.message);
            return;
          }

          profileRole = (createdProfile.rol || "alumno") as UserRole;
          perfilId = createdProfile.id;
        }
      }

      const nuevaSesion: SesionActiva = {
        autenticado: true,
        correo: correoLimpio,
        usuarioId: authUserId,
        perfilId,
        role: profileRole
      };

      await guardarSesionActiva(nuevaSesion);

      navigation.replace("Home", nuevaSesion);

    } catch (error) {
      console.error("Error al iniciar sesion", error);
      Alert.alert("Error", "No fue posible iniciar sesion.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/imagen1.jpeg")}
      style={[styles.background, { width, minHeight: height }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={[styles.overlay, { minHeight: height }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>Escuela de Patinaje</Text>
          <Text style={styles.heroTitle}>Bienvenido</Text>
          <Text style={styles.heroSubtitle}>Ingresa para administrar clases, pagos y asistencia.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Image source={require("../../assets/logo.png")} style={styles.logoImage} />
          </View>

          <Text style={styles.title}>Iniciar sesion</Text>
          <Text style={styles.subtitle}>Ingresa para gestionar la escuela.</Text>

          <TextInput
            placeholder="Correo electronico"
            style={styles.input}
            value={correo}
            onChangeText={setCorreo}
            placeholderTextColor="#8c8fa7"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <TextInput
            placeholder="Contrasena"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#8c8fa7"
            autoCorrect={false}
          />

          {mensajeError ? <Text style={styles.errorText}>{mensajeError}</Text> : null}

          <TouchableOpacity
            style={[styles.button, styles.loginButton, cargando ? styles.buttonDisabled : null]}
            onPress={handleLogin}
            disabled={cargando}
          >
            <Text style={styles.buttonText}>{cargando ? "Ingresando..." : "Entrar"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.linkText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: "100%" },
  backgroundImage: { opacity: 0.9 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 26,
    backgroundColor: "rgba(7, 28, 42, 0.45)",
    width: "100%"
  },
  hero: {
    maxWidth: 430,
    width: "100%",
    alignSelf: "center",
    marginBottom: 14
  },
  heroKicker: {
    color: "#D7F1FF",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 4
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900"
  },
  heroSubtitle: {
    color: "#DCE7EF",
    marginTop: 6,
    fontSize: 14
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: "rgba(218, 230, 240, 0.9)",
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    shadowColor: "#001825",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 7
  },
  logoContainer: {
    width: 84,
    height: 84,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 42,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  logoImage: {
    width: 62,
    height: 62,
    borderRadius: 31
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    color: theme.colors.text,
    fontWeight: "900"
  },
  subtitle: {
    textAlign: "center",
    color: theme.colors.muted,
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14
  },
  input: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 15
  },
  errorText: {
    color: theme.colors.danger,
    marginTop: 2,
    marginBottom: 10,
    fontWeight: "600",
    textAlign: "center"
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8
  },
  loginButton: { backgroundColor: theme.colors.primary },
  buttonDisabled: { opacity: 0.75 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.2 },
  linkText: {
    textAlign: "center",
    color: theme.colors.primaryStrong,
    marginTop: 16,
    fontWeight: "700"
  }
});
