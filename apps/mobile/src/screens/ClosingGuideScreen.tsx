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
import type { ClosingGuideStep } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";

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
        // Check cache first (unless refreshing)
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

        // Get remaining steps
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

        // Get listing details
        const { data: listing } = await supabase
          .from("listings")
          .select("address, price")
          .eq("id", listingId)
          .single();

        // Try to determine state from listing address or documents
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

        // Cache in Supabase (upsert)
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>What to Expect</Text>
          <Text style={styles.subtitle}>
            Your personalized closing guide, powered by AI
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 60 },
  header: { marginBottom: 24 },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 16, color: "#2563EB", fontWeight: "500" },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },

  loadingContainer: { alignItems: "center", paddingVertical: 60 },
  loadingText: { fontSize: 14, color: "#6B7280", marginTop: 12 },

  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { fontSize: 14, color: "#DC2626", textAlign: "center", marginBottom: 12 },
  retryButton: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },

  emptyCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  emptyText: { fontSize: 16, color: "#065F46", fontWeight: "500", textAlign: "center" },

  guideCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  stepHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  stepTitle: { fontSize: 17, fontWeight: "700", color: "#111827", flex: 1 },
  explanation: { fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 14 },
  metaRow: { flexDirection: "row", marginBottom: 14 },
  metaItem: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600", textTransform: "uppercase" },
  metaValue: { fontSize: 13, color: "#2563EB", fontWeight: "600", marginTop: 2 },
  actionBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  actionText: { fontSize: 14, color: "#78350F", lineHeight: 20 },

  refreshButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  refreshText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
});
