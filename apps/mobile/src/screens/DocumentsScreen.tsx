import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  SUPPORTED_STATES,
  DocumentType,
  Document,
} from "../shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";
import TierGate from "../components/TierGate";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const DOCUMENT_ICONS: Record<DocumentType, string> = {
  sellers_disclosure: "\u{1F4DD}",
  purchase_agreement: "\u{1F4DC}",
  counter_offer: "\u{1F4CA}",
};

const DOCUMENT_EXPLANATIONS: Record<DocumentType, string> = {
  sellers_disclosure:
    "A seller's disclosure is a legal document where you, as the seller, disclose known issues with your property (structural problems, water damage, pest issues, etc.). Most states require this form. It protects both you and the buyer by ensuring transparency about the property's condition.",
  purchase_agreement:
    "A purchase agreement (also called a sales contract) is the main legal document that outlines the terms of the home sale — including the price, closing date, contingencies, and what's included in the sale. Both buyer and seller sign this to formalize the deal.",
  counter_offer:
    "A counter offer is used when you receive a buyer's offer but want to negotiate different terms — like a higher price, different closing date, or fewer contingencies. It formally presents your revised terms back to the buyer for their consideration.",
};

const SAMPLE_PROPERTY = {
  address: "742 Evergreen Terrace, Springfield, IL 62704",
  bedrooms: 4,
  bathrooms: 2.5,
  sqft: 2400,
  year_built: 1992,
  property_type: "single_family",
  price: 375000,
};

type CardStatus = "idle" | "loading" | "success" | "error";

interface CardState {
  status: CardStatus;
  errorMessage?: string;
}

const WORKFLOW_STEPS = [
  { num: "1", text: "Generate the document" },
  { num: "2", text: "Review and fill in the blanks" },
  { num: "3", text: "Have an attorney review" },
  { num: "4", text: "Use during your sale" },
];

