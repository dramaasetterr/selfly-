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
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { Offer } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";

function ScoreBadge({ score, isBest }: { score: number; isBest: boolean }) {
  const color = score >= 8 ? "#22C55E" : score >= 5 ? "#F59E0B" : "#EF4444";
  return (
    <View
      style={[
        styles.cellScoreBadge,
        { backgroundColor: isBest ? "#F0FDF4" : "transparent", borderColor: color },
      ]}
    >
      <Text style={[styles.cellScoreText, { color }]}>{score}/10</Text>
    </View>
  );
}

interface CompareRow {
  label: string;
  getValue: (o: Offer) => string;
  getBest: (offers: Offer[]) => number; // index of best
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
    getBest: () => -1, // no "best" for dates
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

    const { data } = await supabase
      .from("offers")
      .select("*")
      .eq("listing_id", listingId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    setOffers(data ?? []);
    setLoading(false);
  };

  const bestOverallIndex = offers.length
    ? offers.reduce(
        (best, o, i) => ((o.score ?? 0) > (offers[best].score ?? 0) ? i : best),
        0
      )
    : -1;

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
      <View style={styles.headerFixed}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Compare Offers</Text>
          <View style={styles.backButton} />
        </View>

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
          <View>
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
                    i === bestOverallIndex && styles.bestColumn,
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
  headerFixed: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  bestBanner: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
  },
  bestBannerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#166534",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  tableRow: {
    flexDirection: "row",
  },
  rowEven: {
    backgroundColor: "#F9FAFB",
  },
  rowOdd: {
    backgroundColor: "#FFFFFF",
  },
  labelCell: {
    width: 110,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  labelCellText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  valueCell: {
    width: 130,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  bestColumn: {
    backgroundColor: "#F0FDF420",
  },
  bestValue: {
    backgroundColor: "#F0FDF4",
  },
  bestValueText: {
    color: "#166534",
    fontWeight: "700",
  },
  valueCellText: {
    fontSize: 14,
    color: "#111827",
    textAlign: "center",
  },
  columnHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  cellScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  cellScoreText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
