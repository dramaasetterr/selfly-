import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../App";
import { colors, shadows, borderRadius, typography, spacing } from "../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

const FEATURES = [
  {
    icon: "\uD83D\uDCB0",
    title: "Save $20,000+",
    subtitle: "Average commission saved",
  },
  {
    icon: "\u2728",
    title: "AI-Powered",
    subtitle: "Smart pricing & documents",
  },
  {
    icon: "\u2705",
    title: "Step by Step",
    subtitle: "Guided from prep to close",
  },
];

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {/* Brand */}
        <View style={styles.brandSection}>
          <Text style={styles.brandName}>Chiavo</Text>
          <Text style={styles.tagline}>
            Sell Your Home.{"\n"}Save Thousands.
          </Text>
        </View>

        {/* Value Props */}
        <View style={styles.featuresSection}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.trustStatement}>
            Join thousands of homeowners selling smarter
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("SignUp")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>I'm Selling My Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("SignUp")}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>I'm Looking to Buy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.6}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              I already have an account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    paddingBottom: 48,
  },

  // Brand
  brandSection: {
    alignItems: "center",
  },
  brandName: {
    fontSize: 52,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -1.5,
  },
  tagline: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 26,
    fontWeight: "400",
  },

  // Features
  featuresSection: {
    gap: 20,
    paddingHorizontal: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  featureSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // CTA
  ctaSection: {
    alignItems: "center",
    gap: 16,
  },
  trustStatement: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    width: "100%",
    ...shadows.lg,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    width: "100%",
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  secondaryButtonText: {
    color: colors.primaryLight,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loginLink: {
    paddingVertical: 8,
  },
  loginLinkText: {
    ...typography.body,
    color: colors.primaryLight,
    fontWeight: "500",
  },
});
