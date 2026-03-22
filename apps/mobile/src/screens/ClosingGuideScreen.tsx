import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { ClosingGuideStep } from "../shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";
import TierGate from "../components/TierGate";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function ClosingGuideScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "ClosingGuide">>();
  const { listingId } = route.params;

  const [guide, setGuide] = useState<ClosingGuideStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuide = useCallback(
    async (forceRefresh = false) => {
      if (!user || !listingId) return;
      setLoading(true);
      setError(null);

      try {
        if (!forceRefresh) {
          const { data: cached } = await supabase
            .from("closing_guides")
            .select("*")
            .eq("user_id", user.id)
            .eq("listing_id", listingId)
            .single();

          if (cached?.guide_content) {
            setGuide(cached.guide_content as ClosingGuideStep[]);
            setLoading(false);
            return;
          }
        }

        const { data: checklist } = await supabase
          .from("closing_checklist")
          .select("step_label, completed")
          .eq("user_id", user.id)
          .eq("listing_id", listingId)
          .order("step_order");

        const remainingSteps = (checklist || [])
          .filter((c) => !c.completed)
          .map((c) => c.step_label);

        if (remainingSteps.length === 0) {
          setGuide([]);
          setLoading(false);
          return;
        }

        const { data: listing } = await supabase
          .from("listings")
          .select("address, price")
          .eq("id", listingId)
          .single();

        let state = "";
        const { data: doc } = await supabase
          .from("documents")
          .select("state")
          .eq("user_id", user.id)
          .limit(1)
          .single();
        if (doc?.state) state = doc.state;

        const response = await fetch(`${API_BASE}/api/closing/guide`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state,
            remaining_steps: remainingSteps,
            property_address: listing?.address || "",
            sale_price: listing?.price || 0,
          }),
        });

        if (!response.ok) throw new Error("Failed to generate guide");

        const data = await response.json();
        setGuide(data.guide);

        const { data: existing } = await supabase
          .from("closing_guides")
          .select("id")
          .eq("user_id", user.id)
          .eq("listing_id", listingId)
          .single();

        if (existing) {
          await supabase
            .from("closing_guides")
            .update({ guide_content: data.guide, state })
            .eq("id", existing.id);
        } else {
          await supabase.from("closing_guides").insert({
            user_id: user.id,
            listing_id: listingId,
            state,
            guide_content: data.guide,
          });
        }
      } catch (err) {
        setError("Unable to generate your closing guide. Please try again.");
      }

      setLoading(false);
    },
    [user, listingId]
  );

  useEffect(() => {
    fetchGuide();
  }, [fetchGuide]);

  return (
    <TierGate feature="closing_guide">
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"\u2190"} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>What to Expect</Text>
        <Text style={styles.subtitle}>
          Your personalized closing guide, powered by AI
        </Text>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.loadingText}>Generating your closing guide...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchGuide(true)} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && guide.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              All steps complete! You've finished your closing process.
            </Text>
          </View>
        )}

        {!loading &&
          guide.map((item, index) => (
            <View key={index} style={styles.guideCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepTitle}>{item.step}</Text>
              </View>
              <Text style={styles.explanation}>{item.explanation}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Timeline</Text>
                  <Text style={styles.metaValue}>{item.timeline}</Text>
                </View>
              </View>
              <View style={styles.actionBox}>
                <Text style={styles.actionLabel}>What You Need to Do</Text>
                <Text style={styles.actionText}>{item.seller_action}</Text>
              </View>
            </View>
          ))}

        {!loading && guide.length > 0 && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => fetchGuide(true)}
          >
            <Text style={styles.refreshText}>Refresh Guide</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
    </TierGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 60,
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
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl + spacing.md,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  errorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  retryText: {
    color: colors.white,
    ...typography.captionBold,
  },

  emptyCard: {
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    ...shadows.sm,
  },
  emptyText: {
    ...typography.bodyBold,
    color: colors.accentDark,
    textAlign: "center",
  },

  guideCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    ...shadows.sm,
  },
  stepNumberText: {
    color: colors.white,
    ...typography.bodyBold,
  },
  stepTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  explanation: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  metaItem: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  metaLabel: {
    ...typography.smallBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  metaValue: {
    ...typography.captionBold,
    color: colors.primaryLight,
    marginTop: 2,
  },
  actionBox: {
    backgroundColor: colors.amberLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
  },
  actionLabel: {
    ...typography.smallBold,
    color: colors.amberDark,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  actionText: {
    ...typography.caption,
    color: colors.amberDark,
    lineHeight: 20,
  },

  refreshButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  refreshText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
});

