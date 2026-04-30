import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenContainer from "../Componentes/ScreenContainer";
import { SesionActiva } from "../Contexto/session";
import { supabase } from "../Servicios/supabase";
import { theme } from "../Constantes/theme";

type InstitutionalScreenProps = {
  sesion: SesionActiva;
};

type InfoItem = { id: string; clave: string; contenido: string };
type Noticia = { id: string; titulo: string; contenido: string; fecha_evento: string | null };
type Testimonio = { id: string; autor: string; contenido: string; puntuacion: number | null };
type Galeria = { id: string; titulo: string; descripcion: string | null; tipo: string; storage_path: string };

export default function InstitutionalScreen({ sesion }: InstitutionalScreenProps) {
  const [info, setInfo] = useState<InfoItem[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [testimonios, setTestimonios] = useState<Testimonio[]>([]);
  const [galeria, setGaleria] = useState<Galeria[]>([]);
  const [tituloNoticia, setTituloNoticia] = useState("");
  const [contenidoNoticia, setContenidoNoticia] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");

  const isAdmin = sesion.role === "admin";

  const loadData = useCallback(async () => {
    if (!supabase) return;
    const [{ data: infoData }, { data: noticiasData }, { data: testData }, { data: galeriaData }] =
      await Promise.all([
        supabase.from("informacion_institucional").select("id, clave, contenido").order("clave"),
        supabase
          .from("noticias")
          .select("id, titulo, contenido, fecha_evento")
          .eq("publicado", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("testimonios")
          .select("id, autor, contenido, puntuacion")
          .order("created_at", { ascending: false }),
        supabase
          .from("galeria")
          .select("id, titulo, descripcion, tipo, storage_path")
          .order("created_at", { ascending: false })
      ]);
    setInfo((infoData || []) as InfoItem[]);
    setNoticias((noticiasData || []) as Noticia[]);
    setTestimonios((testData || []) as Testimonio[]);
    setGaleria((galeriaData || []) as Galeria[]);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!supabase) return;
    const ch = supabase
      .channel("institucional-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "informacion_institucional" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "noticias" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "testimonios" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "galeria" }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadData]);

  async function crearNoticia() {
    if (!supabase || !isAdmin) return;
    if (!tituloNoticia.trim() || !contenidoNoticia.trim()) {
      Alert.alert("Datos faltantes", "Ingresa titulo y contenido.");
      return;
    }
    const { error } = await supabase.from("noticias").insert([
      {
        titulo: tituloNoticia.trim(),
        contenido: contenidoNoticia.trim(),
        fecha_evento: fechaEvento || null,
        publicado: true
      }
    ]);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setTituloNoticia("");
    setContenidoNoticia("");
    setFechaEvento("");
    loadData();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Divulgacion Institucional</Text>
      <Text style={styles.subtitle}>Mision, vision, valores, noticias, testimonios y galeria.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informacion institucional</Text>
        {info.length === 0 && <Text style={styles.note}>Sin contenido institucional.</Text>}
        {info.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.rowMain}>{item.clave.toUpperCase()}</Text>
            <Text style={styles.rowSecondary}>{item.contenido}</Text>
          </View>
        ))}
      </View>

      {isAdmin && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Publicar noticia/evento</Text>
          <TextInput style={styles.input} placeholder="Titulo" value={tituloNoticia} onChangeText={setTituloNoticia} />
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            placeholder="Contenido"
            value={contenidoNoticia}
            onChangeText={setContenidoNoticia}
          />
          <TextInput
            style={styles.input}
            placeholder="Fecha evento (YYYY-MM-DD)"
            value={fechaEvento}
            onChangeText={setFechaEvento}
          />
          <Pressable style={styles.primaryBtn} onPress={crearNoticia}>
            <Text style={styles.primaryText}>Publicar</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Noticias y eventos</Text>
        {noticias.length === 0 && <Text style={styles.note}>Sin noticias publicadas.</Text>}
        {noticias.map((n) => (
          <View key={n.id} style={styles.row}>
            <Text style={styles.rowMain}>{n.titulo}</Text>
            <Text style={styles.rowSecondary}>{n.contenido}</Text>
            {!!n.fecha_evento && <Text style={styles.rowSecondary}>Fecha: {n.fecha_evento}</Text>}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Testimonios</Text>
        {testimonios.length === 0 && <Text style={styles.note}>Sin testimonios.</Text>}
        {testimonios.map((t) => (
          <View key={t.id} style={styles.row}>
            <Text style={styles.rowMain}>{t.autor}</Text>
            <Text style={styles.rowSecondary}>{t.contenido}</Text>
            <Text style={styles.rowSecondary}>Puntuacion: {t.puntuacion ?? "-"}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Galeria multimedia</Text>
        <Text style={styles.note}>Los archivos fisicos van en Supabase Storage; aqui se muestra el registro.</Text>
        {galeria.length === 0 && <Text style={styles.note}>Sin elementos en galeria.</Text>}
        {galeria.map((g) => (
          <View key={g.id} style={styles.row}>
            <Text style={styles.rowMain}>{g.titulo}</Text>
            <Text style={styles.rowSecondary}>
              {g.tipo} | {g.storage_path}
            </Text>
            {!!g.descripcion && <Text style={styles.rowSecondary}>{g.descripcion}</Text>}
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
  textArea: { minHeight: 90, textAlignVertical: "top" },
  note: { color: theme.colors.muted },
  row: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 8 },
  rowMain: { color: theme.colors.text, fontWeight: "700" },
  rowSecondary: { color: theme.colors.muted, marginTop: 2 },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "700" }
});
