import React, { useCallback, useEffect, useState } from "react";
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
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, PipelineStage } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";

function StageIcon({ state }: { state: "complete" | "current" | "locked" }) {
  if (state === "complete") {
    return (
      <View style={[styles.circle, styles.circleComplete]}>
        <Text style={styles.checkmark}>✓</Text>
      </View>
    );
  }
  if (state === "current") {
    return (
      <View style={[styles.circle, styles.circleCurrent]}>
        <View style={styles.currentDot} />
      </View>
    );
  }
  return (
    <View style={[styles.circle, styles.circleLocked]}>
      <Text style={styles.lockIcon}>🔒</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [currentStage, setCurrentStage] = useState<PipelineStage>("prep_your_home");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("current_stage")
      .eq("id", user.id)
      .single();

    if (data?.current_stage) {
      setCurrentStage(data.current_stage as PipelineStage);
    }
    setLoadingProfile(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Refresh profile when screen regains focus (e.g. after confirming price)
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleStageTap = (stage: PipelineStage) => {
    const state = getStageState(stage);
    if (state === "locked") return;
    if (stage === "price_it") {
      navigation.navigate("Pricing");
    }
    if (stage === "create_listing") {
      navigation.navigate("ListingBuilder");
    }
  };

  const getStageState = (stage: PipelineStage): "complete" | "current" | "locked" => {
    const currentIndex = PIPELINE_STAGES.indexOf(currentStage);
    const stageIndex = PIPELINE_STAGES.indexOf(stage);
    if (stageIndex < currentIndex) return "complete";
    if (stageIndex === currentIndex) return "current";
    return "locked";
  };

  if (loadingProfile) {
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
          <View>
            <Text style={styles.greeting}>Your Selling Journey</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.documentsButton}
          onPress={() => navigation.navigate("Documents")}
        >
          <Text style={styles.documentsButtonIcon}>{"\u{1F4C4}"}</Text>
          <View style={styles.documentsButtonContent}>
            <Text style={styles.documentsButtonTitle}>Documents</Text>
            <Text style={styles.documentsButtonSub}>
              Generate disclosures, agreements & more
            </Text>
          </View>
          <Text style={styles.documentsChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.pipeline}>
          {PIPELINE_STAGES.map((stage, index) => {
            const state = getStageState(stage);
            const isLast = index === PIPELINE_STAGES.length - 1;
            return (
              <TouchableOpacity
                key={stage}
                style={styles.stageRow}
                onPress={() => handleStageTap(stage)}
                activeOpacity={state === "locked" ? 1 : 0.6}
              >
                <View style={styles.stageIndicator}>
                  <StageIcon state={state} />
                  {!isLast && (
                    <View
                      style={[
                        styles.connector,
                        state === "complete"
                          ? styles.connectorComplete
                          : styles.connectorDefault,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.stageContent}>
                  <Text
                    style={[
                      styles.stageLabel,
                      state === "current" && styles.stageLabelCurrent,
                      state === "locked" && styles.stageLabelLocked,
                    ]}
                  >
                    {PIPELINE_STAGE_LABELS[stage]}
                  </Text>
                  {state === "current" && (
                    <Text style={styles.stageHint}>In progress</Text>
                  )}
                  {state === "complete" && (
                    <Text style={styles.stageComplete}>Complete</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
    alignItems: "flex-start",
    marginBottom: 36,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },
  email: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  signOutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  pipeline: {
    paddingLeft: 4,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stageIndicator: {
    alignItems: "center",
    width: 40,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  circleComplete: {
    backgroundColor: "#2563EB",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  circleCurrent: {
    borderWidth: 2.5,
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  currentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },
  circleLocked: {
    backgroundColor: "#F3F4F6",
  },
  lockIcon: {
    fontSize: 14,
  },
  connector: {
    width: 2.5,
    height: 40,
  },
  connectorComplete: {
    backgroundColor: "#2563EB",
  },
  connectorDefault: {
    backgroundColor: "#E5E7EB",
  },
  stageContent: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 40,
    justifyContent: "center",
    minHeight: 36,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  stageLabelCurrent: {
    color: "#2563EB",
  },
  stageLabelLocked: {
    color: "#9CA3AF",
  },
  stageHint: {
    fontSize: 13,
    color: "#2563EB",
    marginTop: 2,
  },
  stageComplete: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  documentsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 28,
  },
  documentsButtonIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  documentsButtonContent: {
    flex: 1,
  },
  documentsButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  documentsButtonSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  documentsChevron: {
    fontSize: 22,
    color: "#9CA3AF",
    fontWeight: "300",
  },
});
