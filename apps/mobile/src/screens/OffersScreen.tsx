import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Offer } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? colors.success : score >= 5 ? colors.warning : colors.error;
  const bg = score >= 8 ? colors.accentLight : score >= 5 ? colors.amberLight : colors.errorLight;
  return (
    <View style={[styles.scoreBadge, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[styles.scoreBadgeText, { color }]}>{score}/10</Text>
    </View>
  );
}

export default function OffersScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingId, setListingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [user])
  );

  const fetchOffers = async () => {
    if (!user) return;

    const { data: listing } = await supabase
      .from("listings")
      .select("id, price")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (listing) {
      setListingId(listing.id);

      const { data } = await supabase
        .from("offers")
        .select("*")
        .eq("listing_id", listing.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setOffers(data ?? []);
    }
    setLoading(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"\u2190"} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Offers</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("OfferInput", { listingId: listingId! })}
          disabled={!listingId}
        >
          <Text style={styles.addButtonText}>+ Add New Offer</Text>
        </TouchableOpacity>

        {offers.length >= 2 && (
          <TouchableOpacity
            style={styles.compareButton}
            onPress={() => navigation.navigate("OfferCompare", { listingId: listingId! })}
          >
            <Text style={styles.compareButtonText}>Compare Offers</Text>
          </TouchableOpacity>
        )}

        {offers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>📋</Text>
            </View>
            <Text style={styles.emptyTitle}>No Offers Yet</Text>
            <Text style={styles.emptyText}>
              When you receive a buyer offer, add it here for AI-powered analysis and scoring.
            </Text>
          </View>
        ) : (
          offers.map((offer, index) => (
            <TouchableOpacity
              key={offer.id}
              style={styles.offerCard}
              onPress={() =>
                navigation.navigate("OfferAnalysis", {
                  offerId: offer.id,
                  listingId: listingId!,
                })
              }
            >
              <View style={styles.offerCardHeader}>
                <Text style={styles.offerLabel}>Offer #{offers.length - index}</Text>
                {offer.score != null && <ScoreBadge score={offer.score} />}
              </View>
              <Text style={styles.offerPrice}>
                ${offer.offered_price.toLocaleString()}
              </Text>
              <View style={styles.offerDetails}>
                <Text style={styles.offerDetailText}>
                  {offer.financing_type.charAt(0).toUpperCase() +
                    offer.financing_type.slice(1)}
                </Text>
                <Text style={styles.offerDetailDot}>·</Text>
                <Text style={styles.offerDetailText}>
                  {new Date(offer.created_at).toLocaleDateString()}
                </Text>
              </View>
              {offer.score_label && (
                <Text
                  style={[
                    styles.offerScoreLabel,
                    {
                      color:
                        offer.score! >= 8
                          ? colors.success
                          : offer.score! >= 5
                          ? colors.warning
                          : colors.error,
                    },
                  ]}
                >
                  {offer.score_label}
                </Text>
              )}
            </TouchableOpacity>
          ))
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
  scrollContent: {
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
  addButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  addButtonText: {
    color: colors.white,
    ...typography.bodyBold,
  },
  compareButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  compareButtonText: {
    color: colors.primaryLight,
    ...typography.bodyBold,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: spacing.xxl + spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  offerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  offerCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  offerLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  scoreBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  scoreBadgeText: {
    ...typography.captionBold,
  },
  offerPrice: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  offerDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  offerDetailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  offerDetailDot: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.xs + 2,
  },
  offerScoreLabel: {
    ...typography.captionBold,
    marginTop: spacing.xs + 2,
  },
});
