import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenContainer from "../Componentes/ScreenContainer";
import { SesionActiva } from "../Contexto/session";
import { supabase } from "../Servicios/supabase";
import { theme } from "../Constantes/theme";

type InstructorsScreenProps = {
  sesion: SesionActiva;
};

type InstructorRow = {
  id: string;
  usuario_id: string;
  especialidad: string | null;
  activo: boolean;
};

type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
};

export default function InstructorsScreen({ sesion }: InstructorsScreenProps) {
  const [instructores, setInstructores] = useState<InstructorRow[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [loading, setLoading] = useState(false);
  const isAdmin = sesion.role === "admin";

  const loadData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const [{ data: instrData }, { data: usersData }] = await Promise.all([
      supabase
        .from("instructores")
        .select("id, usuario_id, especialidad, activo")
        .order("created_at", { ascending: false }),
      supabase
        .from("usuarios")
        .select("id, nombre, correo, rol")
        .order("nombre", { ascending: true })
    ]);
    setInstructores((instrData || []) as InstructorRow[]);
    setUsuarios((usersData || []) as Usuario[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const nombrePorUsuarioId = (id: string) => usuarios.find((u) => u.id === id)?.nombre || id;

  async function createInstructor() {
    if (!supabase || !isAdmin) return;
    if (!usuarioId) {
      Alert.alert("Dato faltante", "Selecciona un usuario.");
      return;
    }

    const { error: roleError } = await supabase
      .from("usuarios")
      .update({ rol: "instructor" })
      .eq("id", usuarioId);

    if (roleError) {
      Alert.alert("Error", roleError.message);
      return;
    }

    const { error } = await supabase.from("instructores").insert([
      {
        usuario_id: usuarioId,
        especialidad: especialidad.trim() || null,
        activo: true
      }
    ]);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setEspecialidad("");
    setUsuarioId("");
    loadData();
  }

  async function toggleActivo(item: InstructorRow) {
    if (!supabase || !isAdmin) return;
    const { error } = await supabase
      .from("instructores")
      .update({ activo: !item.activo })
      .eq("id", item.id);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    loadData();
  }

  async function removeInstructor(id: string) {
    if (!supabase || !isAdmin) return;
    const { error } = await supabase.from("instructores").delete().eq("id", id);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    loadData();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Gestion de Instructores</Text>
      <Text style={styles.subtitle}>CRUD de instructores y asignacion a clases.</Text>

      {isAdmin && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crear instructor</Text>
          <TextInput
            placeholder="ID de usuario"
            style={styles.input}
            value={usuarioId}
            onChangeText={setUsuarioId}
          />
          <TextInput
            placeholder="Especialidad"
            style={styles.input}
            value={especialidad}
            onChangeText={setEspecialidad}
          />
          <Text style={styles.note}>Sugeridos: {usuarios.map((u) => u.nombre).join(", ") || "sin usuarios"}</Text>
          <Pressable style={styles.primaryBtn} onPress={createInstructor}>
            <Text style={styles.primaryText}>Guardar instructor</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listado {loading ? "(cargando...)" : ""}</Text>
        {instructores.length === 0 && <Text style={styles.note}>No hay instructores registrados.</Text>}
        {instructores.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.rowMain}>{nombrePorUsuarioId(item.usuario_id)}</Text>
            <Text style={styles.rowSecondary}>
              {item.especialidad || "Sin especialidad"} | {item.activo ? "activo" : "inactivo"}
            </Text>
            {isAdmin && (
              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryBtn} onPress={() => toggleActivo(item)}>
                  <Text style={styles.secondaryText}>{item.activo ? "Desactivar" : "Activar"}</Text>
                </Pressable>
                <Pressable style={styles.dangerBtn} onPress={() => removeInstructor(item.id)}>
                  <Text style={styles.dangerText}>Eliminar</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </View>
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
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
  note: { color: theme.colors.muted },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  row: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 8 },
  rowMain: { color: theme.colors.text, fontWeight: "700" },
  rowSecondary: { color: theme.colors.muted, marginTop: 2 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.primaryStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  secondaryText: { color: theme.colors.primaryStrong, fontWeight: "700" },
  dangerBtn: {
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  dangerText: { color: theme.colors.danger, fontWeight: "700" }
});
