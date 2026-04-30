import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenContainer from "../Componentes/ScreenContainer";
import { SesionActiva } from "../Contexto/session";
import { supabase } from "../Servicios/supabase";
import { theme } from "../Constantes/theme";

type PaymentsScreenProps = {
  sesion: SesionActiva;
};

type Pago = {
  id: string;
  usuario_id: string;
  clase_id: string | null;
  monto: number;
  metodo_pago: string | null;
  estado: "pendiente" | "pagado";
  fecha_pago: string | null;
  created_at: string;
};

type Usuario = { id: string; nombre: string; auth_user_id: string | null };

export default function PaymentsScreen({ sesion }: PaymentsScreenProps) {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [estado, setEstado] = useState<"pendiente" | "pagado">("pendiente");

  const canManage = sesion.role === "admin" || sesion.role === "instructor";
  const totalPendiente = useMemo(
    () => pagos.filter((p) => p.estado === "pendiente").reduce((a, b) => a + Number(b.monto), 0),
    [pagos]
  );
  const totalPagado = useMemo(
    () => pagos.filter((p) => p.estado === "pagado").reduce((a, b) => a + Number(b.monto), 0),
    [pagos]
  );

  const loadData = useCallback(async () => {
    if (!supabase) return;
    const { data: allUsers } = await supabase.from("usuarios").select("id, nombre, auth_user_id");
    setUsuarios((allUsers || []) as Usuario[]);

    if (canManage) {
      const { data } = await supabase
        .from("pagos")
        .select("id, usuario_id, clase_id, monto, metodo_pago, estado, fecha_pago, created_at")
        .order("created_at", { ascending: false });
      setPagos((data || []) as Pago[]);
      return;
    }

    const perfil = (allUsers || []).find((u: any) => u.auth_user_id === sesion.usuarioId);
    if (!perfil) {
      setPagos([]);
      return;
    }
    const { data } = await supabase
      .from("pagos")
      .select("id, usuario_id, clase_id, monto, metodo_pago, estado, fecha_pago, created_at")
      .eq("usuario_id", perfil.id)
      .order("created_at", { ascending: false });
    setPagos((data || []) as Pago[]);
  }, [canManage, sesion.usuarioId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!supabase) return;
    const ch = supabase
      .channel("pagos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pagos" }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadData]);

  async function crearPago() {
    if (!supabase || !canManage) return;
    const valor = Number(monto);
    if (!usuarioId || Number.isNaN(valor) || valor <= 0) {
      Alert.alert("Datos invalidos", "Selecciona usuario y monto mayor a 0.");
      return;
    }
    const { error } = await supabase.from("pagos").insert([
      {
        usuario_id: usuarioId,
        monto: valor,
        metodo_pago: metodo,
        estado,
        fecha_pago: estado === "pagado" ? new Date().toISOString() : null
      }
    ]);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setMonto("");
    setUsuarioId("");
    setMetodo("efectivo");
    setEstado("pendiente");
    loadData();
  }

  async function toggleEstado(pago: Pago) {
    if (!supabase || !canManage) return;
    const nuevoEstado = pago.estado === "pagado" ? "pendiente" : "pagado";
    const { error } = await supabase
      .from("pagos")
      .update({
        estado: nuevoEstado,
        fecha_pago: nuevoEstado === "pagado" ? new Date().toISOString() : null
      })
      .eq("id", pago.id);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    loadData();
  }

  const nombreUsuario = (id: string) => usuarios.find((u) => u.id === id)?.nombre || "Alumno";

  return (
    <ScreenContainer>
      <Text style={styles.title}>Gestion de Pagos</Text>
      <Text style={styles.subtitle}>Estado dinamico y reportes en base de datos.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reporte</Text>
        <Text style={styles.metric}>Pagado: ${totalPagado.toFixed(2)}</Text>
        <Text style={styles.metric}>Pendiente: ${totalPendiente.toFixed(2)}</Text>
      </View>

      {canManage && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registrar pago</Text>
          <TextInput
            style={styles.input}
            placeholder="Usuario ID"
            value={usuarioId}
            onChangeText={setUsuarioId}
          />
          <TextInput style={styles.input} placeholder="Monto" value={monto} onChangeText={setMonto} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Metodo pago" value={metodo} onChangeText={setMetodo} />
          <TextInput style={styles.input} placeholder="Estado (pendiente/pagado)" value={estado} onChangeText={(v) => setEstado(v === "pagado" ? "pagado" : "pendiente")} />
          <Text style={styles.note}>Usuarios: {usuarios.map((u) => `${u.nombre} (${u.id})`).join(" | ") || "sin usuarios"}</Text>
          <Pressable style={styles.primaryBtn} onPress={crearPago}>
            <Text style={styles.primaryText}>Guardar pago</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listado</Text>
        {pagos.length === 0 && <Text style={styles.note}>No hay pagos registrados.</Text>}
        {pagos.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.rowMain}>{nombreUsuario(item.usuario_id)}</Text>
            <Text style={styles.rowSecondary}>
              ${Number(item.monto).toFixed(2)} | {item.estado} | {item.metodo_pago || "sin metodo"}
            </Text>
            {canManage && (
              <Pressable style={styles.secondaryBtn} onPress={() => toggleEstado(item)}>
                <Text style={styles.secondaryText}>Cambiar estado</Text>
              </Pressable>
            )}
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
  metric: { color: theme.colors.primaryStrong, fontWeight: "700", marginBottom: 2 },
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
  row: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 8 },
  rowMain: { color: theme.colors.text, fontWeight: "700" },
  rowSecondary: { color: theme.colors.muted, marginTop: 2 },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start"
  },
  secondaryText: { color: theme.colors.primaryStrong, fontWeight: "600" }
});
