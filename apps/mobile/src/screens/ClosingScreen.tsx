import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CLOSING_STEPS, type CustomCost } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";
import TierGate from "../components/TierGate";

interface ChecklistItem {
  id: string;
  step_key: string;
  step_label: string;
  completed: boolean;
  completed_at: string | null;
  step_order: number;
}

interface CalculatorData {
  sale_price: number;
  attorney_fees: number;
  title_fees: number;
  transfer_tax_pct: number;
  recording_fees: number;
  seller_concessions: number;
  custom_costs: CustomCost[];
}

const DEFAULT_CALCULATOR: CalculatorData = {
  sale_price: 0,
  attorney_fees: 1500,
  title_fees: 1000,
  transfer_tax_pct: 1.0,
  recording_fees: 250,
  seller_concessions: 0,
  custom_costs: [],
};

export default function ClosingScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [calculator, setCalculator] = useState<CalculatorData>(DEFAULT_CALCULATOR);
  const [listingId, setListingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalSteps = CLOSING_STEPS.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const { data: listing } = await supabase
        .from("listings")
        .select("id, price")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!listing) {
        return;
      }

      setListingId(listing.id);

      const { data: existingChecklist } = await supabase
        .from("closing_checklist")
        .select("*")
        .eq("user_id", user.id)
        .eq("listing_id", listing.id)
        .order("step_order");

      if (existingChecklist && existingChecklist.length > 0) {
        setChecklist(existingChecklist);
      } else {
        const items = CLOSING_STEPS.map((step) => ({
          user_id: user.id,
          listing_id: listing.id,
          step_key: step.key,
          step_label: step.label,
          completed: false,
          completed_at: null,
          step_order: step.order,
        }));

        const { data: inserted } = await supabase
          .from("closing_checklist")
          .insert(items)
          .select();

        if (inserted) setChecklist(inserted);
      }

      const { data: existingCalc } = await supabase
        .from("closing_calculator")
        .select("*")
        .eq("user_id", user.id)
        .eq("listing_id", listing.id)
        .single();

      if (existingCalc) {
        setCalculator({
          sale_price: existingCalc.sale_price ?? listing.price ?? 0,
          attorney_fees: existingCalc.attorney_fees ?? 1500,
          title_fees: existingCalc.title_fees ?? 1000,
          transfer_tax_pct: existingCalc.transfer_tax_pct ?? 1.0,
          recording_fees: existingCalc.recording_fees ?? 250,
          seller_concessions: existingCalc.seller_concessions ?? 0,
          custom_costs: existingCalc.custom_costs ?? [],
        });
      } else {
        let salePrice = listing.price ?? 0;
        let concessions = 0;
        const { data: bestOffer } = await supabase
          .from("offers")
          .select("offered_price, seller_concessions")
          .eq("listing_id", listing.id)
          .order("score", { ascending: false })
          .limit(1)
          .single();

        if (bestOffer) {
          salePrice = bestOffer.offered_price ?? salePrice;
          concessions = parseFloat(bestOffer.seller_concessions || "0") || 0;
        }

        const calcData = { ...DEFAULT_CALCULATOR, sale_price: salePrice, seller_concessions: concessions };
        setCalculator(calcData);

        await supabase.from("closing_calculator").insert({
          user_id: user.id,
          listing_id: listing.id,
          ...calcData,
        });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load closing data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const toggleStep = async (item: ChecklistItem) => {
    if (!user || !listingId) return;

    if (item.completed) {
      Alert.alert("Unmark Step", `Mark "${item.step_label}" as incomplete?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unmark",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase
                .from("closing_checklist")
                .update({ completed: false, completed_at: null })
                .eq("id", item.id);

              setChecklist((prev) =>
                prev.map((c) =>
                  c.id === item.id ? { ...c, completed: false, completed_at: null } : c
                )
              );
              setCelebrated(false);
            } catch (err) {
              Alert.alert("Error", "Failed to update step. Please try again.");
            }
          },
        },
      ]);
      return;
    }

    try {
      await supabase
        .from("closing_checklist")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", item.id);

      const updated = checklist.map((c) =>
        c.id === item.id ? { ...c, completed: true, completed_at: new Date().toISOString() } : c
      );
      setChecklist(updated);

      const allDone = updated.every((c) => c.completed);
      if (allDone && !celebrated) {
        setCelebrated(true);
        await supabase
          .from("profiles")
          .update({ current_stage: "close_the_deal" })
          .eq("id", user.id);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update step. Please try again.");
    }
  };

  const saveCalculator = async () => {
    if (!user || !listingId) return;
    setSaving(true);
    try {
      await supabase
        .from("closing_calculator")
        .update({
          sale_price: calculator.sale_price,
          attorney_fees: calculator.attorney_fees,
          title_fees: calculator.title_fees,
          transfer_tax_pct: calculator.transfer_tax_pct,
          recording_fees: calculator.recording_fees,
          seller_concessions: calculator.seller_concessions,
          custom_costs: calculator.custom_costs,
        })
        .eq("user_id", user.id)
        .eq("listing_id", listingId);
    } catch (err) {
      Alert.alert("Error", "Failed to save calculator. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addCustomCost = () => {
    setCalculator((prev) => ({
      ...prev,
      custom_costs: [...prev.custom_costs, { label: "", amount: 0 }],
    }));
  };

  const updateCustomCost = (index: number, field: "label" | "amount", value: string) => {
    setCalculator((prev) => {
      const costs = [...prev.custom_costs];
      if (field === "amount") {
        costs[index] = { ...costs[index], amount: parseFloat(value) || 0 };
      } else {
        costs[index] = { ...costs[index], label: value };
      }
      return { ...prev, custom_costs: costs };
    });
  };

  const removeCustomCost = (index: number) => {
    setCalculator((prev) => ({
      ...prev,
      custom_costs: prev.custom_costs.filter((_, i) => i !== index),
    }));
  };

  const transferTaxAmount = (calculator.sale_price * calculator.transfer_tax_pct) / 100;
  const customTotal = calculator.custom_costs.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalDeductions =
    calculator.attorney_fees +
    calculator.title_fees +
    transferTaxAmount +
    calculator.recording_fees +
    calculator.seller_concessions +
    customTotal;
  const netProceeds = calculator.sale_price - totalDeductions;

  const allComplete = checklist.length > 0 && checklist.every((c) => c.completed);

  if (loading) {
    return (
      <TierGate feature="closing_guide">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
          </View>
        </SafeAreaView>
      </TierGate>
    );
  }

  if (!listingId) {
    return (
      <TierGate feature="closing_guide">
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backText}>{"\u2190"} Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Close the Deal</Text>
            <View style={styles.loadingContainer}>
              <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: "center" }}>
                Create a listing first to access the closing checklist and calculator.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </TierGate>
    );
  }

  return (
    <TierGate feature="closing_guide">
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"\u2190"} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Close the Deal</Text>

        {/* Celebration */}
        {allComplete && (
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🏠🎉</Text>
            <Text style={styles.celebrationTitle}>Congratulations!</Text>
            <Text style={styles.celebrationText}>
              You sold your home — Selfly!
            </Text>
          </View>
        )}

        {/* Section A: Progress Bar */}
        <View style={styles.progressCard}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {completedCount} of {totalSteps} steps complete — {progressPct}%
          </Text>
        </View>

        {/* What to Expect button */}
        <TouchableOpacity
          style={styles.guideButton}
          onPress={() => navigation.navigate("ClosingGuide", { listingId: listingId! })}
        >
          <Text style={styles.guideButtonText}>What to Expect</Text>
          <Text style={styles.guideChevron}>›</Text>
        </TouchableOpacity>

        {/* Section B: Closing Checklist */}
        <Text style={styles.sectionTitle}>Closing Checklist</Text>
        {checklist.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.checklistCard, item.completed && styles.checklistCardDone]}
            onPress={() => toggleStep(item)}
          >
            <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
              {item.completed && <Text style={styles.checkIcon}>✓</Text>}
            </View>
            <View style={styles.checklistContent}>
              <Text style={[styles.checklistLabel, item.completed && styles.checklistLabelDone]}>
                {item.step_label}
              </Text>
              {item.completed && item.completed_at && (
                <Text style={styles.completedAt}>
                  Completed {new Date(item.completed_at).toLocaleDateString()}
                </Text>
              )}
            </View>
            {item.completed && <Text style={styles.greenCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        {/* Section C: Closing Calculator */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Closing Calculator</Text>
        <View style={styles.calcCard}>
          <CalcRow
            label="Sale Price"
            value={calculator.sale_price}
            onChange={(v) => setCalculator((p) => ({ ...p, sale_price: v }))}
            prefix="$"
          />
          <View style={styles.calcDivider} />
          <Text style={styles.calcSubheader}>Deductions</Text>
          <CalcRow
            label="Attorney Fees"
            value={calculator.attorney_fees}
            onChange={(v) => setCalculator((p) => ({ ...p, attorney_fees: v }))}
            prefix="$"
          />
          <CalcRow
            label="Title Insurance & Search"
            value={calculator.title_fees}
            onChange={(v) => setCalculator((p) => ({ ...p, title_fees: v }))}
            prefix="$"
          />
          <CalcRow
            label="Transfer Taxes"
            value={calculator.transfer_tax_pct}
            onChange={(v) => setCalculator((p) => ({ ...p, transfer_tax_pct: v }))}
            suffix="%"
          />
          <View style={styles.calcComputedRow}>
            <Text style={styles.calcComputedLabel}>Transfer Tax Amount</Text>
            <Text style={styles.calcComputedValue}>
              ${transferTaxAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <CalcRow
            label="Recording Fees"
            value={calculator.recording_fees}
            onChange={(v) => setCalculator((p) => ({ ...p, recording_fees: v }))}
            prefix="$"
          />
          <CalcRow
            label="Seller Concessions"
            value={calculator.seller_concessions}
            onChange={(v) => setCalculator((p) => ({ ...p, seller_concessions: v }))}
            prefix="$"
          />

          {/* Custom costs */}
          {calculator.custom_costs.map((cost, i) => (
            <View key={i} style={styles.customCostRow}>
              <TextInput
                style={styles.customCostLabel}
                value={cost.label}
                onChangeText={(v) => updateCustomCost(i, "label", v)}
                placeholder="Cost name"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.customCostAmount}
                value={cost.amount ? String(cost.amount) : ""}
                onChangeText={(v) => updateCustomCost(i, "amount", v)}
                keyboardType="numeric"
                placeholder="$0"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity onPress={() => removeCustomCost(i)} style={styles.removeCost}>
                <Text style={styles.removeCostText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={addCustomCost} style={styles.addCostButton}>
            <Text style={styles.addCostText}>+ Add Cost</Text>
          </TouchableOpacity>

          <View style={styles.calcDivider} />

          <View style={styles.calcTotalRow}>
            <Text style={styles.calcTotalLabel}>Total Deductions</Text>
            <Text style={styles.calcTotalValue}>
              -${totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>

          <View style={styles.netProceedsRow}>
            <Text style={styles.netProceedsLabel}>Estimated Net Proceeds</Text>
            <Text style={styles.netProceedsValue}>
              ${netProceeds.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveCalcButton, saving && { opacity: 0.6 }]}
            onPress={saveCalculator}
            disabled={saving}
          >
            <Text style={styles.saveCalcText}>{saving ? "Saving..." : "Save Calculator"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </TierGate>
  );
}

function CalcRow({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <View style={styles.calcRow}>
      <Text style={styles.calcLabel}>{label}</Text>
      <View style={styles.calcInputWrap}>
        {prefix && <Text style={styles.calcPrefix}>{prefix}</Text>}
        <TextInput
          style={styles.calcInput}
          value={value ? String(value) : ""}
          onChangeText={(v) => onChange(parseFloat(v) || 0)}
          keyboardType="numeric"
          placeholderTextColor={colors.textMuted}
        />
        {suffix && <Text style={styles.calcSuffix}>{suffix}</Text>}
      </View>
    </View>
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
    marginBottom: spacing.lg,
  },

  // Celebration
  celebrationCard: {
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg + 4,
    alignItems: "center",
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  celebrationEmoji: { fontSize: 48, marginBottom: spacing.md },
  celebrationTitle: {
    ...typography.h1,
    color: colors.accentDark,
    marginBottom: spacing.xs,
  },
  celebrationText: {
    ...typography.bodyBold,
    color: colors.accent,
  },

  // Progress
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
  },
  progressLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  // Guide button
  guideButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
  },
  guideButtonText: {
    ...typography.bodyBold,
    color: colors.primaryLight,
  },
  guideChevron: {
    fontSize: 22,
    color: colors.primaryLight,
    fontWeight: "300",
  },

  // Section
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // Checklist
  checklistCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  checklistCardDone: {
    backgroundColor: colors.accentLight,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  checkboxDone: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  checkIcon: {
    color: colors.white,
    ...typography.captionBold,
  },
  checklistContent: { flex: 1 },
  checklistLabel: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  checklistLabelDone: {
    color: colors.accentDark,
  },
  completedAt: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  greenCheck: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: "700",
  },

  // Calculator
  calcCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  calcLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  calcInputWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  calcPrefix: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: 2,
  },
  calcSuffix: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  calcInput: {
    ...typography.captionBold,
    color: colors.textPrimary,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    minWidth: 100,
    textAlign: "right",
  },
  calcSubheader: {
    ...typography.smallBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  calcDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  calcComputedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  calcComputedLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  calcComputedValue: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  calcTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  calcTotalLabel: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  calcTotalValue: {
    ...typography.bodyBold,
    color: colors.error,
  },
  netProceedsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  netProceedsLabel: {
    ...typography.bodyBold,
    color: colors.accentDark,
  },
  netProceedsValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.accent,
  },

  // Custom costs
  customCostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  customCostLabel: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  customCostAmount: {
    width: 100,
    ...typography.captionBold,
    color: colors.textPrimary,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    textAlign: "right",
  },
  removeCost: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  removeCostText: {
    fontSize: 20,
    color: colors.error,
    fontWeight: "600",
  },
  addCostButton: {
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  addCostText: {
    ...typography.captionBold,
    color: colors.primaryLight,
  },
  saveCalcButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    ...shadows.sm,
  },
  saveCalcText: {
    color: colors.white,
    ...typography.bodyBold,
  },
});
