import React, { useState } from "react";
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
import type { AppStackParamList } from "../../App";
import type { PriceType, PricingInput, PricingResult } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

const TIER_COLORS: Record<string, { bg: string; accent: string; iconBg: string }> = {
  sell_fast: {
    bg: "#EFF6FF",
    accent: "#2563EB",
    iconBg: "#DBEAFE",
  },
  recommended: {
    bg: "#FFFBEB",
    accent: "#D97706",
    iconBg: "#FEF3C7",
  },
  maximize: {
    bg: "#ECFDF5",
    accent: "#059669",
    iconBg: "#D1FAE5",
  },
};

const PRICE_OPTIONS: {
  type: PriceType;
  label: string;
  subtitle: string;
  icon: string;
  key: keyof PricingResult;
}[] = [
  {
    type: "sell_fast",
    label: "Sell Fast",
    subtitle: "Attract more buyers quickly",
    icon: "\u26A1",
    key: "sell_fast_price",
  },
  {
    type: "recommended",
    label: "Recommended",
    subtitle: "Best balance of speed and value",
    icon: "\u2B50",
    key: "recommended_price",
  },
  {
    type: "maximize",
    label: "Maximize Value",
    subtitle: "Get top dollar, may take longer",
    icon: "\uD83D\uDC8E",
    key: "maximize_price",
  },
];

function formatPrice(price: number): string {
  return (
    "$" +
    price.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

export default function PricingResultsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute();
  const { input, result } = route.params as {
    input: PricingInput;
    result: PricingResult;
  };
  const { user } = useAuth();
  const [selected, setSelected] = useState<PriceType>("recommended");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPrice = result[
    PRICE_OPTIONS.find((o) => o.type === selected)!.key
  ] as number;

  const handleConfirm = async () => {
    if (!user) return;

    setSaving(true);
    setErrorMessage(null);
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
      setErrorMessage(
        "Could not save your selection. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonTouch}
          >
            <Text style={styles.backText}>{"\u2190"} Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Your Price Options</Text>
        <Text style={styles.subtitle}>
          Select a pricing strategy for your home
        </Text>

        {/* Address badge */}
        <View style={styles.addressBadge}>
          <Text style={styles.addressIcon}>{"\u{1F3E0}"}</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {input.address}
          </Text>
        </View>

        {/* Price Cards */}
        <View style={styles.cards}>
          {PRICE_OPTIONS.map((option) => {
            const price = result[option.key] as number;
            const isSelected = selected === option.type;
            const isRecommended = option.type === "recommended";
            const tierColor = TIER_COLORS[option.type];

            return (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.card,
                  isRecommended && styles.cardRecommended,
                  isSelected && styles.cardSelected,
                  isSelected && { backgroundColor: tierColor.bg, borderColor: tierColor.accent },
                ]}
                onPress={() => setSelected(option.type)}
                activeOpacity={0.7}
              >
                {isRecommended && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {"\u2B50"} AI Recommended
                    </Text>
                  </View>
                )}

                <View style={styles.cardTop}>
                  <View style={styles.cardLabelRow}>
                    <View style={[styles.tierIconCircle, { backgroundColor: tierColor.iconBg }]}>
                      <Text style={styles.cardEmoji}>{option.icon}</Text>
                    </View>
                    <Text
                      style={[
                        styles.cardLabel,
                        isSelected && { color: tierColor.accent },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: tierColor.accent }]}>
                      <Text style={styles.check}>{"\u2713"}</Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.cardPrice,
                    isSelected && { color: tierColor.accent },
                    isRecommended && styles.cardPriceRecommended,
                  ]}
                >
                  {formatPrice(price)}
                </Text>

                <Text
                  style={[
                    styles.cardSubtitle,
                    isSelected && { color: tierColor.accent, opacity: 0.8 },
                  ]}
                >
                  {option.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reasoning Card */}
        <View style={styles.reasoningCard}>
          <View style={styles.reasoningHeader}>
            <Text style={styles.reasoningIcon}>{"\u{1F9E0}"}</Text>
            <Text style={styles.reasoningTitle}>AI Pricing Analysis</Text>
          </View>
          <View style={styles.reasoningDivider} />
          {result.reasoning.map((reason, i) => (
            <View key={i} style={styles.reasoningRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.reasoningText}>{reason}</Text>
            </View>
          ))}
        </View>

        {/* Error Message */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>{"\u26A0"}</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.textOnPrimary} />
              <Text style={styles.confirmText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.confirmText}>
              Use This Price {"\u2014"} {formatPrice(selectedPrice)}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          You can always adjust your price later from your listing settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.sm,
  },
  backButtonTouch: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  backText: {
    ...typography.bodyBold,
    color: colors.primaryLight,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Address badge
  addressBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: spacing.lg,
  },
  addressIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  addressText: {
    ...typography.captionBold,
    color: colors.primary,
  },

  // Cards
  cards: {
    gap: spacing.md,
  },
  card: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    backgroundColor: colors.card,
    position: "relative",
    ...shadows.sm,
  },
  cardRecommended: {
    borderColor: colors.primaryLight + "60",
    backgroundColor: colors.card,
    paddingTop: spacing.lg + 8,
    ...shadows.md,
  },
  cardSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySoft,
    ...shadows.md,
  },
  badge: {
    position: "absolute",
    top: -12,
    right: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    ...typography.smallBold,
    color: colors.textOnPrimary,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tierIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardEmoji: {
    fontSize: 18,
  },
  cardLabel: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  cardPrice: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  cardPriceRecommended: {
    fontSize: 36,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  check: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  // Reasoning
  reasoningCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  reasoningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  reasoningIcon: {
    fontSize: 20,
  },
  reasoningTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  reasoningDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  reasoningRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
    marginRight: spacing.sm,
    marginTop: 8,
  },
  reasoningText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // Error banner
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + "40",
  },
  errorIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  errorText: {
    ...typography.caption,
    color: colors.errorDark,
    flex: 1,
    lineHeight: 20,
  },

  // Confirm
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
    ...shadows.md,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    ...typography.bodyBold,
    color: colors.textOnPrimary,
    fontSize: 17,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  disclaimer: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
