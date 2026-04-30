import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenContainer from "../Componentes/ScreenContainer";
import { SesionActiva } from "../Contexto/session";
import { supabase } from "../Servicios/supabase";
import { theme } from "../Constantes/theme";

type ClassesScreenProps = {
  sesion: SesionActiva;
};

type Clase = {
  id: string;
  nombre: string;
  horario: string;
  nivel: string;
  instructor_id: string | null;
  cupo_maximo: number;
};

type Instructor = {
  id: string;
  usuario_id: string;
};

type Usuario = {
  id: string;
  nombre: string;
  rol: string;
};

export default function ClassesScreen({ sesion }: ClassesScreenProps) {
  const [clases, setClases] = useState<Clase[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [inscripciones, setInscripciones] = useState<Record<string, number>>({});
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoHorario, setNuevoHorario] = useState("");
  const [nuevoNivel, setNuevoNivel] = useState("");
  const [nuevoInstructorId, setNuevoInstructorId] = useState("");
  const [claseSeleccionada, setClaseSeleccionada] = useState("");
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState("");

  const canManage = sesion.role === "admin" || sesion.role === "instructor";
  const alumnos = useMemo(() => usuarios.filter((u) => u.rol === "alumno"), [usuarios]);

  const loadData = useCallback(async () => {
    if (!supabase) return;
    const [{ data: clasesData }, { data: instrData }, { data: usersData }, { data: links }] =
      await Promise.all([
        supabase
          .from("clases")
          .select("id, nombre, horario, nivel, instructor_id, cupo_maximo")
          .order("horario", { ascending: true }),
        supabase.from("instructores").select("id, usuario_id"),
        supabase.from("usuarios").select("id, nombre, rol"),
        supabase.from("clase_alumnos").select("clase_id")
      ]);

    setClases((clasesData || []) as Clase[]);
    setInstructores((instrData || []) as Instructor[]);
    setUsuarios((usersData || []) as Usuario[]);

    const grouped: Record<string, number> = {};
    (links || []).forEach((l: any) => {
      grouped[l.clase_id] = (grouped[l.clase_id] || 0) + 1;
    });
    setInscripciones(grouped);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!supabase) return;
    const ch = supabase
      .channel("clases-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clases" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "clase_alumnos" }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadData]);

  const instructorNombre = (instructorId: string | null) => {
    if (!instructorId) return "Sin instructor";
    const instr = instructores.find((i) => i.id === instructorId);
    if (!instr) return "Sin instructor";
    return usuarios.find((u) => u.id === instr.usuario_id)?.nombre || "Instructor";
  };

  async function crearClase() {
    if (!supabase || !canManage) return;
    if (!nuevoNombre.trim() || !nuevoHorario.trim() || !nuevoNivel.trim()) {
      Alert.alert("Datos faltantes", "Completa nombre, horario y nivel.");
      return;
    }
    const { error } = await supabase.from("clases").insert([
      {
        nombre: nuevoNombre.trim(),
        horario: nuevoHorario.trim(),
        nivel: nuevoNivel.trim(),
        instructor_id: nuevoInstructorId || null
      }
    ]);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setNuevoNombre("");
    setNuevoHorario("");
    setNuevoNivel("");
    setNuevoInstructorId("");
    loadData();
  }

  async function asignarAlumnoAClase() {
    if (!supabase || !canManage) return;
    if (!claseSeleccionada || !alumnoSeleccionado) {
      Alert.alert("Datos faltantes", "Selecciona clase y alumno.");
      return;
    }
    const { error } = await supabase.from("clase_alumnos").insert([
      {
        clase_id: claseSeleccionada,
        alumno_id: alumnoSeleccionado
      }
    ]);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setAlumnoSeleccionado("");
    setClaseSeleccionada("");
    loadData();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Gestion de Clases</Text>
      <Text style={styles.subtitle}>Programacion, instructor y alumnos por clase.</Text>

      {canManage && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crear clase</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de clase"
            value={nuevoNombre}
            onChangeText={setNuevoNombre}
          />
          <TextInput
            style={styles.input}
            placeholder="Horario (YYYY-MM-DDTHH:mm:ssZ)"
            value={nuevoHorario}
            onChangeText={setNuevoHorario}
          />
          <TextInput
            style={styles.input}
            placeholder="Nivel"
            value={nuevoNivel}
            onChangeText={setNuevoNivel}
          />
          <TextInput
            style={styles.input}
            placeholder="Instructor ID (opcional)"
            value={nuevoInstructorId}
            onChangeText={setNuevoInstructorId}
          />
          <Text style={styles.note}>
            IDs instructores: {instructores.map((i) => `${i.id}`).join(", ") || "sin datos"}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={crearClase}>
            <Text style={styles.primaryText}>Guardar clase</Text>
          </Pressable>
        </View>
      )}

      {canManage && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Asignar alumno a clase</Text>
          <TextInput
            style={styles.input}
            placeholder="Clase ID"
            value={claseSeleccionada}
            onChangeText={setClaseSeleccionada}
          />
          <TextInput
            style={styles.input}
            placeholder="Alumno ID"
            value={alumnoSeleccionado}
            onChangeText={setAlumnoSeleccionado}
          />
          <Text style={styles.note}>
            IDs alumnos: {alumnos.map((a) => `${a.nombre} (${a.id})`).join(" | ") || "sin alumnos"}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={asignarAlumnoAClase}>
            <Text style={styles.primaryText}>Asignar</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listado de clases</Text>
        {clases.length === 0 && <Text style={styles.note}>No hay clases registradas.</Text>}
        {clases.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.rowMain}>{item.nombre}</Text>
            <Text style={styles.rowSecondary}>Nivel: {item.nivel}</Text>
            <Text style={styles.rowSecondary}>Horario: {new Date(item.horario).toLocaleString()}</Text>
            <Text style={styles.rowSecondary}>Instructor: {instructorNombre(item.instructor_id)}</Text>
            <Text style={styles.rowSecondary}>
              Cupo: {inscripciones[item.id] || 0}/{item.cupo_maximo}
            </Text>
            <Text style={styles.idText}>ID: {item.id}</Text>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  subtitle: { color: theme.colors.primaryStrong, marginBottom: 10 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: theme.colors.text, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceSoft
  },
  note: { color: theme.colors.muted, marginBottom: 8 },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  row: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 8 },
  rowMain: { color: theme.colors.text, fontWeight: "700" },
  rowSecondary: { color: theme.colors.muted, marginTop: 1 },
  idText: { color: theme.colors.muted, marginTop: 4, fontSize: 12 }
});
