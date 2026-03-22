import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../App';
import { supabase } from '../lib/supabase';
import { colors, shadows, spacing, borderRadius, typography } from '../theme';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeSlot {
  date: string;
  time: string;
  id: string;
}

interface DateGroup {
  date: string;
  label: string;
  slots: TimeSlot[];
}

interface ListingSummary {
  address: string;
  city: string;
  state: string;
  price: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookShowingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'BookShowing'>>();
  const { listingId } = route.params;

  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [slots, setSlots] = useState<DateGroup[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<{ date: string; time: string } | null>(null);

  // Fetch listing summary
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('listings')
          .select('address, city, state, price')
          .eq('id', listingId)
          .single();
        if (data) setListing(data as ListingSummary);
      } catch (err) {
      }
    })();
  }, [listingId]);

  // Fetch available time slots
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/showings/availability/${listingId}`);
        if (res.ok) {
          const json = await res.json();
          // Expect: { slots: [{ date, time, id }] } or { dateGroups: [...] }
          if (json.dateGroups) {
            setSlots(json.dateGroups);
          } else if (json.slots) {
            // Group by date
            const grouped: Record<string, TimeSlot[]> = {};
            for (const s of json.slots) {
              if (!grouped[s.date]) grouped[s.date] = [];
              grouped[s.date].push(s);
            }
            const groups: DateGroup[] = Object.entries(grouped).map(([date, dateSlots]) => ({
              date,
              label: new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              }),
              slots: dateSlots,
            }));
            setSlots(groups);
          }
        }
      } catch (err) {
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [listingId]);

  const handleBook = async () => {
    if (!selectedSlot) {
      Alert.alert('Select a Time', 'Please select an available time slot.');
      return;
    }
    if (!name.trim() || !email.trim()) {
      Alert.alert('Required Fields', 'Please fill in your name and email.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/showings/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          slotId: selectedSlot.id,
          date: selectedSlot.date,
          time: selectedSlot.time,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setBookedDetails({ date: selectedSlot.date, time: selectedSlot.time });
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Booking Failed', 'Could not book this showing. Please try again later.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not connect to the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Success view
  // ---------------------------------------------------------------------------

  if (success && bookedDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Showing Booked!</Text>
            <Text style={styles.successBody}>
              Your showing has been confirmed. You'll receive a confirmation email shortly.
            </Text>

            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>Date</Text>
                <Text style={styles.successValue}>{bookedDetails.date}</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>Time</Text>
                <Text style={styles.successValue}>{bookedDetails.time}</Text>
              </View>
              {listing && (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successLabel}>Property</Text>
                  <Text style={styles.successValue}>{listing.address}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Schedule a Showing</Text>
        </View>

        {/* Property reference card */}
        {listing && (
          <View style={styles.propertyCard}>
            <Text style={styles.propertyIcon}>🏠</Text>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyAddress}>{listing.address}</Text>
              <Text style={styles.propertyCity}>
                {listing.city}, {listing.state}
              </Text>
              <Text style={styles.propertyPrice}>${listing.price?.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Available time slots */}
        <Text style={styles.sectionTitle}>Available Times</Text>

        {loadingSlots ? (
          <View style={styles.slotsLoading}>
            <ActivityIndicator size="small" color={colors.primaryLight} />
            <Text style={styles.slotsLoadingText}>Loading available times...</Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.noSlots}>
            <Text style={styles.noSlotsText}>
              No time slots are currently available. Please check back later or contact
              the seller directly.
            </Text>
          </View>
        ) : (
          slots.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>{group.label}</Text>
              <View style={styles.timeSlotsRow}>
                {group.slots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.timeSlot, isSelected && styles.timeSlotSelected]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          isSelected && styles.timeSlotTextSelected,
                        ]}
                      >
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Form */}
        <Text style={styles.sectionTitle}>Your Information</Text>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John Smith"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.fieldLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="john@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="(555) 123-4567"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Book button */}
        <TouchableOpacity
          style={[styles.bookButton, submitting && styles.bookButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleBook}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.bookButtonText}>Book Showing</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backText: {
    ...typography.body,
    color: colors.primaryLight,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
  },

  // Property card
  propertyCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  propertyIcon: {
    fontSize: 36,
    marginRight: spacing.md,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyAddress: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  propertyCity: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  propertyPrice: {
    ...typography.h3,
    color: colors.primaryLight,
    marginTop: spacing.xs,
  },

  // Section title
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // Slots
  slotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  slotsLoadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  noSlots: {
    backgroundColor: colors.amberLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noSlotsText: {
    ...typography.caption,
    color: colors.amberDark,
    lineHeight: 20,
  },
  dateGroup: {
    marginBottom: spacing.md,
  },
  dateLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  timeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  timeSlotSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  timeSlotText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  timeSlotTextSelected: {
    color: colors.white,
  },

  // Form
  formCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },

  // Book button
  bookButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },

  // Success view
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  successCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  successIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  successBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  successDetails: {
    width: '100%',
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  successLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  successValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  doneButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
  },
  doneButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});
