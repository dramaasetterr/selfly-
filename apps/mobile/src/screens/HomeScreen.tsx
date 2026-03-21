import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, PipelineStage } from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

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
  const [currentStage, setCurrentStage] = useState<PipelineStage>("prep_your_home");
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("current_stage")
        .eq("id", user.id)
        .single();

      if (data?.current_stage) {
        setCurrentStage(data.current_stage as PipelineStage);
      }
      setLoadingProfile(false);
    };

    fetchProfile();
  }, [user]);

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

        <View style={styles.pipeline}>
          {PIPELINE_STAGES.map((stage, index) => {
            const state = getStageState(stage);
            const isLast = index === PIPELINE_STAGES.length - 1;
            return (
              <View key={stage} style={styles.stageRow}>
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
              </View>
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
});