export default function DocumentsScreen() {
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [selectedState, setSelectedState] = useState("NY");
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [hasListing, setHasListing] = useState<boolean | null>(null);
  const [listingData, setListingData] = useState<any>(null);
  const [useSampleData, setUseSampleData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  const toggleExplanation = (docType: string) => {
    setExpandedExplanations((prev) => ({ ...prev, [docType]: !prev[docType] }));
  };

  const updateCardState = (docType: DocumentType, state: CardState) => {
    setCardStates((prev) => ({ ...prev, [docType]: state }));
  };

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setDocuments(data as Document[]);
    } catch {
      // Will show existing documents or empty state
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkListing = useCallback(async () => {
    if (!user) return;
    const { data: listing, error } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !listing) {
      setHasListing(false);
      setListingData(null);
    } else {
      setHasListing(true);
      setListingData(listing);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
    checkListing();
  }, [fetchDocuments, checkListing]);

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
      checkListing();
    }, [fetchDocuments, checkListing])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchDocuments(), checkListing()]).finally(() => setRefreshing(false));
  }, [fetchDocuments, checkListing]);

  const getExistingDoc = (type: DocumentType) =>
    documents.find(
      (d) => d.document_type === type && d.state === selectedState
    );

  const handleGenerate = async (docType: DocumentType) => {
    if (!user) return;

    updateCardState(docType, { status: "loading" });

    try {
      let property;

      if (useSampleData || !hasListing || !listingData) {
        property = SAMPLE_PROPERTY;
      } else {
        property = {
          address: listingData.address,
          bedrooms: listingData.bedrooms,
          bathrooms: listingData.bathrooms,
          sqft: listingData.sqft,
          year_built: listingData.year_built,
          property_type: listingData.property_type,
          price: listingData.price,
        };
      }

      // Validate required fields
      if (!property.address) {
        updateCardState(docType, {
          status: "error",
          errorMessage: "Property address is required. Please update your listing or use sample data.",
        });
        return;
      }

      const response = await fetch(`${API_BASE}/api/documents/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: docType,
          state: selectedState,
          property,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          errorBody || `Server error (${response.status})`
        );
      }

      const result = await response.json();

      // Save to Supabase
      const existingDoc = getExistingDoc(docType);
      if (existingDoc) {
        await supabase
          .from("documents")
          .update({
            title: result.title,
            content: result.content,
            html_content: result.html,
          })
          .eq("id", existingDoc.id);
      } else {
        await supabase.from("documents").insert({
          user_id: user.id,
          listing_id: listingData?.id || null,
          document_type: docType,
          state: selectedState,
          title: result.title,
          content: result.content,
          html_content: result.html,
        });
      }

      await fetchDocuments();

      updateCardState(docType, { status: "success" });
    } catch (error: any) {
      const message =
        error?.message || "Failed to generate document. Please try again.";
      updateCardState(docType, { status: "error", errorMessage: message });
    }
  };

  const handleView = (doc: Document) => {
    navigation.navigate("DocumentViewer", { document: doc });
  };

  const handleViewGenerated = async (docType: DocumentType) => {
    if (!user) return;
    const { data: docs } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .eq("document_type", docType)
      .eq("state", selectedState)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (docs) {
      navigation.navigate("DocumentViewer", { document: docs as Document });
    }
  };

  const stateLabel =
    SUPPORTED_STATES.find((s) => s.value === selectedState)?.label ||
    selectedState;

  if (loading) {
    return (
      <TierGate feature="documents">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.loadingText}>Loading documents...</Text>
          </View>
        </SafeAreaView>
      </TierGate>
    );
  }

  return (
    <TierGate feature="documents">
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />
      }>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonTouch}
          >
            <Text style={styles.backButton}>{"\u2190"} Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Documents</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Explainer Banner */}
        <View style={styles.explainerBanner}>
          <View style={styles.explainerIconRow}>
            <Text style={styles.explainerIcon}>{"\u{1F4CB}"}</Text>
            <Text style={styles.explainerTitle}>About These Documents</Text>
          </View>
          <Text style={styles.explainerText}>
            These documents are templates to help you get started. We recommend having a real estate attorney review them before use.
          </Text>
          <View style={styles.workflowSteps}>
            {WORKFLOW_STEPS.map((ws) => (
              <View key={ws.num} style={styles.workflowStep}>
                <View style={styles.workflowStepNum}>
                  <Text style={styles.workflowStepNumText}>{ws.num}</Text>
                </View>
                <Text style={styles.workflowStepText}>{ws.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Listing Status Banner */}
        {hasListing === false && !useSampleData && (
          <View style={styles.listingBanner}>
            <Text style={styles.listingBannerIcon}>{"\u{1F3E0}"}</Text>
            <View style={styles.listingBannerContent}>
              <Text style={styles.listingBannerTitle}>No listing found</Text>
              <Text style={styles.listingBannerText}>
                Create a listing first to generate documents for your property, or preview with example data.
              </Text>
              <TouchableOpacity
                style={styles.sampleDataButton}
                onPress={() => setUseSampleData(true)}
              >
                <Text style={styles.sampleDataButtonText}>
                  Preview with Example Data
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {useSampleData && (
          <View style={styles.sampleBanner}>
            <Text style={styles.sampleBannerIcon}>{"\u{1F9EA}"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sampleBannerText}>
                Using example property data
              </Text>
              <Text style={styles.sampleBannerSub}>
                {SAMPLE_PROPERTY.address}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setUseSampleData(false)}>
              <Text style={styles.sampleBannerDismiss}>{"\u2715"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State Selector */}
        <TouchableOpacity
          style={styles.stateSelector}
          onPress={() => setStatePickerOpen(!statePickerOpen)}
          activeOpacity={0.7}
        >
          <Text style={styles.stateSelectorLabel}>STATE</Text>
          <View style={styles.stateSelectorValue}>
            <Text style={styles.stateSelectorText}>{stateLabel}</Text>
            <Text style={styles.chevron}>
              {statePickerOpen ? "\u25B2" : "\u25BC"}
            </Text>
          </View>
        </TouchableOpacity>

        {statePickerOpen && (
          <View style={styles.stateDropdown}>
            {SUPPORTED_STATES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.stateOption,
                  selectedState === s.value && styles.stateOptionSelected,
                ]}
                onPress={() => {
                  setSelectedState(s.value);
                  setStatePickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.stateOptionText,
                    selectedState === s.value &&
                      styles.stateOptionTextSelected,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Document Cards */}
        {DOCUMENT_TYPES.map((docType) => {
          const existingDoc = getExistingDoc(docType);
          const cardState = cardStates[docType] || { status: "idle" };
          const isExplanationExpanded = expandedExplanations[docType] || false;

          return (
            <View key={docType} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrapper}>
                  <Text style={styles.cardIcon}>
                    {DOCUMENT_ICONS[docType]}
                  </Text>
                </View>
                <View style={styles.cardTitleArea}>
                  <Text style={styles.cardTitle}>
                    {DOCUMENT_TYPE_LABELS[docType]}
                  </Text>
                  <Text style={styles.cardDescription}>
                    {DOCUMENT_TYPE_DESCRIPTIONS[docType]}
                  </Text>
                </View>
              </View>

              {/* What is this? */}
              <TouchableOpacity
                style={styles.whatIsThisButton}
                onPress={() => toggleExplanation(docType)}
                activeOpacity={0.7}
              >
                <Text style={styles.whatIsThisIcon}>{isExplanationExpanded ? "\u25B2" : "\u{2139}\uFE0F"}</Text>
                <Text style={styles.whatIsThisText}>
                  {isExplanationExpanded ? "Hide explanation" : "What is this?"}
                </Text>
              </TouchableOpacity>

              {isExplanationExpanded && (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationText}>
                    {DOCUMENT_EXPLANATIONS[docType]}
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {cardState.status === "error" && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorIcon}>{"\u26A0"}</Text>
                  <Text style={styles.errorText}>
                    {cardState.errorMessage}
                  </Text>
                </View>
              )}

              {/* Card Actions */}
              {cardState.status === "loading" ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator size="small" color={colors.primaryLight} />
                  <Text style={styles.generatingText}>
                    Generating your document...
                  </Text>
                </View>
              ) : cardState.status === "success" ? (
                <View style={styles.successSection}>
                  <View style={styles.successBanner}>
                    <Text style={styles.successIcon}>{"\u2713"}</Text>
                    <Text style={styles.successText}>
                      Document generated successfully
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewDocButton}
                    onPress={() => handleViewGenerated(docType)}
                  >
                    <Text style={styles.viewDocButtonText}>
                      View Document
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : existingDoc ? (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => handleView(existingDoc)}
                  >
                    <Text style={styles.viewButtonText}>
                      {"\u{1F4C4}"} View
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={() => handleGenerate(docType)}
                  >
                    <Text style={styles.regenerateButtonText}>
                      {"\u21BB"} Regenerate
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() => handleGenerate(docType)}
                  disabled={!hasListing && !useSampleData}
                  activeOpacity={0.8}
                >
                  <Text style={styles.generateButtonText}>
                    {"\u2728"} Generate Document
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
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
    gap: spacing.md,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backButtonTouch: {
    paddingVertical: spacing.xs,
  },
  backButton: {
    ...typography.bodyBold,
    color: colors.primaryLight,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  // Explainer banner
  explainerBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
  },
  explainerIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  explainerIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  explainerTitle: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  explainerText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  workflowSteps: {
    gap: spacing.sm,
  },
  workflowStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  workflowStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  workflowStepNumText: {
    ...typography.smallBold,
    color: colors.white,
  },
  workflowStepText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "500",
  },

  // Listing banner
  listingBanner: {
    backgroundColor: colors.amberLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  listingBannerIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  listingBannerContent: {
    flex: 1,
  },
  listingBannerTitle: {
    ...typography.captionBold,
    color: colors.amberDark,
    marginBottom: spacing.xs,
  },
  listingBannerText: {
    ...typography.caption,
    color: colors.amberDark,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  sampleDataButton: {
    backgroundColor: colors.amber,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: "flex-start",
  },
  sampleDataButtonText: {
    ...typography.captionBold,
    color: colors.white,
  },

  // Sample data banner
  sampleBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  sampleBannerIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  sampleBannerText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  sampleBannerSub: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sampleBannerDismiss: {
    fontSize: 16,
    color: colors.textMuted,
    paddingLeft: spacing.sm,
  },

  // State selector
  stateSelector: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  stateSelectorLabel: {
    ...typography.smallBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  stateSelectorValue: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stateSelectorText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 12,
    color: colors.textMuted,
  },
  stateDropdown: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.md,
  },
  stateOption: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  stateOptionSelected: {
    backgroundColor: colors.primarySoft,
  },
  stateOptionText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  stateOptionTextSelected: {
    color: colors.primaryLight,
    fontWeight: "600",
  },

  // Document cards
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  cardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // What is this?
  whatIsThisButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  whatIsThisIcon: {
    fontSize: 14,
    marginRight: spacing.xs + 2,
  },
  whatIsThisText: {
    ...typography.captionBold,
    color: colors.primaryLight,
  },
  explanationBox: {
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  explanationText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // Error banner
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  errorText: {
    ...typography.small,
    color: colors.errorDark,
    flex: 1,
    lineHeight: 18,
  },

  // Success section
  successSection: {
    gap: spacing.sm,
  },
  successBanner: {
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  successIcon: {
    fontSize: 16,
    color: colors.accent,
    marginRight: spacing.sm,
    fontWeight: "700",
  },
  successText: {
    ...typography.captionBold,
    color: colors.accentDark,
  },
  viewDocButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  viewDocButtonText: {
    ...typography.bodyBold,
    color: colors.textOnPrimary,
  },

  // Buttons
  generateButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  generateButtonText: {
    ...typography.bodyBold,
    color: colors.textOnPrimary,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  viewButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  viewButtonText: {
    ...typography.captionBold,
    color: colors.textOnPrimary,
  },
  regenerateButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  regenerateButtonText: {
    ...typography.captionBold,
    color: colors.primaryLight,
  },
  generatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.sm,
  },
  generatingText: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: "500",
  },
});

