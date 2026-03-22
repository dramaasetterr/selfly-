import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTierAccess, PLAN_LABELS } from "../hooks/useTierAccess";
import type { Feature } from "../hooks/useTierAccess";
import type { AppStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

interface TierGateProps {
  feature: Feature;
  children: React.ReactNode;
}

type NavProp = NativeStackNavigationProp<AppStackParamList>;

export default function TierGate({ feature, children }: TierGateProps) {
  const { loading, canAccess, requiredPlan } = useTierAccess();
  const navigation = useNavigation<NavProp>();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
      </View>
    );
  }

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  const needed = requiredPlan(feature);
  const label = PLAN_LABELS[needed];

  return (
    <View style={styles.centered}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>{"\u2190"} Back</Text>
      </TouchableOpacity>
      <View style={[styles.card, shadows.lg]}>
        <Text style={styles.lockIcon}>{"\uD83D\uDD12"}</Text>
        <Text style={styles.title}>Upgrade to {label}</Text>
        <Text style={styles.description}>
          This feature requires the {label} plan or higher.
        </Text>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Upgrade" as any)}
        >
          <Text style={styles.buttonText}>View Plans</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    position: "absolute",
    top: spacing.xxl + spacing.md,
    left: spacing.lg,
    paddingVertical: spacing.xs,
  },
  backText: {
    ...typography.bodyBold,
    color: colors.primaryLight,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.textOnPrimary,
  },
});
