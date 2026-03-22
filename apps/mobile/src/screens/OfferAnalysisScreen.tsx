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
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 8 ? colors.success : score >= 5 ? colors.warning : colors.error;
  const bgColor = score >= 8 ? colors.accentLight : score >= 5 ? colors.amberLight : colors.errorLight;
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
    try {
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
    } catch {
      // Will show error state
    } finally {
      setLoading(false);
    }
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
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{"\u2190"} Back</Text>
          </TouchableOpacity>
          <View style={styles.loadingContainer}>
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm }}>
              Analysis Not Available
            </Text>
            <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: "center" }}>
              Could not load the offer analysis. Please go back and try again.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const scoreColor =
    analysis.score >= 8 ? colors.success : analysis.score >= 5 ? colors.warning : colors.error;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"\u2190"} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Offer Analysis</Text>

        {/* Score */}
        <View style={styles.scoreCard}>
          <ScoreCircle score={analysis.score} />
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>
            {analysis.score_label}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{analysis.summary}</Text>
          </View>
        </View>

        {/* Red Flags */}
        {analysis.red_flags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Red Flags</Text>
            <View style={styles.redFlagsContainer}>
              {analysis.red_flags.map((flag, i) => (
                <View key={i} style={styles.redFlagRow}>
                  <View style={styles.redFlagIconWrap}>
                    <Text style={styles.redFlagIcon}>!</Text>
                  </View>
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
                    <View style={styles.counterBulletDot} />
                    <Text style={styles.counterChangeText}>{change}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.counterReasoningWrap}>
              <Text style={styles.counterReasoningLabel}>Reasoning</Text>
              <Text style={styles.counterReasoningText}>
                {analysis.counter_offer.reasoning}
              </Text>
            </View>
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
              <ActivityIndicator color={colors.white} size="small" />
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    marginBottom: spacing.sm,
    alignSelf: "flex-start",
  },
  backText: {
    ...typography.body,
    color: colors.primaryLight,
    fontWeight: "500",
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  scoreCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  scoreCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: "800",
  },
  scoreDenom: {
    ...typography.bodyBold,
    marginTop: -4,
  },
  scoreLabel: {
    ...typography.h3,
    fontWeight: "700",
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm + 2,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  summaryText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 23,
  },
  redFlagsContainer: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  redFlagRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  redFlagIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm + 2,
    marginTop: 1,
  },
  redFlagIcon: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  redFlagText: {
    flex: 1,
    ...typography.caption,
    color: colors.errorDark,
    lineHeight: 20,
  },
  counterCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
  },
  counterPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  counterPriceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  counterPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primaryLight,
  },
  counterChanges: {
    marginBottom: spacing.md,
  },
  counterChangesLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  counterChangeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  counterBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
    marginRight: spacing.sm + 2,
    marginTop: 7,
  },
  counterChangeText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  counterReasoningWrap: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  counterReasoningLabel: {
    ...typography.captionBold,
    color: colors.primary,
    marginBottom: spacing.xs + 2,
  },
  counterReasoningText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.white,
    ...typography.bodyBold,
    fontSize: 17,
  },
});
