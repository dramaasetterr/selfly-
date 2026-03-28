import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import type { Showing, ShowingAvailability } from "../shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";
import TierGate from "../components/TierGate";

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || "https://chiavi.com";

function getNext30Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateLabel(date: Date): { day: string; weekday: string; month: string } {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    day: date.getDate().toString(),
    weekday: weekdays[date.getDay()],
    month: months[date.getMonth()],
  };
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

interface TimeWindow {
  id?: string;
  startTime: string;
  endTime: string;
}

const TIME_OPTIONS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00",
];

export default function ShowingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [listingId, setListingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>([]);
  const [existingSlots, setExistingSlots] = useState<ShowingAvailability[]>([]);
  const [showings, setShowings] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<{ index: number; field: "startTime" | "endTime" } | null>(null);
  const days = useRef(getNext30Days()).current;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: listing } = await supabase
        .from("listings")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!listing) {
        setLoading(false);
        return;
      }
      setListingId(listing.id);

      const [availRes, showingsRes] = await Promise.all([
        supabase
          .from("showing_availability")
          .select("*")
          .eq("listing_id", listing.id)
          .eq("user_id", user.id)
          .order("date", { ascending: true }),
        supabase
          .from("showings")
          .select("*")
          .eq("seller_id", user.id)
          .order("showing_date", { ascending: true }),
      ]);

      if (availRes.data) setExistingSlots(availRes.data);
      if (showingsRes.data) setShowings(showingsRes.data);
    } catch {
      Alert.alert("Error", "Could not load showings. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  useEffect(() => {
    const dateStr = formatDate(selectedDate);
    const slotsForDate = existingSlots.filter((s) => s.date === dateStr);
    if (slotsForDate.length > 0) {
      setTimeWindows(
        slotsForDate.map((s) => ({
          id: s.id,
          startTime: s.start_time,
          endTime: s.end_time,
        }))
      );
    } else {
      setTimeWindows([]);
    }
  }, [selectedDate, existingSlots]);

  const addTimeWindow = () => {
    setTimeWindows([...timeWindows, { startTime: "10:00", endTime: "11:00" }]);
  };

  const removeTimeWindow = (index: number) => {
    setTimeWindows(timeWindows.filter((_, i) => i !== index));
  };

  const updateTimeWindow = (index: number, field: "startTime" | "endTime", value: string) => {
    const updated = [...timeWindows];
    updated[index] = { ...updated[index], [field]: value };
    setTimeWindows(updated);
  };

  const saveAvailability = async () => {
    if (!user || !listingId) return;
    setSaving(true);

    const dateStr = formatDate(selectedDate);

    try {
      await supabase
        .from("showing_availability")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .eq("date", dateStr)
        .eq("is_booked", false);

      if (timeWindows.length > 0) {
        const rows = timeWindows.map((tw) => ({
          user_id: user.id,
          listing_id: listingId,
          date: dateStr,
          start_time: tw.startTime,
          end_time: tw.endTime,
        }));
        await supabase.from("showing_availability").insert(rows);
      }

      const { count } = await supabase
        .from("showing_availability")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (count && count > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_stage")
          .eq("id", user.id)
          .single();

        if (profile?.current_stage === "manage_showings") {
          await supabase
            .from("profiles")
            .update({ current_stage: "review_offers" })
            .eq("id", user.id);
        }
      }

      await fetchData();
      Alert.alert("Saved", "Availability updated for " + dateStr);
    } catch {
      Alert.alert("Error", "Could not save availability. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!listingId) return;
    const url = `${WEB_APP_URL}/show/${listingId}`;
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const now = new Date();
  const upcoming = showings.filter(
    (s) => s.status === "confirmed" && new Date(s.showing_date + "T" + s.showing_time_start) >= now
  );
  const past = showings.filter(
    (s) => s.status !== "confirmed" || new Date(s.showing_date + "T" + s.showing_time_start) < now
  );

  if (loading) {
    return (
      <TierGate feature="showings">
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
      <TierGate feature="showings">
        <SafeAreaView style={styles.container}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>{"\u2190"} Back</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyText}>Create a listing first to manage showings.</Text>
          </View>
        </SafeAreaView>
      </TierGate>
    );
  }

  return (
    <TierGate feature="showings">
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />
      }>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"\u2190"} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Manage Showings</Text>

        {/* Booking Link */}
        <View style={styles.linkCard}>
          <Text style={styles.linkLabel}>Share this link with potential buyers</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>
            {WEB_APP_URL}/show/{listingId}
          </Text>
          <TouchableOpacity style={styles.copyButton} onPress={copyLink}>
            <Text style={styles.copyButtonText}>{copied ? "Copied!" : "Copy Link"}</Text>
          </TouchableOpacity>
        </View>

        {/* Section A: Set Availability */}
        <Text style={styles.sectionTitle}>Set Availability</Text>

        {/* Date Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStrip}
        >
          {days.map((item) => {
            const label = formatDateLabel(item);
            const isSelected = formatDate(item) === formatDate(selectedDate);
            const hasSlots = existingSlots.some((s) => s.date === formatDate(item));
            return (
              <TouchableOpacity
                key={formatDate(item)}
                style={[styles.datePill, isSelected && styles.datePillSelected]}
                onPress={() => setSelectedDate(item)}
              >
                <Text style={[styles.datePillWeekday, isSelected && styles.datePillTextSelected]}>
                  {label.weekday}
                </Text>
                <Text style={[styles.datePillDay, isSelected && styles.datePillTextSelected]}>
                  {label.day}
                </Text>
                <Text style={[styles.datePillMonth, isSelected && styles.datePillTextSelected]}>
                  {label.month}
                </Text>
                {hasSlots && !isSelected && <View style={styles.slotDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time Windows */}
        <View style={styles.timeSection}>
          {timeWindows.map((tw, index) => (
            <View key={index} style={styles.timeCard}>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker({ index, field: "startTime" })}
              >
                <Text style={styles.timePickerText}>{formatTime(tw.startTime)}</Text>
              </TouchableOpacity>
              <Text style={styles.timeSeparator}>to</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker({ index, field: "endTime" })}
              >
                <Text style={styles.timePickerText}>{formatTime(tw.endTime)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeTimeWindow(index)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>x</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Time picker dropdown */}
          {showTimePicker && (
            <View style={styles.timeOptionsContainer}>
              <ScrollView style={styles.timeOptionsScroll} nestedScrollEnabled>
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.timeOption}
                    onPress={() => {
                      updateTimeWindow(showTimePicker.index, showTimePicker.field, t);
                      setShowTimePicker(null);
                    }}
                  >
                    <Text style={styles.timeOptionText}>{formatTime(t)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.addTimeButton} onPress={addTimeWindow}>
            <Text style={styles.addTimeButtonText}>+ Add Time Window</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveAvailability}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Availability</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Section B: Your Showings */}
        <Text style={styles.sectionTitle}>Your Showings</Text>

        {upcoming.length === 0 && past.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No showings booked yet. Share your booking link to get started!</Text>
          </View>
        )}

        {upcoming.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Upcoming</Text>
            {upcoming.map((showing) => (
              <TouchableOpacity
                key={showing.id}
                style={styles.showingCard}
                onPress={() => navigation.navigate("ShowingDetail", { showingId: showing.id })}
              >
                <View style={styles.showingCardHeader}>
                  <Text style={styles.showingDate}>{showing.showing_date}</Text>
                  <View style={styles.badgeConfirmed}>
                    <Text style={styles.badgeConfirmedText}>Confirmed</Text>
                  </View>
                </View>
                <Text style={styles.showingTime}>
                  {formatTime(showing.showing_time_start)} - {formatTime(showing.showing_time_end)}
                </Text>
                <Text style={styles.showingBuyer}>{showing.buyer_name}</Text>
                <Text style={styles.showingContact}>{showing.buyer_email}</Text>
                {showing.buyer_phone && (
                  <Text style={styles.showingContact}>{showing.buyer_phone}</Text>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Past</Text>
            {past.map((showing) => (
              <TouchableOpacity
                key={showing.id}
                style={[styles.showingCard, styles.showingCardPast]}
                onPress={() => navigation.navigate("ShowingDetail", { showingId: showing.id })}
              >
                <View style={styles.showingCardHeader}>
                  <Text style={styles.showingDate}>{showing.showing_date}</Text>
                  <View style={styles.badgeCompleted}>
                    <Text style={styles.badgeCompletedText}>
                      {showing.status === "cancelled" ? "Cancelled" : "Completed"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.showingTime}>
                  {formatTime(showing.showing_time_start)} - {formatTime(showing.showing_time_end)}
                </Text>
                <Text style={styles.showingBuyer}>{showing.buyer_name}</Text>
                <Text style={styles.showingContact}>{showing.buyer_email}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </TierGate>
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
    padding: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
  linkCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  linkLabel: {
    ...typography.captionBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  linkUrl: {
    ...typography.caption,
    color: colors.primaryLight,
    marginBottom: spacing.md,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: colors.primarySoft,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  copyButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  copyButtonText: {
    color: colors.white,
    ...typography.captionBold,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  dateStrip: {
    paddingBottom: spacing.md,
  },
  datePill: {
    width: 62,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  datePillSelected: {
    backgroundColor: colors.primaryLight,
  },
  datePillWeekday: {
    ...typography.small,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  datePillDay: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginVertical: 2,
  },
  datePillMonth: {
    ...typography.small,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  datePillTextSelected: {
    color: colors.white,
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: spacing.xs,
  },
  timeSection: {
    marginBottom: spacing.lg,
  },
  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    ...shadows.sm,
  },
  timePickerButton: {
    flex: 1,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
  },
  timePickerText: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: "center",
  },
  timeSeparator: {
    marginHorizontal: spacing.sm + 2,
    ...typography.caption,
    color: colors.textSecondary,
  },
  removeButton: {
    marginLeft: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorLight,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: "600",
  },
  timeOptionsContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    maxHeight: 200,
    marginBottom: spacing.sm + 2,
    ...shadows.md,
  },
  timeOptionsScroll: {
    padding: spacing.xs,
  },
  timeOption: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  timeOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  addTimeButton: {
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md - 2,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  addTimeButtonText: {
    ...typography.captionBold,
    color: colors.primaryLight,
  },
  saveButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    ...shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    ...typography.bodyBold,
  },
  subsectionTitle: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  showingCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  showingCardPast: {
    opacity: 0.65,
  },
  showingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs + 2,
  },
  showingDate: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  badgeConfirmed: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeConfirmedText: {
    ...typography.smallBold,
    color: colors.accentDark,
  },
  badgeCompleted: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeCompletedText: {
    ...typography.smallBold,
    color: colors.textSecondary,
  },
  showingTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  showingBuyer: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  showingContact: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    ...shadows.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
});

