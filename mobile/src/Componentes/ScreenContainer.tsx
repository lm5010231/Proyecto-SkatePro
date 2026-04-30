import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { theme } from "../Constantes/theme";

type ScreenContainerProps = {
  children: ReactNode;
};

export default function ScreenContainer({ children }: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  blobTop: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -110,
    right: -80,
    backgroundColor: "#D5F1F8"
  },
  blobBottom: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: -130,
    left: -90,
    backgroundColor: "#FDE7B3"
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28
  },
  inner: {
    borderRadius: theme.radius.xl
  }
});
