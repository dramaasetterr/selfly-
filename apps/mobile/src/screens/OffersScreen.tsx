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

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? "#22C55E" : score >= 5 ? "#F59E0B" : "#EF4444";
  return (
    <View style={[styles.scoreBadge, { backgroundColor: color + "20", borderColor: color }]}>
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

    // Get user's listing
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
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Offers</Text>
          <View style={styles.backButton} />
        </View>

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
            <Text style={styles.emptyIcon}>📋</Text>
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
                          ? "#22C55E"
                          : offer.score! >= 5
                          ? "#F59E0B"
                          : "#EF4444",
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
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  addButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  compareButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  compareButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  offerCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
  },
  offerCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  offerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  offerPrice: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  offerDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  offerDetailText: {
    fontSize: 14,
    color: "#6B7280",
  },
  offerDetailDot: {
    fontSize: 14,
    color: "#9CA3AF",
    marginHorizontal: 6,
  },
  offerScoreLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
});
