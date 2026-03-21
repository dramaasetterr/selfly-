import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
          // Free up the availability slot
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
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (!showing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>{"< Back"}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Showing not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPast =
    showing.status !== "confirmed" ||
    new Date(showing.showing_date + "T" + showing.showing_time_start) < new Date();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Showing Details</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.badge,
                showing.status === "confirmed" && styles.badgeConfirmed,
                showing.status === "cancelled" && styles.badgeCancelled,
                showing.status === "completed" && styles.badgeCompleted,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  showing.status === "confirmed" && styles.badgeTextConfirmed,
                  showing.status === "cancelled" && styles.badgeTextCancelled,
                  showing.status === "completed" && styles.badgeTextCompleted,
                ]}
              >
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
            <View style={styles.detailRow}>
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
              <ActivityIndicator color="#DC2626" size="small" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Showing</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "500",
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusRow: {
    alignItems: "flex-start",
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeConfirmed: {
    backgroundColor: "#DCFCE7",
  },
  badgeCancelled: {
    backgroundColor: "#FEE2E2",
  },
  badgeCompleted: {
    backgroundColor: "#F3F4F6",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  badgeTextConfirmed: {
    color: "#16A34A",
  },
  badgeTextCancelled: {
    color: "#DC2626",
  },
  badgeTextCompleted: {
    color: "#6B7280",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  cancelButton: {
    marginTop: 24,
    borderWidth: 1.5,
    borderColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
  emptyText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
});
