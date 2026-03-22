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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../App";
import type { PricingInput, PropertyCondition } from "@selfly/shared";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

const CONDITIONS: PropertyCondition[] = [
  "Excellent",
  "Good",
  "Fair",
  "Needs Work",
];

const CONDITION_ICONS: Record<PropertyCondition, string> = {
  Excellent: "\u2728",
  Good: "\u{1F44D}",
  Fair: "\u{1F6E0}",
  "Needs Work": "\u{1F527}",
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function PricingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [address, setAddress] = useState("");
  const [sqft, setSqft] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [condition, setCondition] = useState<PropertyCondition>("Good");
  const [features, setFeatures] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!address || !sqft || !bedrooms || !bathrooms || !yearBuilt) {
      setErrorMessage("Please fill in all property details to get an accurate pricing estimate.");
      return;
    }

    const input: PricingInput = {
      address,
      sqft: parseInt(sqft, 10),
      bedrooms: parseInt(bedrooms, 10),
      bathrooms: parseInt(bathrooms, 10),
      year_built: parseInt(yearBuilt, 10),
      condition,
      ...(features.trim() ? { features: features.trim() } : {}),
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
      setErrorMessage(
        "Could not generate pricing. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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

        <Text style={styles.title}>Price Your Home</Text>
        <Text style={styles.subtitle}>
          Get an AI-powered pricing recommendation based on your property details
        </Text>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>{"\u{1F4A1}"}</Text>
          <Text style={styles.infoText}>
            Live market comp data coming soon. Pricing is based on AI analysis
            of your property details.
          </Text>
        </View>

        {/* Error Message */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>{"\u26A0"}</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Address</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St, City, State"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={styles.label}>Square Footage</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={sqft}
              onChangeText={setSqft}
              placeholder="e.g. 2000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Bedrooms</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={bedrooms}
                  onChangeText={setBedrooms}
                  placeholder="3"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Bathrooms</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={bathrooms}
                  onChangeText={setBathrooms}
                  placeholder="2"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <Text style={styles.label}>Year Built</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={yearBuilt}
              onChangeText={setYearBuilt}
              placeholder="e.g. 1995"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.label}>Condition</Text>
          <View style={styles.conditionRow}>
            {CONDITIONS.map((c) => {
              const isActive = condition === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.conditionPill,
                    isActive && styles.conditionPillActive,
                  ]}
                  onPress={() => setCondition(c)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.conditionIcon}>
                    {CONDITION_ICONS[c]}
                  </Text>
                  <Text
                    style={[
                      styles.conditionText,
                      isActive && styles.conditionTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Describe Your Home's Best Features</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.featuresInput]}
              value={features}
              onChangeText={setFeatures}
              placeholder="e.g., finished basement, pool, vaulted ceilings, renovated kitchen, large backyard, new roof..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.textOnPrimary} />
              <Text style={styles.submitText}>Analyzing...</Text>
            </View>
          ) : (
            <Text style={styles.submitText}>
              {"\u{1F916}"} Get AI Pricing
            </Text>
          )}
        </TouchableOpacity>

        {/* Tip Cards */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Pricing Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>{"\u{1F3AF}"}</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipHeading}>Price it right from the start</Text>
              <Text style={styles.tipText}>
                Homes priced correctly from day one sell faster and often for more than overpriced homes that sit on the market.
              </Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>{"\u{1F4C8}"}</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipHeading}>Consider your timeline</Text>
              <Text style={styles.tipText}>
                If you need to sell quickly, pricing slightly below market can generate multiple offers and potentially a bidding war.
              </Text>
            </View>
          </View>
        </View>
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
    marginBottom: spacing.lg,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight + "30",
  },
  infoIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  infoText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
    lineHeight: 20,
  },

  // Error banner
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
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

  // Form
  formSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    ...typography.body,
    color: colors.textPrimary,
  },
  featuresInput: {
    minHeight: 100,
    paddingTop: spacing.sm + 4,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  halfField: {
    flex: 1,
  },
  conditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  conditionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  conditionPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  conditionIcon: {
    fontSize: 14,
  },
  conditionText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  conditionTextActive: {
    color: colors.textOnPrimary,
  },

  // Submit
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    ...typography.bodyBold,
    color: colors.textOnPrimary,
    fontSize: 17,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  // Tips
  tipsSection: {
    marginTop: spacing.xl,
  },
  tipsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tipCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  tipIcon: {
    fontSize: 22,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipHeading: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tipText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
