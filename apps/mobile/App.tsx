import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chiavo</Text>
      <Text style={styles.subtitle}>App loaded successfully</Text>
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
  },
  subtitle: {
    fontSize: 18,
    color: "#5A5A6E",
    marginTop: 16,
  },
});
