import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../Componentes/ScreenContainer";
import { cerrarSesionActiva, SesionActiva } from "../Contexto/session";
import { supabase } from "../Servicios/supabase";
import { theme } from "../Constantes/theme";

type HomeScreenProps = {
  navigation: any;
  sesion: SesionActiva;
};

const quickItems = [
  { title: "Alumnos", subtitle: "Perfiles y seguimiento", screen: "Alumno" },
  { title: "Instructores", subtitle: "Equipo y roles", screen: "Instructores" },
  { title: "Clases", subtitle: "Horarios y niveles", screen: "Clases" },
  { title: "Pagos", subtitle: "Control de recaudo", screen: "Pagos" },
  { title: "Asistencia", subtitle: "Marcacion diaria", screen: "Asistencia" },
  { title: "Institucion", subtitle: "Informacion general", screen: "Institucion" }
] as const;

const homeImages = {
  hero: require("../../assets/imagen2.jpg"),
  featured: require("../../assets/imagen4.jpg"),
  logo: require("../../assets/logo.png")
};

export default function HomeScreen({ navigation, sesion }: HomeScreenProps) {
  async function cerrarSesion() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    await cerrarSesionActiva();
    const stackNav = navigation.getParent();
    if (stackNav?.replace) {
      stackNav.replace("Login");
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.heroPanel}>
        <View style={styles.heroImageFrame}>
          <Image source={homeImages.hero} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />
        </View>
        <View style={styles.brandWrap}>
          <Image source={homeImages.logo} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.brandName}>SkatePro Academy</Text>
            <Text style={styles.brandTag}>Rol activo: {sesion.role}</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={cerrarSesion}>
            <Text style={styles.logoutText}>Salir</Text>
          </Pressable>
        </View>
        <Text style={styles.heroTitle}>Panel de Gestion</Text>
        <Text style={styles.heroSubtitle}>Todo lo importante en un solo lugar.</Text>
      </View>

      <View style={styles.quickCard}>
        <Text style={styles.quickTitle}>Accesos rapidos</Text>
        <View style={styles.quickGrid}>
          {quickItems.map((item) => (
            <Pressable key={item.title} style={styles.quickItem} onPress={() => navigation.navigate(item.screen)}>
              <Text style={styles.quickItemTitle}>{item.title}</Text>
              <Text style={styles.quickItemSubtitle}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.featuredCard}>
        <View style={styles.featuredHead}>
          <Text style={styles.featuredTitle}>Vida en la pista</Text>
          <Pressable onPress={() => navigation.navigate("Institucion")}>
            <Text style={styles.featuredLink}>Ver institucion</Text>
          </Pressable>
        </View>
        <Text style={styles.featuredText}>Entrenamiento, disciplina y comunidad en cada jornada.</Text>
        <Image source={homeImages.featured} style={styles.featuredImage} resizeMode="cover" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroPanel: {
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D6E6F4",
    backgroundColor: "#0F4C6D"
  },
  heroImageFrame: {
    width: "100%",
    height: 164,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    backgroundColor: "#EAF2F8"
  },
  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: "rgba(5, 31, 49, 0.42)"
  },
  heroImage: {
    width: "100%",
    height: "100%"
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6
  },
  logoutBtn: {
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#D9ECFB"
  },
  brandName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  brandTag: {
    fontSize: 12,
    color: "#DDF1FF",
    fontWeight: "700"
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    paddingHorizontal: 14,
    marginTop: 4
  },
  heroSubtitle: {
    color: "#E5F2FC",
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingBottom: 12,
    marginTop: 3
  },
  quickCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CFE0EF",
    padding: 12,
    marginBottom: 14
  },
  quickTitle: {
    color: "#12344D",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 9
  },
  quickItem: {
    width: "49%",
    backgroundColor: "#F1F7FD",
    borderWidth: 1,
    borderColor: "#D3E3F2",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    minHeight: 66,
    justifyContent: "center"
  },
  quickItemTitle: {
    color: "#0C5879",
    fontWeight: "800",
    fontSize: 14
  },
  quickItemSubtitle: {
    color: "#58728A",
    fontSize: 12,
    marginTop: 3
  },
  featuredCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 6,
    gap: 8
  },
  featuredHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  featuredLink: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 12
  },
  featuredText: {
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 19
  },
  featuredImage: {
    width: "100%",
    height: 156,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D5E3F1",
    backgroundColor: "#EAF2F8"
  }
});
