import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenContainer from "../Componentes/ScreenContainer";
import { SesionActiva } from "../Contexto/session";
import { supabase } from "../Servicios/supabase";
import { theme } from "../Constantes/theme";

type AttendanceScreenProps = {
  sesion: SesionActiva;
};

type Asistencia = {
  id: string;
  clase_id: string;
  alumno_id: string;
  instructor_id: string | null;
  fecha: string;
  presente: boolean;
};

type Clase = { id: string; nombre: string };
type Usuario = { id: string; nombre: string; rol: string; auth_user_id: string | null };
type Instructor = { id: string; usuario_id: string };

export default function AttendanceScreen({ sesion }: AttendanceScreenProps) {
  const [asistencia, setAsistencia] = useState<Asistencia[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [claseId, setClaseId] = useState("");
  const [alumnoId, setAlumnoId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [presente, setPresente] = useState(true);

  const canRegister = sesion.role === "admin" || sesion.role === "instructor";
  const alumnos = useMemo(() => usuarios.filter((u) => u.rol === "alumno"), [usuarios]);

  const myPerfil = useMemo(
    () => usuarios.find((u) => u.auth_user_id === sesion.usuarioId) || null,
    [usuarios, sesion.usuarioId]
  );

  const myInstructor = useMemo(
    () => (myPerfil ? instructores.find((i) => i.usuario_id === myPerfil.id) || null : null),
    [instructores, myPerfil]
  );

  const loadData = useCallback(async () => {
    if (!supabase) return;
    const [{ data: clasesData }, { data: usersData }, { data: instrData }] = await Promise.all([
      supabase.from("clases").select("id, nombre"),
      supabase.from("usuarios").select("id, nombre, rol, auth_user_id"),
      supabase.from("instructores").select("id, usuario_id")
    ]);
    setClases((clasesData || []) as Clase[]);
    setUsuarios((usersData || []) as Usuario[]);
    setInstructores((instrData || []) as Instructor[]);

    if (sesion.role === "alumno") {
      const perfil = (usersData || []).find((u: any) => u.auth_user_id === sesion.usuarioId);
      if (!perfil) {
        setAsistencia([]);
        return;
      }
      const { data: asistenciaData } = await supabase
        .from("asistencia")
        .select("id, clase_id, alumno_id, instructor_id, fecha, presente")
        .eq("alumno_id", perfil.id)
        .order("fecha", { ascending: false });
      setAsistencia((asistenciaData || []) as Asistencia[]);
      return;
    }

    const { data: asistenciaData } = await supabase
      .from("asistencia")
      .select("id, clase_id, alumno_id, instructor_id, fecha, presente")
      .order("fecha", { ascending: false });
    setAsistencia((asistenciaData || []) as Asistencia[]);
  }, [sesion.role, sesion.usuarioId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function registrarAsistencia() {
    if (!supabase || !canRegister) return;
    if (!claseId || !alumnoId || !fecha) {
      Alert.alert("Datos faltantes", "Completa clase, alumno y fecha.");
      return;
    }
    const { error } = await supabase.from("asistencia").upsert(
      [
        {
          clase_id: claseId,
          alumno_id: alumnoId,
          instructor_id: myInstructor?.id || null,
          fecha,
          presente
        }
      ],
      { onConflict: "clase_id,alumno_id,fecha" }
    );
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    loadData();
  }

  const claseNombre = (id: string) => clases.find((c) => c.id === id)?.nombre || id;
  const alumnoNombre = (id: string) => alumnos.find((a) => a.id === id)?.nombre || id;

  return (
    <ScreenContainer>
      <Text style={styles.title}>Registro de Asistencia</Text>
      <Text style={styles.subtitle}>Marcacion por clase y reportes por alumno.</Text>

      {canRegister && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Marcar asistencia</Text>
          <TextInput style={styles.input} placeholder="Clase ID" value={claseId} onChangeText={setClaseId} />
          <TextInput style={styles.input} placeholder="Alumno ID" value={alumnoId} onChangeText={setAlumnoId} />
          <TextInput style={styles.input} placeholder="Fecha (YYYY-MM-DD)" value={fecha} onChangeText={setFecha} />
          <TextInput
            style={styles.input}
            placeholder="Presente (si/no)"
            value={presente ? "si" : "no"}
            onChangeText={(v) => setPresente(v.toLowerCase() !== "no")}
          />
          <Text style={styles.note}>Clases: {clases.map((c) => `${c.nombre} (${c.id})`).join(" | ") || "sin clases"}</Text>
          <Text style={styles.note}>Alumnos: {alumnos.map((a) => `${a.nombre} (${a.id})`).join(" | ") || "sin alumnos"}</Text>
          <Pressable style={styles.primaryBtn} onPress={registrarAsistencia}>
            <Text style={styles.primaryText}>Guardar asistencia</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reporte</Text>
        {asistencia.length === 0 && <Text style={styles.note}>No hay registros de asistencia.</Text>}
        {asistencia.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.rowMain}>{alumnoNombre(item.alumno_id)}</Text>
            <Text style={styles.rowSecondary}>
              {claseNombre(item.clase_id)} | {item.fecha} | {item.presente ? "presente" : "ausente"}
            </Text>
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
  note: { color: theme.colors.muted, marginBottom: 6 },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  row: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 8 },
  rowMain: { color: theme.colors.text, fontWeight: "700" },
  rowSecondary: { color: theme.colors.muted, marginTop: 2 }
});
