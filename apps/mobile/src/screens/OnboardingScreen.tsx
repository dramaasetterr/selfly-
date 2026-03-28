import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../App";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Onboarding">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ONBOARDING_KEY = "hasSeenOnboarding";

interface OnboardingPage {
  icon: string;
  heading: string;
  title: string;
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    icon: "\uD83D\uDCB0",
    heading: "Save Thousands",
    title: "Keep Your Commission",
    description:
      "The average homeowner saves $15,000\u201325,000 by selling without an agent. Chiavi guides you through every step.",
  },
  {
    icon: "\u2728",
    heading: "AI-Powered Guidance",
    title: "Smart Tools, Real Results",
    description:
      "Get AI pricing analysis, auto-generated documents, offer analysis, and a personalized closing guide.",
  },
  {
    icon: "\uD83C\uDFE0",
    heading: "Buy or Sell",
    title: "Your Home, Your Way",
    description:
      "Whether you\u2019re selling your home or looking for your next one, Chiavi puts you in control.",
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < PAGES.length - 1) {
      scrollRef.current?.scrollTo({
        x: SCREEN_WIDTH * (activeIndex + 1),
        animated: true,
      });
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // Continue even if storage fails
    }
    navigation.replace("Welcome");
  };

  const isLastPage = activeIndex === PAGES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        {!isLastPage ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.6}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      {/* Swipeable pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.scrollView}
      >
        {PAGES.map((page, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.iconContainer}>
              <Text style={styles.pageIcon}>{page.icon}</Text>
            </View>
            <Text style={styles.pageHeading}>{page.heading}</Text>
            <Text style={styles.pageTitle}>{page.title}</Text>
            <Text style={styles.pageDescription}>{page.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom: dots + button */}
      <View style={styles.bottomSection}>
        <View style={styles.dotsRow}>
          {PAGES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={styles.ctaText}>
            {isLastPage ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  topBarSpacer: {
    flex: 1,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 60,
    alignItems: "flex-end",
  },
  skipText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "500",
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  // Page
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl + 8,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  pageIcon: {
    fontSize: 56,
  },
  pageHeading: {
    ...typography.small,
    color: colors.primaryLight,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  pageTitle: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  pageDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },

  // Bottom
  bottomSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.primaryLight,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.border,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    width: "100%",
    ...shadows.lg,
  },
  ctaText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
