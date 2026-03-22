import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { FinancingType } from "@selfly/shared";
import { FINANCING_TYPES } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";
import TierGate from "../components/TierGate";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function OfferInputScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "OfferInput">>();
  const { listingId } = route.params;

  const [listingPrice, setListingPrice] = useState<number>(0);
  const [propertyAddress, setPropertyAddress] = useState("");
  const [offeredPrice, setOfferedPrice] = useState("");
  const [financingType, setFinancingType] = useState<FinancingType>("conventional");
  const [downPaymentPct, setDownPaymentPct] = useState("");
  const [inspectionContingency, setInspectionContingency] = useState(true);
  const [appraisalContingency, setAppraisalContingency] = useState(true);
  const [closingDate, setClosingDate] = useState("");
  const [sellerConcessions, setSellerConcessions] = useState("");
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchListing();
  }, []);

  const fetchListing = async () => {
    try {
      const { data } = await supabase
        .from("listings")
        .select("price, address")
        .eq("id", listingId)
        .single();

      if (data) {
        setListingPrice(data.price);
        setPropertyAddress(data.address || "");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load listing details.");
    }
  };

  const handleSubmit = async () => {
    const price = parseFloat(offeredPrice.replace(/,/g, ""));
    if (!price || isNaN(price)) {
      Alert.alert("Error", "Please enter a valid offered price.");
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch(`${API_BASE}/api/offers/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offered_price: price,
          financing_type: financingType,
          down_payment_pct: downPaymentPct ? parseFloat(downPaymentPct) : undefined,
          inspection_contingency: inspectionContingency,
          appraisal_contingency: appraisalContingency,
          closing_date: closingDate || undefined,
          seller_concessions: sellerConcessions || undefined,
          listing_price: listingPrice,
          property_address: propertyAddress,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const analysis = await response.json();

      navigation.navigate("OfferAnalysis", {
        listingId,
        analysis,
        offerInput: {
          offered_price: price,
          financing_type: financingType,
          down_payment_pct: downPaymentPct ? parseFloat(downPaymentPct) : undefined,
          inspection_contingency: inspectionContingency,
          appraisal_contingency: appraisalContingency,
          closing_date: closingDate || undefined,
          seller_concessions: sellerConcessions || undefined,
          notes: notes || undefined,
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to analyze offer. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <TierGate feature="offer_analyzer">
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{"\u2190"} Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>New Offer</Text>

          {listingPrice > 0 && (
            <View style={styles.listingRef}>
              <Text style={styles.listingRefLabel}>Your Listing Price</Text>
              <Text style={styles.listingRefPrice}>
                ${listingPrice.toLocaleString()}
              </Text>
            </View>
          )}

          <Text style={styles.label}>Offered Price *</Text>
          <TextInput
            style={styles.input}
            value={offeredPrice}
            onChangeText={setOfferedPrice}
            placeholder="e.g. 350000"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Financing Type *</Text>
          <View style={styles.chipRow}>
            {FINANCING_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  financingType === type && styles.chipSelected,
                ]}
                onPress={() => setFinancingType(type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    financingType === type && styles.chipTextSelected,
                  ]}
                >
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Down Payment %</Text>
          <TextInput
            style={styles.input}
            value={downPaymentPct}
            onChangeText={setDownPaymentPct}
            placeholder="e.g. 20"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Inspection Contingency</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, inspectionContingency && styles.toggleBtnActive]}
              onPress={() => setInspectionContingency(true)}
            >
              <Text
                style={[styles.toggleText, inspectionContingency && styles.toggleTextActive]}
              >
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !inspectionContingency && styles.toggleBtnActive]}
              onPress={() => setInspectionContingency(false)}
            >
              <Text
                style={[styles.toggleText, !inspectionContingency && styles.toggleTextActive]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Appraisal Contingency</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, appraisalContingency && styles.toggleBtnActive]}
              onPress={() => setAppraisalContingency(true)}
            >
              <Text
                style={[styles.toggleText, appraisalContingency && styles.toggleTextActive]}
              >
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !appraisalContingency && styles.toggleBtnActive]}
              onPress={() => setAppraisalContingency(false)}
            >
              <Text
                style={[styles.toggleText, !appraisalContingency && styles.toggleTextActive]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Closing Date</Text>
          <TextInput
            style={styles.input}
            value={closingDate}
            onChangeText={setClosingDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Seller Concessions Requested</Text>
          <TextInput
            style={styles.input}
            value={sellerConcessions}
            onChangeText={setSellerConcessions}
            placeholder="e.g. $5,000 toward closing costs"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional details about this offer"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitButton, analyzing && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={analyzing}
          >
            {analyzing ? (
              <View style={styles.analyzingRow}>
                <ActivityIndicator color={colors.white} size="small" />
                <Text style={styles.submitButtonText}>  Analyzing with AI...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Analyze Offer</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 120,
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
  listingRef: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: "center",
    ...shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
  },
  listingRefLabel: {
    ...typography.captionBold,
    color: colors.primaryLight,
    marginBottom: spacing.xs,
  },
  listingRefPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primaryLight,
  },
  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs + 2,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    ...typography.body,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  chipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.white,
  },
  toggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  toggleText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.white,
  },
  submitButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.white,
    ...typography.bodyBold,
    fontSize: 17,
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
