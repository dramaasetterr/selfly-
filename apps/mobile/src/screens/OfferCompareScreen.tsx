import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { Offer } from "../shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";
import TierGate from "../components/TierGate";

function ScoreBadge({ score, isBest }: { score: number; isBest: boolean }) {
  const color = score >= 8 ? colors.success : score >= 5 ? colors.warning : colors.error;
  const bg = isBest ? colors.accentLight : "transparent";
  return (
    <View
      style={[
        styles.cellScoreBadge,
        { backgroundColor: bg, borderColor: color },
      ]}
    >
      <Text style={[styles.cellScoreText, { color }]}>{score}/10</Text>
    </View>
  );
}

interface CompareRow {
  label: string;
  getValue: (o: Offer) => string;
  getBest: (offers: Offer[]) => number;
}

const COMPARE_ROWS: CompareRow[] = [
  {
    label: "Score",
    getValue: (o) => `${o.score ?? "-"}/10`,
    getBest: (offers) => {
      let best = 0;
      offers.forEach((o, i) => {
        if ((o.score ?? 0) > (offers[best].score ?? 0)) best = i;
      });
      return best;
    },
  },
  {
    label: "Offered Price",
    getValue: (o) => `$${o.offered_price.toLocaleString()}`,
    getBest: (offers) => {
      let best = 0;
      offers.forEach((o, i) => {
        if (o.offered_price > offers[best].offered_price) best = i;
      });
      return best;
    },
  },
  {
    label: "Financing",
    getValue: (o) => o.financing_type.charAt(0).toUpperCase() + o.financing_type.slice(1),
    getBest: (offers) => {
      const rank: Record<string, number> = { cash: 4, conventional: 3, fha: 2, va: 1 };
      let best = 0;
      offers.forEach((o, i) => {
        if ((rank[o.financing_type] ?? 0) > (rank[offers[best].financing_type] ?? 0))
          best = i;
      });
      return best;
    },
  },
  {
    label: "Down Payment",
    getValue: (o) => (o.down_payment_pct != null ? `${o.down_payment_pct}%` : "-"),
    getBest: (offers) => {
      let best = 0;
      offers.forEach((o, i) => {
        if ((o.down_payment_pct ?? 0) > (offers[best].down_payment_pct ?? 0)) best = i;
      });
      return best;
    },
  },
  {
    label: "Inspection",
    getValue: (o) => (o.inspection_contingency ? "Yes" : "No"),
    getBest: (offers) => {
      const idx = offers.findIndex((o) => !o.inspection_contingency);
      return idx >= 0 ? idx : 0;
    },
  },
  {
    label: "Appraisal",
    getValue: (o) => (o.appraisal_contingency ? "Yes" : "No"),
    getBest: (offers) => {
      const idx = offers.findIndex((o) => !o.appraisal_contingency);
      return idx >= 0 ? idx : 0;
    },
  },
  {
    label: "Closing Date",
    getValue: (o) =>
      o.closing_date ? new Date(o.closing_date).toLocaleDateString() : "-",
    getBest: () => -1,
  },
  {
    label: "Concessions",
    getValue: (o) => o.seller_concessions || "None",
    getBest: (offers) => {
      const idx = offers.findIndex((o) => !o.seller_concessions);
      return idx >= 0 ? idx : 0;
    },
  },
];

export default function OfferCompareScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "OfferCompare">>();
  const { listingId } = route.params;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [user])
  );

  const fetchOffers = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("offers")
        .select("*")
        .eq("listing_id", listingId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      setOffers(data ?? []);
    } catch (err) {
      Alert.alert("Error", "Failed to load offers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const bestOverallIndex = offers.length
    ? offers.reduce(
        (best, o, i) => ((o.score ?? 0) > (offers[best].score ?? 0) ? i : best),
        0
      )
    : -1;

  if (loading) {
    return (
      <TierGate feature="offer_analyzer">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
          </View>
        </SafeAreaView>
      </TierGate>
    );
  }

  if (offers.length === 0) {
    return (
      <TierGate feature="offer_analyzer">
        <SafeAreaView style={styles.container}>
          <View style={styles.headerFixed}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backText}>{"\u2190"} Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Compare Offers</Text>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyText}>No offers to compare yet.</Text>
          </View>
        </SafeAreaView>
      </TierGate>
    );
  }

  return (
    <TierGate feature="offer_analyzer">
    <SafeAreaView style={styles.container}>
      <View style={styles.headerFixed}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"\u2190"} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Compare Offers</Text>

        {bestOverallIndex >= 0 && (
          <View style={styles.bestBanner}>
            <Text style={styles.bestBannerText}>
              Best Offer: #{bestOverallIndex + 1} — Score{" "}
              {offers[bestOverallIndex].score}/10
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableWrap}>
            {/* Column Headers */}
            <View style={styles.tableRow}>
              <View style={styles.labelCell}>
                <Text style={styles.labelCellText}> </Text>
              </View>
              {offers.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.valueCell,
                    i === bestOverallIndex && styles.bestColumnHeader,
                  ]}
                >
                  <Text style={styles.columnHeader}>Offer #{i + 1}</Text>
                </View>
              ))}
            </View>

            {/* Data Rows */}
            {COMPARE_ROWS.map((row, rowIdx) => {
              const bestIdx = row.getBest(offers);
              return (
                <View
                  key={row.label}
                  style={[
                    styles.tableRow,
                    rowIdx % 2 === 0 ? styles.rowEven : styles.rowOdd,
                  ]}
                >
                  <View style={styles.labelCell}>
                    <Text style={styles.labelCellText}>{row.label}</Text>
                  </View>
                  {offers.map((offer, i) => (
                    <View
                      key={i}
                      style={[
                        styles.valueCell,
                        i === bestIdx && bestIdx >= 0 && styles.bestValue,
                      ]}
                    >
                      {row.label === "Score" ? (
                        <ScoreBadge
                          score={offer.score ?? 0}
                          isBest={i === bestIdx}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.valueCellText,
                            i === bestIdx && bestIdx >= 0 && styles.bestValueText,
                          ]}
                        >
                          {row.getValue(offer)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
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
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  headerFixed: {
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
    marginBottom: spacing.md,
  },
  bestBanner: {
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
    ...shadows.sm,
  },
  bestBannerText: {
    ...typography.bodyBold,
    color: colors.accentDark,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  tableWrap: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.md,
  },
  tableRow: {
    flexDirection: "row",
  },
  rowEven: {
    backgroundColor: colors.borderLight,
  },
  rowOdd: {
    backgroundColor: colors.card,
  },
  labelCell: {
    width: 110,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.sm + 2,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  labelCellText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  valueCell: {
    width: 130,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.sm + 2,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  bestColumnHeader: {
    backgroundColor: colors.accentLight + "40",
  },
  bestValue: {
    backgroundColor: colors.accentLight,
  },
  bestValueText: {
    color: colors.accentDark,
    fontWeight: "700",
  },
  valueCellText: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: "center",
  },
  columnHeader: {
    ...typography.captionBold,
    color: colors.primaryLight,
  },
  cellScoreBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
  },
  cellScoreText: {
    ...typography.captionBold,
  },
});

