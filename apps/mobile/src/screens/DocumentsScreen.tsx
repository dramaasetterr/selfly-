import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
} from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const DOCUMENT_ICONS: Record<DocumentType, string> = {
  sellers_disclosure: "\u{1F4CB}",
  purchase_agreement: "\u{1F91D}",
  counter_offer: "\u{1F504}",
};

export default function DocumentsScreen() {
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [selectedState, setSelectedState] = useState("NY");
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<DocumentType | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setDocuments(data as Document[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
    }, [fetchDocuments])
  );

  const getExistingDoc = (type: DocumentType) =>
    documents.find(
      (d) => d.document_type === type && d.state === selectedState
    );

  const handleGenerate = async (docType: DocumentType) => {
    if (!user) return;

    setGenerating(docType);

    try {
      // Fetch user's listing for property details
      const { data: listing } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const property = listing
        ? {
            address: listing.address,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            sqft: listing.sqft,
            year_built: listing.year_built,
            property_type: listing.property_type,
            price: listing.price,
          }
        : {
            address: "123 Main Street",
            bedrooms: 3,
            bathrooms: 2,
            sqft: 1800,
            year_built: 2000,
            property_type: "single_family",
          };

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
        throw new Error("Failed to generate document");
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
          listing_id: listing?.id || null,
          document_type: docType,
          state: selectedState,
          title: result.title,
          content: result.content,
          html_content: result.html,
        });
      }

      await fetchDocuments();

      // Navigate to viewer
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
    } catch (error) {
      Alert.alert("Error", "Failed to generate document. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  const handleView = (doc: Document) => {
    navigation.navigate("DocumentViewer", { document: doc });
  };

  const stateLabel =
    SUPPORTED_STATES.find((s) => s.value === selectedState)?.label ||
    selectedState;

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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Documents</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* State Selector */}
        <TouchableOpacity
          style={styles.stateSelector}
          onPress={() => setStatePickerOpen(!statePickerOpen)}
        >
          <Text style={styles.stateSelectorLabel}>State</Text>
          <View style={styles.stateSelectorValue}>
            <Text style={styles.stateSelectorText}>{stateLabel}</Text>
            <Text style={styles.chevron}>{statePickerOpen ? "▲" : "▼"}</Text>
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
          const isGenerating = generating === docType;

          return (
            <View key={docType} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>
                  {DOCUMENT_ICONS[docType]}
                </Text>
                <View style={styles.cardTitleArea}>
                  <Text style={styles.cardTitle}>
                    {DOCUMENT_TYPE_LABELS[docType]}
                  </Text>
                  <Text style={styles.cardDescription}>
                    {DOCUMENT_TYPE_DESCRIPTIONS[docType]}
                  </Text>
                </View>
              </View>

              {isGenerating ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.generatingText}>
                    Generating document...
                  </Text>
                </View>
              ) : existingDoc ? (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => handleView(existingDoc)}
                  >
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={() => handleGenerate(docType)}
                  >
                    <Text style={styles.regenerateButtonText}>
                      Regenerate
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() => handleGenerate(docType)}
                >
                  <Text style={styles.generateButtonText}>Generate</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  backButton: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "500",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  stateSelector: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 8,
  },
  stateSelectorLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stateSelectorValue: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stateSelectorText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  chevron: {
    fontSize: 12,
    color: "#6B7280",
  },
  stateDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    overflow: "hidden",
  },
  stateOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  stateOptionSelected: {
    backgroundColor: "#EFF6FF",
  },
  stateOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  stateOptionTextSelected: {
    color: "#2563EB",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 14,
    marginTop: 2,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  viewButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  regenerateButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#2563EB",
  },
  regenerateButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
  },
  generatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 10,
  },
  generatingText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "500",
  },
});
