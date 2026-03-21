import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../App";
import type { PricingInput, PropertyCondition } from "@selfly/shared";

const CONDITIONS: PropertyCondition[] = ["Excellent", "Good", "Fair", "Needs Work"];

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

type Props = NativeStackScreenProps<AppStackParamList, "Pricing">;

export default function PricingScreen({ navigation }: Props) {
  const [address, setAddress] = useState("");
  const [sqft, setSqft] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [condition, setCondition] = useState<PropertyCondition>("Good");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!address || !sqft || !bedrooms || !bathrooms || !yearBuilt) {
      Alert.alert("Missing Fields", "Please fill in all property details.");
      return;
    }

    const input: PricingInput = {
      address,
      sqft: parseInt(sqft, 10),
      bedrooms: parseInt(bedrooms, 10),
      bathrooms: parseInt(bathrooms, 10),
      year_built: parseInt(yearBuilt, 10),
      condition,
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        throw new Error("Failed to get pricing");
      }

      const result = await res.json();
      navigation.navigate("PricingResults", { input, result });
    } catch {
      Alert.alert("Error", "Could not generate pricing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Price Your Home</Text>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Live market comp data coming soon. Pricing is based on AI analysis of your property details.
          </Text>
        </View>

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main St, City, State"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Square Footage</Text>
        <TextInput
          style={styles.input}
          value={sqft}
          onChangeText={setSqft}
          placeholder="e.g. 2000"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Bedrooms</Text>
            <TextInput
              style={styles.input}
              value={bedrooms}
              onChangeText={setBedrooms}
              placeholder="3"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Bathrooms</Text>
            <TextInput
              style={styles.input}
              value={bathrooms}
              onChangeText={setBathrooms}
              placeholder="2"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.label}>Year Built</Text>
        <TextInput
          style={styles.input}
          value={yearBuilt}
          onChangeText={setYearBuilt}
          placeholder="e.g. 1995"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Condition</Text>
        <View style={styles.conditionRow}>
          {CONDITIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.conditionChip, condition === c && styles.conditionChipActive]}
              onPress={() => setCondition(c)}
            >
              <Text style={[styles.conditionText, condition === c && styles.conditionTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Get AI Pricing</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "500",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  note: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  noteText: {
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  conditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  conditionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  conditionChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  conditionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  conditionTextActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
