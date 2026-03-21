import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import type { Showing, ShowingAvailability } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || "https://selfly.app";

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
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<{ index: number; field: "startTime" | "endTime" } | null>(null);
  const days = useRef(getNext30Days()).current;

  const fetchData = useCallback(async () => {
    if (!user) return;
    // Get the user's listing
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

    // Fetch availability and showings in parallel
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
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load time windows for selected date from existing slots
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

    // Delete existing slots for this date that aren't booked
    await supabase
      .from("showing_availability")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .eq("date", dateStr)
      .eq("is_booked", false);

    // Insert new slots
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

    // Check if this is the first availability — advance pipeline
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

      if (profile?.current_stage === "create_listing") {
        await supabase
          .from("profiles")
          .update({ current_stage: "manage_showings" })
          .eq("id", user.id);
      }
    }

    await fetchData();
    setSaving(false);
    Alert.alert("Saved", "Availability updated for " + dateStr);
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (!listingId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Showings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Create a listing first to manage showings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Showings</Text>
        </View>

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
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={days}
          keyExtractor={(item) => formatDate(item)}
          contentContainerStyle={styles.dateStrip}
          renderItem={({ item }) => {
            const label = formatDateLabel(item);
            const isSelected = formatDate(item) === formatDate(selectedDate);
            const hasSlots = existingSlots.some((s) => s.date === formatDate(item));
            return (
              <TouchableOpacity
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
          }}
        />

        {/* Time Windows */}
        <View style={styles.timeSection}>
          {timeWindows.map((tw, index) => (
            <View key={index} style={styles.timeRow}>
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
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Availability</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Section B: Your Showings */}
        <Text style={styles.sectionTitle}>Your Showings</Text>

        {upcoming.length === 0 && past.length === 0 && (
          <Text style={styles.emptyText}>No showings booked yet. Share your booking link to get started!</Text>
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
                    <Text style={styles.badgeText}>Confirmed</Text>
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
                  <View style={[styles.badgeConfirmed, styles.badgeCompleted]}>
                    <Text style={[styles.badgeText, styles.badgeTextCompleted]}>
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
    padding: 28,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 40,
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
  linkCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
    marginBottom: 8,
  },
  linkUrl: {
    fontSize: 13,
    color: "#2563EB",
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  copyButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  dateStrip: {
    paddingBottom: 16,
  },
  datePill: {
    width: 60,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    marginRight: 8,
  },
  datePillSelected: {
    backgroundColor: "#2563EB",
  },
  datePillWeekday: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  datePillDay: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginVertical: 2,
  },
  datePillMonth: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  datePillTextSelected: {
    color: "#FFFFFF",
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
    marginTop: 4,
  },
  timeSection: {
    marginBottom: 28,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  timePickerButton: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  timePickerText: {
    fontSize: 15,
    color: "#111827",
    textAlign: "center",
  },
  timeSeparator: {
    marginHorizontal: 10,
    fontSize: 14,
    color: "#6B7280",
  },
  removeButton: {
    marginLeft: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
  },
  timeOptionsContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 10,
  },
  timeOptionsScroll: {
    padding: 4,
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  timeOptionText: {
    fontSize: 15,
    color: "#111827",
  },
  addTimeButton: {
    borderWidth: 1.5,
    borderColor: "#2563EB",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  addTimeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  saveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
  },
  showingCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  showingCardPast: {
    opacity: 0.7,
  },
  showingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  showingDate: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  badgeConfirmed: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
  },
  badgeCompleted: {
    backgroundColor: "#F3F4F6",
  },
  badgeTextCompleted: {
    color: "#6B7280",
  },
  showingTime: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  showingBuyer: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  showingContact: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 24,
  },
});
