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
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CLOSING_STEPS, type CustomCost } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";

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

    // Get user's active listing
    const { data: listing } = await supabase
      .from("listings")
      .select("id, price")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!listing) {
      setLoading(false);
      return;
    }

    setListingId(listing.id);

    // Load or initialize checklist
    const { data: existingChecklist } = await supabase
      .from("closing_checklist")
      .select("*")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .order("step_order");

    if (existingChecklist && existingChecklist.length > 0) {
      setChecklist(existingChecklist);
    } else {
      // Initialize checklist items
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

    // Load or initialize calculator
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
      // Try to get accepted offer price and concessions
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

    setLoading(false);
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
          },
        },
      ]);
      return;
    }

    await supabase
      .from("closing_checklist")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", item.id);

    const updated = checklist.map((c) =>
      c.id === item.id ? { ...c, completed: true, completed_at: new Date().toISOString() } : c
    );
    setChecklist(updated);

    // Check if all complete
    const allDone = updated.every((c) => c.completed);
    if (allDone && !celebrated) {
      setCelebrated(true);
      // Advance pipeline stage
      await supabase
        .from("profiles")
        .update({ current_stage: "close_the_deal" })
        .eq("id", user.id);
    }
  };

  const saveCalculator = async () => {
    if (!user || !listingId) return;
    setSaving(true);
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
    setSaving(false);
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

  // Calculate totals
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Close the Deal</Text>
        </View>

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
        <View style={styles.progressSection}>
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
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Closing Calculator</Text>
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
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={styles.customCostAmount}
                value={cost.amount ? String(cost.amount) : ""}
                onChangeText={(v) => updateCustomCost(i, "amount", v)}
                keyboardType="numeric"
                placeholder="$0"
                placeholderTextColor="#9CA3AF"
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
            style={styles.saveCalcButton}
            onPress={saveCalculator}
            disabled={saving}
          >
            <Text style={styles.saveCalcText}>{saving ? "Saving..." : "Save Calculator"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
          placeholderTextColor="#9CA3AF"
        />
        {suffix && <Text style={styles.calcSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 60 },
  header: { marginBottom: 20 },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 16, color: "#2563EB", fontWeight: "500" },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },

  // Celebration
  celebrationCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  celebrationEmoji: { fontSize: 48, marginBottom: 12 },
  celebrationTitle: { fontSize: 24, fontWeight: "700", color: "#065F46", marginBottom: 4 },
  celebrationText: { fontSize: 16, color: "#047857", fontWeight: "500" },

  // Progress
  progressSection: { marginBottom: 20 },
  progressTrack: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 6,
  },
  progressLabel: { fontSize: 14, color: "#6B7280", fontWeight: "500" },

  // Guide button
  guideButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  guideButtonText: { fontSize: 16, fontWeight: "600", color: "#2563EB" },
  guideChevron: { fontSize: 22, color: "#2563EB", fontWeight: "300" },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },

  // Checklist
  checklistCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  checklistCardDone: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  checkboxDone: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  checkIcon: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  checklistContent: { flex: 1 },
  checklistLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  checklistLabelDone: { color: "#065F46" },
  completedAt: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  greenCheck: { fontSize: 18, color: "#16A34A", fontWeight: "700" },

  // Calculator
  calcCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calcLabel: { fontSize: 14, color: "#374151", flex: 1 },
  calcInputWrap: { flexDirection: "row", alignItems: "center" },
  calcPrefix: { fontSize: 14, color: "#6B7280", marginRight: 2 },
  calcSuffix: { fontSize: 14, color: "#6B7280", marginLeft: 2 },
  calcInput: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 100,
    textAlign: "right",
  },
  calcSubheader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  calcDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  calcComputedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calcComputedLabel: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
  calcComputedValue: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
  calcTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calcTotalLabel: { fontSize: 15, fontWeight: "600", color: "#374151" },
  calcTotalValue: { fontSize: 15, fontWeight: "600", color: "#DC2626" },
  netProceedsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  netProceedsLabel: { fontSize: 16, fontWeight: "700", color: "#065F46" },
  netProceedsValue: { fontSize: 22, fontWeight: "700", color: "#16A34A" },

  // Custom costs
  customCostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  customCostLabel: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  customCostAmount: {
    width: 100,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: "right",
  },
  removeCost: { marginLeft: 8, padding: 4 },
  removeCostText: { fontSize: 20, color: "#DC2626", fontWeight: "600" },
  addCostButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  addCostText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },
  saveCalcButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveCalcText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
