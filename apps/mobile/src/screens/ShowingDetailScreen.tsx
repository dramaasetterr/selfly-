import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { Showing } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export default function ShowingDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "ShowingDetail">>();
  const { user } = useAuth();
  const [showing, setShowing] = useState<Showing | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchShowing = useCallback(async () => {
    const { data } = await supabase
      .from("showings")
      .select("*")
      .eq("id", route.params.showingId)
      .single();
    if (data) setShowing(data);
    setLoading(false);
  }, [route.params.showingId]);

  useEffect(() => {
    fetchShowing();
  }, [fetchShowing]);

  const cancelShowing = () => {
    Alert.alert("Cancel Showing", "Are you sure you want to cancel this showing?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          await supabase
            .from("showings")
            .update({ status: "cancelled" })
            .eq("id", route.params.showingId);
          if (showing?.availability_id) {
            await supabase
              .from("showing_availability")
              .update({ is_booked: false })
              .eq("id", showing.availability_id);
          }
          await fetchShowing();
          setCancelling(false);
        },
      },
    ]);
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

  if (!showing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{"\u2190"} Back</Text>
          </TouchableOpacity>
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyText}>Showing not found.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isPast =
    showing.status !== "confirmed" ||
    new Date(showing.showing_date + "T" + showing.showing_time_start) < new Date();

  const statusConfig = {
    confirmed: { bg: colors.accentLight, text: colors.accentDark },
    cancelled: { bg: colors.errorLight, text: colors.errorDark },
    completed: { bg: colors.borderLight, text: colors.textSecondary },
  };
  const statusStyle = statusConfig[showing.status as keyof typeof statusConfig] || statusConfig.completed;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"\u2190"} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Showing Details</Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                {showing.status.charAt(0).toUpperCase() + showing.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{showing.showing_date}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>
              {formatTime(showing.showing_time_start)} - {formatTime(showing.showing_time_end)}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Buyer Contact</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{showing.buyer_name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{showing.buyer_email}</Text>
          </View>

          {showing.buyer_phone && (
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{showing.buyer_phone}</Text>
            </View>
          )}
        </View>

        {showing.status === "confirmed" && !isPast && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelShowing}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color={colors.error} size="small" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Showing</Text>
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
  content: {
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
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  statusRow: {
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.captionBold,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  sectionLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cancelButton: {
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.errorLight,
  },
  cancelButtonText: {
    ...typography.bodyBold,
    color: colors.error,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
