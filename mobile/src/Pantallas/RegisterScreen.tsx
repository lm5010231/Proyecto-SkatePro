import React, { useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { supabase } from "../Servicios/supabase";
import { theme } from "../Constantes/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["admin", "instructor", "alumno"] as const;
const GENEROS = ["masculino", "femenino", "otro", "prefiero_no_decir"] as const;
const METODOS_PAGO = ["efectivo", "transferencia", "tarjeta", "nequi"] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MISSING_USUARIOS_TABLE_HINT =
  "Falta la tabla public.usuarios en Supabase. Ejecuta el script mobile/supabase-schema.sql en el SQL Editor.";

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function isValidDateInput(value: string) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function getUsuariosTableErrorMessage(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  if (message.includes("could not find the table") && message.includes("usuarios")) {
    return MISSING_USUARIOS_TABLE_HINT;
  }
  return null;
}

function parseRetryAfterSeconds(errorMessage: string) {
  const match = errorMessage.match(/after\s+(\d+)\s+seconds?/i);
  if (!match) return null;
  return Number(match[1]);
}

function getRegisterErrorMessage(errorMessage: string) {
  const message = errorMessage.toLowerCase();

  if (message.includes("for security purposes")) {
    const seconds = parseRetryAfterSeconds(errorMessage);
    if (seconds) {
      return `Por seguridad, intenta registrarte nuevamente en ${seconds} segundos.`;
    }
    return "Por seguridad, espera un momento antes de volver a registrarte.";
  }

  if (message.includes("email rate limit exceeded")) {
    return "Se alcanzo el limite de correos por seguridad. Espera un momento e intenta de nuevo.";
  }

  if (message.includes("user already registered")) {
    return "Este correo ya esta registrado. Inicia sesion o recupera tu contrasena.";
  }

  return errorMessage;
}

type RegisterScreenProps = {
  navigation: any;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { width, height } = useWindowDimensions();
  const [form, setForm] = useState({
    nombre: "",
    fechaNacimiento: "",
    rol: "alumno" as (typeof ROLES)[number],
    genero: "prefiero_no_decir" as (typeof GENEROS)[number],
    correo: "",
    telefono: "",
    metodoPago: "efectivo" as (typeof METODOS_PAGO)[number],
    password: "",
    confirmPassword: ""
  });
  const [mensajeError, setMensajeError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [bloqueoHasta, setBloqueoHasta] = useState<number | null>(null);

  function setField(
    key: keyof typeof form,
    value:
      | string
      | (typeof ROLES)[number]
      | (typeof GENEROS)[number]
      | (typeof METODOS_PAGO)[number]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleRegister = async () => {
    if (!supabase) {
      Alert.alert("Configura Supabase", "Faltan variables en el archivo .env.");
      return;
    }

    const correoLimpio = form.correo.trim().toLowerCase();
    const passwordLimpio = form.password.trim();
    const confirmPasswordLimpio = form.confirmPassword.trim();
    const nombreLimpio = form.nombre.trim();
    const telefonoLimpio = form.telefono.trim();
    const fechaNacimientoLimpia = form.fechaNacimiento.trim();
    setMensajeError("");

    if (bloqueoHasta && Date.now() < bloqueoHasta) {
      const seconds = Math.max(1, Math.ceil((bloqueoHasta - Date.now()) / 1000));
      setMensajeError(`Por seguridad, espera ${seconds} segundos antes de volver a intentarlo.`);
      return;
    }
    if (bloqueoHasta && Date.now() >= bloqueoHasta) {
      setBloqueoHasta(null);
    }

    if (
      !correoLimpio ||
      !passwordLimpio ||
      !confirmPasswordLimpio ||
      !nombreLimpio ||
      !fechaNacimientoLimpia ||
      !telefonoLimpio
    ) {
      setMensajeError("Completa todos los datos para registrarte.");
      return;
    }

    if (!EMAIL_REGEX.test(correoLimpio)) {
      setMensajeError("Ingresa un correo electronico valido.");
      return;
    }

    if (!isValidDateInput(fechaNacimientoLimpia)) {
      setMensajeError("La fecha de nacimiento debe tener formato YYYY-MM-DD.");
      return;
    }

    const { error: usuariosTableError } = await supabase
      .from("usuarios")
      .select("id")
      .limit(1);
    const usuariosTableMessage = getUsuariosTableErrorMessage(usuariosTableError);
    if (usuariosTableMessage) {
      setMensajeError(usuariosTableMessage);
      return;
    }

    if (passwordLimpio.length < 6) {
      setMensajeError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (passwordLimpio !== confirmPasswordLimpio) {
      setMensajeError("La confirmacion de la contrasena no coincide.");
      return;
    }

    try {
      setCargando(true);
      const { data, error } = await supabase.auth.signUp({
        email: correoLimpio,
        password: passwordLimpio,
        options: {
          data: {
            nombre: nombreLimpio,
            telefono: telefonoLimpio,
            rol: form.rol
          }
        }
      });

      if (error) {
        const friendlyMessage = getRegisterErrorMessage(error.message);
        setMensajeError(friendlyMessage);
        const retryAfterSeconds = parseRetryAfterSeconds(error.message);
        if (retryAfterSeconds) {
          setBloqueoHasta(Date.now() + retryAfterSeconds * 1000);
        }
        return;
      }

      const { data: existente } = await supabase
        .from("usuarios")
        .select("id")
        .eq("correo", correoLimpio)
        .maybeSingle();

      if (!existente) {
        const { error: insertError } = await supabase.from("usuarios").insert([
          {
            auth_user_id: data.user?.id ?? null,
            nombre: nombreLimpio,
            fecha_nacimiento: fechaNacimientoLimpia,
            genero: form.genero,
            correo: correoLimpio,
            telefono: telefonoLimpio,
            metodo_pago: form.metodoPago,
            rol: form.rol
          }
        ]);

        if (insertError) {
          const insertHint = getUsuariosTableErrorMessage(insertError);
          if (insertHint) {
            setMensajeError(insertHint);
            return;
          }
          setMensajeError(insertError.message);
          return;
        }
      }

      const requiresEmailConfirmation = !data.session;

      Alert.alert(
        "Registro exitoso",
        requiresEmailConfirmation
          ? "Revisa tu correo para confirmar la cuenta antes de iniciar sesion."
          : "Tu cuenta fue creada correctamente.",
        [{ text: "Ir a iniciar sesion", onPress: () => navigation.replace("Login") }]
      );
    } catch (error) {
      console.error("Error al registrar usuario", error);
      setMensajeError("No fue posible completar el registro.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/imagen2.jpg")}
      style={[styles.background, { width, minHeight: height }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { minHeight: height }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Image source={require("../../assets/logo.png")} style={styles.logoImage} />
          </View>

          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Completa los datos para registrarte.</Text>

          <Text style={styles.label}>Rol</Text>
          <View style={styles.roleRow}>
            {ROLES.map((rol) => (
              <TouchableOpacity
                key={rol}
                style={[styles.roleChip, form.rol === rol && styles.roleChipActive]}
                onPress={() => setField("rol", rol)}
              >
                <Text style={[styles.roleChipText, form.rol === rol && styles.roleChipTextActive]}>
                  {rol}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Nombre completo"
            style={styles.input}
            value={form.nombre}
            onChangeText={(value) => setField("nombre", value)}
            placeholderTextColor="#8c8fa7"
          />

          <TextInput
            placeholder="Fecha de nacimiento (YYYY-MM-DD)"
            style={styles.input}
            value={form.fechaNacimiento}
            onChangeText={(value) => setField("fechaNacimiento", formatDateInput(value))}
            placeholderTextColor="#8c8fa7"
            keyboardType="number-pad"
            maxLength={10}
          />
          <Text style={styles.helperText}>Formato: YYYY-MM-DD. Ejemplo: 2012-09-25.</Text>

          <Text style={styles.label}>Genero</Text>
          <View style={styles.roleRow}>
            {GENEROS.map((genero) => (
              <TouchableOpacity
                key={genero}
                style={[styles.roleChip, form.genero === genero && styles.roleChipActive]}
                onPress={() => setField("genero", genero)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    form.genero === genero && styles.roleChipTextActive
                  ]}
                >
                  {genero}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Correo electronico"
            style={styles.input}
            value={form.correo}
            onChangeText={(value) => setField("correo", value)}
            placeholderTextColor="#8c8fa7"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            placeholder="Telefono"
            style={styles.input}
            value={form.telefono}
            onChangeText={(value) => setField("telefono", value)}
            placeholderTextColor="#8c8fa7"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Metodo de pago</Text>
          <View style={styles.roleRow}>
            {METODOS_PAGO.map((metodo) => (
              <TouchableOpacity
                key={metodo}
                style={[
                  styles.roleChip,
                  form.metodoPago === metodo && styles.roleChipActive
                ]}
                onPress={() => setField("metodoPago", metodo)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    form.metodoPago === metodo && styles.roleChipTextActive
                  ]}
                >
                  {metodo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Contrasena"
            secureTextEntry
            style={styles.input}
            value={form.password}
            onChangeText={(value) => setField("password", value)}
            placeholderTextColor="#8c8fa7"
          />

          <TextInput
            placeholder="Confirmar contrasena"
            secureTextEntry
            style={styles.input}
            value={form.confirmPassword}
            onChangeText={(value) => setField("confirmPassword", value)}
            placeholderTextColor="#8c8fa7"
          />

          {mensajeError ? <Text style={styles.errorText}>{mensajeError}</Text> : null}

          <TouchableOpacity
            style={[styles.button, styles.registerButton, cargando ? styles.buttonDisabled : null]}
            onPress={handleRegister}
            disabled={cargando}
          >
            <Text style={styles.buttonText}>
              {cargando ? "Registrando..." : "Registrarme"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>Ya tengo cuenta</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%"
  },
  backgroundImage: {
    opacity: 0.94
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(13, 56, 85, 0.2)",
    width: "100%"
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center"
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(213, 227, 241, 0.95)",
    width: "100%",
    maxWidth: 430,
    alignSelf: "center"
  },
  label: {
    color: theme.colors.muted,
    fontWeight: "700",
    marginBottom: 6
  },
  logoContainer: {
    width: 78,
    height: 78,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 39,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  logoImage: {
    width: 58,
    height: 58,
    borderRadius: 29
  },
  title: {
    fontSize: 30,
    textAlign: "center",
    color: theme.colors.text,
    fontWeight: "800"
  },
  subtitle: {
    textAlign: "center",
    color: theme.colors.muted,
    marginTop: 8,
    marginBottom: 16
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: 15,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text
  },
  helperText: {
    color: theme.colors.muted,
    marginTop: -8,
    marginBottom: 12,
    fontSize: 12
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  roleChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  roleChipActive: {
    borderColor: "#7CC6DA",
    backgroundColor: "#E4F6FB"
  },
  roleChipText: {
    color: theme.colors.muted,
    fontWeight: "600"
  },
  roleChipTextActive: {
    color: theme.colors.primaryStrong
  },
  errorText: {
    color: theme.colors.danger,
    marginTop: -2,
    marginBottom: 10,
    fontWeight: "600",
    textAlign: "center"
  },
  button: {
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4
  },
  registerButton: {
    backgroundColor: theme.colors.primary
  },
  buttonDisabled: { opacity: 0.75 },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  linkText: {
    textAlign: "center",
    color: theme.colors.primaryStrong,
    marginTop: 18,
    fontWeight: "600"
  }
});
