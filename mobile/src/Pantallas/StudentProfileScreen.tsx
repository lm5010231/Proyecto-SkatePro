import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import ScreenContainer from "../Componentes/ScreenContainer";
import { SesionActiva } from "../Contexto/session";
import { supabase } from "../Servicios/supabase";
import { theme } from "../Constantes/theme";

type StudentProfileScreenProps = {
  sesion: SesionActiva;
};

type UsuarioPerfil = {
  id: string;
  nombre: string;
  fecha_nacimiento: string | null;
  genero: string | null;
  correo: string;
  telefono: string | null;
  metodo_pago: string | null;
  rol: string;
};

type Pago = {
  id: string;
  monto: number;
  estado: "pendiente" | "pagado";
  metodo_pago: string | null;
  created_at: string;
};

type Clase = {
  id: string;
  nombre: string;
  nivel: string;
  horario: string;
};

export default function StudentProfileScreen({ sesion }: StudentProfileScreenProps) {
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const perfilEsAlumno = sesion.role === "alumno";
  const totalPagado = useMemo(
    () => pagos.filter((p) => p.estado === "pagado").reduce((acc, p) => acc + Number(p.monto), 0),
    [pagos]
  );

  const loadAll = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const { data: perfilData, error: perfilError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("auth_user_id", sesion.usuarioId)
      .maybeSingle();

    if (perfilError) {
      Alert.alert("Error", perfilError.message);
      setLoading(false);
      return;
    }

    if (!perfilData) {
      setLoading(false);
      return;
    }

    setPerfil(perfilData as UsuarioPerfil);

    const [{ data: pagosData }, { data: links }] = await Promise.all([
      supabase
        .from("pagos")
        .select("id, monto, estado, metodo_pago, created_at")
        .eq("usuario_id", perfilData.id)
        .order("created_at", { ascending: false }),
      supabase.from("clase_alumnos").select("clase_id").eq("alumno_id", perfilData.id)
    ]);

    setPagos((pagosData || []) as Pago[]);

    const claseIds = (links || []).map((l: any) => l.clase_id);
    if (claseIds.length > 0) {
      const { data: clasesData } = await supabase
        .from("clases")
        .select("id, nombre, nivel, horario")
        .in("id", claseIds)
        .order("horario", { ascending: true });
      setClases((clasesData || []) as Clase[]);
    } else {
      setClases([]);
    }

    setLoading(false);
  }, [sesion.usuarioId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!supabase || !perfil) return;
    const ch = supabase
      .channel("alumno-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pagos" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "clase_alumnos" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "clases" }, loadAll)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadAll, perfil]);

  async function saveProfile() {
    if (!supabase || !perfil) return;
    setSaving(true);
    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre: perfil.nombre.trim(),
        fecha_nacimiento: perfil.fecha_nacimiento,
        genero: perfil.genero,
        telefono: perfil.telefono?.trim() || null,
        metodo_pago: perfil.metodo_pago
      })
      .eq("id", perfil.id);

    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    Alert.alert("Perfil actualizado", "Tus datos personales fueron guardados.");
  }

  if (!supabase) {
    return (
      <ScreenContainer>
        <Text style={styles.title}>Gestion de Alumnos</Text>
        <Text style={styles.note}>Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Gestion de Alumnos</Text>
      <Text style={styles.subtitle}>Perfil, pagos y clases en tiempo real.</Text>

      {loading && <ActivityIndicator size="large" color={theme.colors.primary} />}

      {!loading && !perfil && (
        <View style={styles.card}>
          <Text style={styles.note}>No se encontro perfil asociado al usuario autenticado.</Text>
        </View>
      )}

      {!!perfil && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Perfil</Text>
            <TextInput
              style={styles.input}
              value={perfil.nombre}
              onChangeText={(v) => setPerfil((prev) => (prev ? { ...prev, nombre: v } : prev))}
              placeholder="Nombre"
            />
            <TextInput style={styles.input} value={perfil.correo} editable={false} />
            <TextInput
              style={styles.input}
              value={perfil.telefono || ""}
              onChangeText={(v) => setPerfil((prev) => (prev ? { ...prev, telefono: v } : prev))}
              placeholder="Telefono"
            />
            <TextInput
              style={styles.input}
              value={perfil.fecha_nacimiento || ""}
              onChangeText={(v) =>
                setPerfil((prev) => (prev ? { ...prev, fecha_nacimiento: v } : prev))
              }
              placeholder="Fecha nacimiento (YYYY-MM-DD)"
            />
            <TextInput
              style={styles.input}
              value={perfil.genero || ""}
              onChangeText={(v) => setPerfil((prev) => (prev ? { ...prev, genero: v } : prev))}
              placeholder="Genero"
            />
            <TextInput
              style={styles.input}
              value={perfil.metodo_pago || ""}
              onChangeText={(v) =>
                setPerfil((prev) => (prev ? { ...prev, metodo_pago: v } : prev))
              }
              placeholder="Metodo de pago"
            />
            {perfilEsAlumno && (
              <Pressable style={styles.primaryBtn} disabled={saving} onPress={saveProfile}>
                <Text style={styles.primaryText}>{saving ? "Guardando..." : "Guardar perfil"}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado de pagos</Text>
            <Text style={styles.summary}>Total pagado: ${totalPagado.toFixed(2)}</Text>
            {pagos.length === 0 && <Text style={styles.note}>No hay pagos registrados.</Text>}
            {pagos.map((p) => (
              <View key={p.id} style={styles.row}>
                <Text style={styles.rowMain}>${Number(p.monto).toFixed(2)}</Text>
                <Text style={styles.rowSecondary}>
                  {p.estado} | {p.metodo_pago || "sin metodo"}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Horarios y clases</Text>
            {clases.length === 0 && <Text style={styles.note}>No tienes clases asignadas.</Text>}
            {clases.map((c) => (
              <View key={c.id} style={styles.row}>
                <Text style={styles.rowMain}>{c.nombre}</Text>
                <Text style={styles.rowSecondary}>
                  {c.nivel} | {new Date(c.horario).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", color: theme.colors.text },
  subtitle: { color: theme.colors.primaryStrong, marginBottom: 12, fontWeight: "700" },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12
  },
  cardTitle: { fontSize: 17, fontWeight: "800", color: theme.colors.text, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceSoft
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  summary: { color: theme.colors.accent, fontWeight: "800", marginBottom: 6 },
  row: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    marginTop: 8
  },
  rowMain: { color: theme.colors.text, fontWeight: "700" },
  rowSecondary: { color: theme.colors.muted },
  note: { color: theme.colors.muted }
});
