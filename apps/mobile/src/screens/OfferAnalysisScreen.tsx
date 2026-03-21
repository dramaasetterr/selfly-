import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { OfferAnalysis, Offer } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 8 ? "#22C55E" : score >= 5 ? "#F59E0B" : "#EF4444";
  const bgColor = score >= 8 ? "#F0FDF4" : score >= 5 ? "#FFFBEB" : "#FEF2F2";
  return (
    <View style={[styles.scoreCircle, { borderColor: color, backgroundColor: bgColor }]}>
      <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      <Text style={[styles.scoreDenom, { color: color + "99" }]}>/10</Text>
    </View>
  );
}

export default function OfferAnalysisScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "OfferAnalysis">>();
  const { listingId, offerId, analysis: passedAnalysis, offerInput } = route.params;

  const [analysis, setAnalysis] = useState<OfferAnalysis | null>(passedAnalysis || null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!offerId);
  const [loading, setLoading] = useState(!!offerId && !passedAnalysis);

  useEffect(() => {
    if (offerId && !passedAnalysis) {
      loadOffer();
    }
  }, [offerId]);

  const loadOffer = async () => {
    const { data } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (data) {
      setOffer(data);
      setAnalysis({
        score: data.score!,
        score_label: data.score_label!,
        summary: data.summary!,
        red_flags: data.red_flags || [],
        counter_offer: {
          suggested_price: data.counter_suggested_price!,
          suggested_changes: data.counter_suggested_changes || [],
          reasoning: data.counter_reasoning!,
        },
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !analysis || !offerInput) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("offers").insert({
        user_id: user.id,
        listing_id: listingId,
        offered_price: offerInput.offered_price,
        financing_type: offerInput.financing_type,
        down_payment_pct: offerInput.down_payment_pct,
        inspection_contingency: offerInput.inspection_contingency,
        appraisal_contingency: offerInput.appraisal_contingency,
        closing_date: offerInput.closing_date,
        seller_concessions: offerInput.seller_concessions,
        notes: offerInput.notes,
        score: analysis.score,
        score_label: analysis.score_label,
        summary: analysis.summary,
        red_flags: analysis.red_flags,
        counter_suggested_price: analysis.counter_offer.suggested_price,
        counter_suggested_changes: analysis.counter_offer.suggested_changes,
        counter_reasoning: analysis.counter_offer.reasoning,
      });

      if (error) throw error;

      // Check if this is the first saved offer — advance pipeline
      const { count } = await supabase
        .from("offers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (count === 1) {
        await supabase
          .from("profiles")
          .update({ current_stage: "close_the_deal" })
          .eq("id", user.id);
      }

      setSaved(true);
      Alert.alert("Saved", "Offer has been saved successfully.", [
        { text: "OK", onPress: () => navigation.navigate("Offers") },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save offer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis) return null;

  const scoreColor =
    analysis.score >= 8 ? "#22C55E" : analysis.score >= 5 ? "#F59E0B" : "#EF4444";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Analysis</Text>
          <View style={styles.backButton} />
        </View>

        {/* Score */}
        <View style={styles.scoreSection}>
          <ScoreCircle score={analysis.score} />
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>
            {analysis.score_label}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{analysis.summary}</Text>
        </View>

        {/* Red Flags */}
        {analysis.red_flags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Red Flags</Text>
            <View style={styles.redFlagsContainer}>
              {analysis.red_flags.map((flag, i) => (
                <View key={i} style={styles.redFlagRow}>
                  <Text style={styles.redFlagIcon}>⚠️</Text>
                  <Text style={styles.redFlagText}>{flag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Counter Offer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Counter-Offer</Text>
          <View style={styles.counterCard}>
            <View style={styles.counterPriceRow}>
              <Text style={styles.counterPriceLabel}>Suggested Price</Text>
              <Text style={styles.counterPrice}>
                ${analysis.counter_offer.suggested_price.toLocaleString()}
              </Text>
            </View>

            {analysis.counter_offer.suggested_changes.length > 0 && (
              <View style={styles.counterChanges}>
                <Text style={styles.counterChangesLabel}>Suggested Changes</Text>
                {analysis.counter_offer.suggested_changes.map((change, i) => (
                  <View key={i} style={styles.counterChangeRow}>
                    <Text style={styles.counterBullet}>•</Text>
                    <Text style={styles.counterChangeText}>{change}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.counterReasoningLabel}>Reasoning</Text>
            <Text style={styles.counterReasoningText}>
              {analysis.counter_offer.reasoning}
            </Text>
          </View>
        </View>

        {/* Save Button */}
        {!saved && offerInput && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Offer</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 17,
    color: "#2563EB",
    fontWeight: "500",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  scoreSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 44,
    fontWeight: "800",
  },
  scoreDenom: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: -4,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 23,
  },
  redFlagsContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  redFlagRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  redFlagIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  redFlagText: {
    flex: 1,
    fontSize: 14,
    color: "#991B1B",
    lineHeight: 20,
  },
  counterCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  counterPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  counterPriceLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  counterPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2563EB",
  },
  counterChanges: {
    marginBottom: 14,
  },
  counterChangesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  counterChangeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  counterBullet: {
    fontSize: 14,
    color: "#2563EB",
    marginRight: 8,
    fontWeight: "700",
  },
  counterChangeText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  counterReasoningLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  counterReasoningText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
