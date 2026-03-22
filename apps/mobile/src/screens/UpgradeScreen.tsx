import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../App";
import { supabase } from "../lib/supabase";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

type Plan = "free" | "seller_pro" | "full_service";

interface Tier {
  id: Plan;
  name: string;
  price: string;
  priceNote: string;
  badge: string | null;
  badgeColor: string;
  badgeBg: string;
  features: string[];
  highlight: boolean;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceNote: "forever",
    badge: null,
    badgeColor: "",
    badgeBg: "",
    features: [
      "AI pricing estimate",
      "Home prep checklist",
      "Basic marketplace listing",
    ],
    highlight: false,
  },
  {
    id: "seller_pro",
    name: "Seller Pro",
    price: "$299",
    priceNote: "one-time",
    badge: "Most Popular",
    badgeColor: colors.white,
    badgeBg: colors.primaryLight,
    features: [
      "Everything in Free",
      "AI document generation",
      "Listing syndication guide",
      "Offer analyzer",
      "Closing calculator",
      "Showing management",
    ],
    highlight: true,
  },
  {
    id: "full_service",
    name: "Full Service",
    price: "$499",
    priceNote: "one-time",
    badge: "Best Value",
    badgeColor: colors.white,
    badgeBg: colors.accent,
    features: [
      "Everything in Pro",
      "Priority support",
      "Attorney referral network",
      "MLS listing assistance",
      "Professional photo tips guide",
    ],
    highlight: false,
  },
];

export default function UpgradeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("seller_pro");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const currentPlan: Plan = "free"; // TODO: read from profile

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setEmail("");
    setConfirmed(false);
    setModalVisible(true);
  };

  const handleNotifyMe = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("waitlist").insert({
        email: email.trim().toLowerCase(),
        plan: selectedPlan,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      setConfirmed(true);
    } catch {
      Alert.alert("Error", "Could not save your email. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const planLabel = TIERS.find((t) => t.id === selectedPlan)?.name ?? "";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>{"\u2190"}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Choose Your Plan</Text>
          <Text style={styles.headerSubtitle}>
            Save thousands compared to a traditional realtor
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Savings callout */}
        <View style={styles.savingsCard}>
          <Text style={styles.savingsIcon}>{"\uD83D\uDCB8"}</Text>
          <View style={styles.savingsTextGroup}>
            <Text style={styles.savingsTitle}>Traditional realtor fee</Text>
            <Text style={styles.savingsAmount}>
              ~$21,000 on a $350K home
            </Text>
          </View>
        </View>

        {/* Tier Cards */}
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentPlan;
          return (
            <View
              key={tier.id}
              style={[
                styles.tierCard,
                tier.highlight && styles.tierCardHighlight,
              ]}
            >
              {tier.badge && (
                <View style={[styles.tierBadge, { backgroundColor: tier.badgeBg }]}>
                  <Text style={[styles.tierBadgeText, { color: tier.badgeColor }]}>
                    {tier.badge}
                  </Text>
                </View>
              )}

              <Text style={styles.tierName}>{tier.name}</Text>

              <View style={styles.tierPriceRow}>
                <Text style={styles.tierPrice}>{tier.price}</Text>
                <Text style={styles.tierPriceNote}>{tier.priceNote}</Text>
              </View>

              <View style={styles.featureList}>
                {tier.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>{"\u2713"}</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              {isCurrent ? (
                <View style={styles.currentPlanBadge}>
                  <Text style={styles.currentPlanText}>Current Plan</Text>
                </View>
              ) : tier.id !== "free" ? (
                <TouchableOpacity
                  style={[
                    styles.upgradeButton,
                    tier.highlight && styles.upgradeButtonHighlight,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleUpgrade(tier.id)}
                >
                  <Text
                    style={[
                      styles.upgradeButtonText,
                      tier.highlight && styles.upgradeButtonTextHighlight,
                    ]}
                  >
                    Upgrade
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Coming Soon Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {confirmed ? (
              <>
                <Text style={styles.modalIcon}>{"\u2705"}</Text>
                <Text style={styles.modalTitle}>You're on the list!</Text>
                <Text style={styles.modalSubtitle}>
                  We'll notify you at {email} when {planLabel} is ready.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalPrimaryButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalIcon}>{"\uD83D\uDE80"}</Text>
                <Text style={styles.modalTitle}>Coming Soon</Text>
                <Text style={styles.modalSubtitle}>
                  Payment processing is being set up. Enter your email to be
                  notified when it's ready.
                </Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />

                <TouchableOpacity
                  style={[styles.modalPrimaryButton, saving && { opacity: 0.7 }]}
                  activeOpacity={0.8}
                  onPress={handleNotifyMe}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryButtonText}>Notify Me</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  /* Savings callout */
  savingsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.amberLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
  },
  savingsIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  savingsTextGroup: {
    flex: 1,
  },
  savingsTitle: {
    ...typography.captionBold,
    color: colors.amberDark,
  },
  savingsAmount: {
    ...typography.bodyBold,
    color: colors.amberDark,
    marginTop: 2,
  },

  /* Tier cards */
  tierCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  tierCardHighlight: {
    borderColor: colors.primaryLight,
    borderWidth: 2,
    ...shadows.md,
  },
  tierBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  tierBadgeText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
  },
  tierName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  tierPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  tierPrice: {
    ...typography.hero,
    color: colors.primaryLight,
  },
  tierPriceNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  featureList: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureCheck: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "700",
    marginRight: spacing.sm,
    width: 20,
  },
  featureText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },

  currentPlanBadge: {
    alignSelf: "center",
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  currentPlanText: {
    ...typography.captionBold,
    color: colors.accentDark,
  },

  upgradeButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  upgradeButtonHighlight: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  upgradeButtonText: {
    ...typography.bodyBold,
    color: colors.primaryLight,
  },
  upgradeButtonTextHighlight: {
    color: colors.white,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    ...shadows.lg,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  modalPrimaryButton: {
    width: "100%",
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  modalPrimaryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  modalCancelButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalCancelText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
