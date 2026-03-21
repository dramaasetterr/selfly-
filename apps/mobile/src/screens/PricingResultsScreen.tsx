import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../App";
import type { PriceType, PricingInput, PricingResult } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

type Props = NativeStackScreenProps<AppStackParamList, "PricingResults">;

const PRICE_OPTIONS: {
  type: PriceType;
  label: string;
  subtitle: string;
  key: keyof PricingResult;
}[] = [
  {
    type: "sell_fast",
    label: "Sell Fast",
    subtitle: "Attract more buyers quickly",
    key: "sell_fast_price",
  },
  {
    type: "recommended",
    label: "Recommended",
    subtitle: "Best balance of speed and value",
    key: "recommended_price",
  },
  {
    type: "maximize",
    label: "Maximize Value",
    subtitle: "Get top dollar, may take longer",
    key: "maximize_price",
  },
];

function formatPrice(price: number): string {
  return "$" + price.toLocaleString("en-US");
}

export default function PricingResultsScreen({ navigation, route }: Props) {
  const { input, result } = route.params;
  const { user } = useAuth();
  const [selected, setSelected] = useState<PriceType>("recommended");
  const [saving, setSaving] = useState(false);

  const selectedPrice = result[
    PRICE_OPTIONS.find((o) => o.type === selected)!.key
  ] as number;

  const handleConfirm = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error: insertError } = await supabase
        .from("pricing_results")
        .insert({
          user_id: user.id,
          address: input.address,
          sqft: input.sqft,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          year_built: input.year_built,
          condition: input.condition,
          recommended_price: result.recommended_price,
          sell_fast_price: result.sell_fast_price,
          maximize_price: result.maximize_price,
          reasoning: result.reasoning,
          selected_price_type: selected,
          selected_price: selectedPrice,
        });

      if (insertError) throw insertError;

      // Advance pipeline stage past price_it
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ current_stage: "create_listing" })
        .eq("id", user.id);

      if (updateError) throw updateError;

      navigation.navigate("Home");
    } catch {
      Alert.alert("Error", "Could not save your selection. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Your Price Options</Text>
        <Text style={styles.subtitle}>Select a pricing strategy for your home</Text>

        <View style={styles.cards}>
          {PRICE_OPTIONS.map((option) => {
            const price = result[option.key] as number;
            const isSelected = selected === option.type;
            const isRecommended = option.type === "recommended";

            return (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.card,
                  isRecommended && styles.cardRecommended,
                  isSelected && styles.cardSelected,
                ]}
                onPress={() => setSelected(option.type)}
                activeOpacity={0.7}
              >
                {isRecommended && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>AI Recommended</Text>
                  </View>
                )}
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={[styles.cardPrice, isSelected && styles.cardPriceSelected]}>
                  {formatPrice(price)}
                </Text>
                <Text style={[styles.cardSubtitle, isSelected && styles.cardSubtitleSelected]}>
                  {option.subtitle}
                </Text>
                {isSelected && <View style={styles.checkCircle}><Text style={styles.check}>✓</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.reasoningSection}>
          <Text style={styles.reasoningTitle}>Pricing Analysis</Text>
          {result.reasoning.map((reason, i) => (
            <View key={i} style={styles.reasoningRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.reasoningText}>{reason}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmText}>
              Confirm {formatPrice(selectedPrice)}
            </Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 24,
  },
  cards: {
    gap: 12,
  },
  card: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 20,
    position: "relative",
  },
  cardRecommended: {
    borderColor: "#93C5FD",
    backgroundColor: "#F8FAFF",
  },
  cardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  cardLabelSelected: {
    color: "#1E40AF",
  },
  cardPrice: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardPriceSelected: {
    color: "#2563EB",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  cardSubtitleSelected: {
    color: "#3B82F6",
  },
  checkCircle: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  check: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  reasoningSection: {
    marginTop: 28,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 18,
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  reasoningRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 15,
    color: "#2563EB",
    marginRight: 8,
    lineHeight: 22,
  },
  reasoningText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  confirmButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
