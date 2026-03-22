import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../App";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ListingSummary {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  user_id: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContactSellerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "ContactSeller">>();
  const { listingId } = route.params;
  const { user } = useAuth();

  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill user info
  useEffect(() => {
    if (user?.email) setEmail(user.email);

    (async () => {
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile?.full_name) setName(profile.full_name);
      }
    })();
  }, [user]);

  // Fetch listing
  useEffect(() => {
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("listings")
          .select("id, address, city, state, zip, price, user_id")
          .eq("id", listingId)
          .single();

        if (fetchError) {
          console.warn("Failed to fetch listing:", fetchError.message);
        } else {
          setListing(data as ListingSummary);
        }
      } catch (err) {
        console.warn("Listing fetch error:", err);
      } finally {
        setLoadingListing(false);
      }
    })();
  }, [listingId]);

  const handleSend = async () => {
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }
    if (!listing) {
      setError("Listing not found.");
      return;
    }

    setSending(true);

    try {
      const { error: insertError } = await supabase.from("messages").insert({
        listing_id: listingId,
        sender_id: user?.id || null,
        receiver_id: listing.user_id,
        content: message.trim(),
        sender_name: name.trim(),
        sender_email: email.trim(),
        read: false,
      });

      if (insertError) {
        setError(insertError.message);
      } else {
        setSent(true);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loadingListing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backText}>{"\u2190"} Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Contact Seller</Text>
            <View style={styles.headerSpacer} />
          </View>

          {sent ? (
            /* Success state */
            <View style={styles.successContainer}>
              <View style={styles.successCard}>
                <Text style={styles.successIcon}>{"\u2705"}</Text>
                <Text style={styles.successTitle}>Message sent!</Text>
                <Text style={styles.successBody}>
                  The seller will be notified and can respond to your message. You can view the
                  conversation in your Messages.
                </Text>
                <TouchableOpacity
                  style={styles.successButton}
                  activeOpacity={0.8}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.successButtonText}>Back to Listing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.successSecondaryButton}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("Messages")}
                >
                  <Text style={styles.successSecondaryText}>View Messages</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Listing Reference Card */}
              {listing && (
                <View style={styles.listingCard}>
                  <View style={styles.listingIconWrap}>
                    <Text style={styles.listingIcon}>{"\uD83C\uDFE0"}</Text>
                  </View>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingAddress} numberOfLines={1}>
                      {listing.address}
                    </Text>
                    <Text style={styles.listingLocation}>
                      {listing.city}, {listing.state} {listing.zip}
                    </Text>
                    <Text style={styles.listingPrice}>
                      ${listing.price?.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Form */}
              <View style={styles.form}>
                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Your Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Your Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Message</Text>
                  <TextInput
                    style={[styles.input, styles.messageInput]}
                    placeholder="Hi! I'm interested in your property..."
                    placeholderTextColor={colors.textMuted}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={2000}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={sending}
                  activeOpacity={0.85}
                >
                  {sending ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send Message</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
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
  flex: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  backButton: {
    paddingVertical: spacing.xs,
    minWidth: 60,
  },
  backText: {
    ...typography.body,
    color: colors.primaryLight,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerSpacer: {
    minWidth: 60,
  },

  // Listing card
  listingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
    ...shadows.md,
  },
  listingIconWrap: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  listingIcon: {
    fontSize: 28,
  },
  listingInfo: {
    flex: 1,
  },
  listingAddress: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  listingLocation: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listingPrice: {
    ...typography.h3,
    color: colors.primaryLight,
    marginTop: spacing.xs,
  },

  // Form
  form: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md + 4,
  },
  inputGroup: {
    gap: spacing.xs + 2,
  },
  label: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  messageInput: {
    minHeight: 140,
    paddingTop: spacing.md,
  },

  // Error
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.errorDark,
  },

  // Send button
  sendButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 17,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginTop: spacing.sm,
    ...shadows.md,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },

  // Success
  successContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  successCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    width: "100%",
    ...shadows.md,
  },
  successIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  successBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  successButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  successButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  successSecondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  successSecondaryText: {
    ...typography.bodyBold,
    color: colors.primaryLight,
  },
});
