import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Chiavo</Text>
      <Text style={styles.subtitle}>App is loading correctly!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEF7E4",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "800",
    color: "#1C1C28",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: "#5A5A6E",
    marginTop: 16,
  },
});
