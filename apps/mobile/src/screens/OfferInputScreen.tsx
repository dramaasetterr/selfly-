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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { FinancingType } from "@selfly/shared";
import { FINANCING_TYPES } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";

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
    const { data } = await supabase
      .from("listings")
      .select("price, address")
      .eq("id", listingId)
      .single();

    if (data) {
      setListingPrice(data.price);
      setPropertyAddress(data.address || "");
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Offer</Text>
          <View style={styles.backButton} />
        </View>

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
          placeholderTextColor="#9CA3AF"
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
          placeholderTextColor="#9CA3AF"
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
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Seller Concessions Requested</Text>
        <TextInput
          style={styles.input}
          value={sellerConcessions}
          onChangeText={setSellerConcessions}
          placeholder="e.g. $5,000 toward closing costs"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional details about this offer"
          placeholderTextColor="#9CA3AF"
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
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.submitButtonText}>  Analyzing with AI...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Analyze Offer</Text>
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
  listingRef: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  listingRefLabel: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "500",
    marginBottom: 4,
  },
  listingRefPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
