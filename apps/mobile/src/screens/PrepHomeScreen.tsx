import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AppStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  colors,
  shadows,
  spacing,
  borderRadius,
  typography,
} from '../theme';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface PrepItem {
  id: string;
  emoji: string;
  title: string;
  tips: string[];
}

const PREP_ITEMS: PrepItem[] = [
  {
    id: 'declutter',
    emoji: '📦',
    title: 'Declutter & Depersonalize',
    tips: [
      'Remove personal photos and memorabilia from walls and shelves',
      'Clear kitchen countertops — leave only 1–2 decorative items',
      'Donate or store excess furniture to make rooms feel larger',
      'Empty out at least half of every closet to show storage space',
      'Pack away collections, trophies, and religious items',
    ],
  },
  {
    id: 'deep_clean',
    emoji: '✨',
    title: 'Deep Clean Everything',
    tips: [
      'Hire professional cleaners for a top-to-bottom deep clean',
      'Steam-clean carpets and polish hardwood floors',
      'Scrub tile grout in kitchens and bathrooms until bright white',
      'Wash all windows inside and out — sparkling glass makes a big impact',
      'Clean behind and under appliances',
    ],
  },
  {
    id: 'minor_repairs',
    emoji: '🔧',
    title: 'Make Minor Repairs',
    tips: [
      'Fix leaky faucets and running toilets',
      'Patch nail holes and small drywall dents',
      'Replace burned-out light bulbs — use the same colour temperature',
      'Tighten loose doorknobs and cabinet hardware',
      'Fix sticky doors, squeaky hinges, and broken blinds',
    ],
  },
  {
    id: 'fresh_paint',
    emoji: '🎨',
    title: 'Fresh Paint',
    tips: [
      'Paint main rooms in warm neutral tones (Agreeable Gray, Alabaster)',
      'Touch up scuffed trim, baseboards, and door frames',
      'Paint over any bold accent walls with a neutral colour',
      'Use semi-gloss on trim for a crisp, polished finish',
      'Don\'t forget the ceiling — a fresh coat of flat white opens up rooms',
    ],
  },
  {
    id: 'curb_appeal',
    emoji: '🏡',
    title: 'Boost Curb Appeal',
    tips: [
      'Mow, edge, and fertilize the lawn — green grass sells',
      'Trim hedges, prune overgrown bushes, and add fresh mulch',
      'Power wash the driveway, walkways, and siding',
      'Add a new doormat, house numbers, and a potted plant by the entry',
      'Paint or replace the front door for a strong first impression',
    ],
  },
  {
    id: 'staging',
    emoji: '🛋️',
    title: 'Stage Key Rooms',
    tips: [
      'Focus on the living room, kitchen, and master bedroom first',
      'Add fresh white towels and a plant to each bathroom',
      'Set the dining table with simple, elegant place settings',
      'Use throw pillows and a cozy blanket on the sofa',
      'Remove one piece of furniture per room to improve flow',
    ],
  },
  {
    id: 'lighting',
    emoji: '💡',
    title: 'Improve Lighting',
    tips: [
      'Open all blinds and curtains before every showing',
      'Add floor or table lamps to dark corners',
      'Clean all light fixtures and replace old, yellowed shades',
      'Switch to daylight (5000K) bulbs in bathrooms and kitchen',
      'Install dimmer switches in living areas for ambience',
    ],
  },
  {
    id: 'photos',
    emoji: '📸',
    title: 'Take Pre-Listing Photos',
    tips: [
      'Photograph every room only after cleaning and staging',
      'Shoot during the day using only natural light — no flash',
      'Use wide-angle shots from doorways to capture full rooms',
      'Include exterior shots at "golden hour" (sunrise/sunset)',
      'Capture lifestyle angles: a book on the patio table, coffee on the counter',
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ChecklistState = Record<string, boolean>;

export default function PrepHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user } = useAuth();

  const [checklist, setChecklist] = useState<ChecklistState>(() => {
    const init: ChecklistState = {};
    PREP_ITEMS.forEach((item) => (init[item.id] = false));
    return init;
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Derived
  const completedCount = useMemo(
    () => Object.values(checklist).filter(Boolean).length,
    [checklist],
  );
  const totalCount = PREP_ITEMS.length;
  const allDone = completedCount === totalCount;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  // ---- Supabase: load ----
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('home_prep_checklist')
          .select('items')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          Alert.alert("Error", "Failed to load checklist. Please try again.");
        } else if (data?.items) {
          setChecklist((prev) => ({ ...prev, ...(data.items as ChecklistState) }));
        }
      } catch (err) {
        Alert.alert("Error", "Failed to load checklist. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ---- Supabase: save ----
  const persist = useCallback(
    async (next: ChecklistState) => {
      if (!user) return;
      setSaving(true);
      try {
        await supabase.from('home_prep_checklist').upsert(
          { user_id: user.id, items: next },
          { onConflict: 'user_id' },
        );
      } catch (err) {
        Alert.alert("Error", "Failed to save checklist. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  // ---- Handlers ----
  const toggleItem = useCallback(
    (id: string) => {
      setChecklist((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggleExpand = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ---- Render ----

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ---- Back Button ---- */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Hero ---- */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroIcon}>🏠</Text>
          </View>
          <Text style={styles.heroTitle}>Let's Get Your Home{'\n'}Market-Ready</Text>
          <Text style={styles.heroSubtitle}>
            Complete these steps to maximize your sale price and sell faster.
            Homes that are well-prepared sell for up to 10% more!
          </Text>
        </View>

        {/* ---- Progress ---- */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Your Progress</Text>
            <Text style={styles.progressCount}>
              {completedCount}
              <Text style={styles.progressTotal}> / {totalCount}</Text>
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(progressPct * 100)}%` },
                allDone && styles.progressBarDone,
              ]}
            />
          </View>
          {allDone ? (
            <Text style={styles.progressHint}>
              🎉  Amazing — your home is ready to shine!
            </Text>
          ) : (
            <Text style={styles.progressHint}>
              {completedCount === 0
                ? 'Tap a card below to get started'
                : `${totalCount - completedCount} step${totalCount - completedCount > 1 ? 's' : ''} remaining — you're doing great!`}
            </Text>
          )}
        </View>

        {/* ---- Celebration ---- */}
        {allDone && (
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🎊</Text>
            <Text style={styles.celebrationTitle}>Home Prep Complete!</Text>
            <Text style={styles.celebrationBody}>
              You've tackled every step. Your home is positioned to impress
              buyers from the moment they walk in. Time to figure out the
              perfect asking price.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.celebrationButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate('Pricing')}
            >
              <Text style={styles.celebrationButtonText}>Continue to Pricing →</Text>
            </Pressable>
          </View>
        )}

        {/* ---- Checklist ---- */}
        {PREP_ITEMS.map((item) => {
          const checked = checklist[item.id] ?? false;
          const expanded = expandedId === item.id;

          return (
            <View
              key={item.id}
              style={[styles.card, checked && styles.cardChecked]}
            >
              {/* Card header row */}
              <Pressable
                style={styles.cardHeader}
                onPress={() => toggleExpand(item.id)}
              >
                {/* Checkbox */}
                <Pressable
                  style={[styles.checkbox, checked && styles.checkboxChecked]}
                  onPress={() => toggleItem(item.id)}
                  hitSlop={8}
                >
                  {checked && <Text style={styles.checkMark}>✓</Text>}
                </Pressable>

                {/* Icon + Title */}
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.cardTitle,
                    checked && styles.cardTitleChecked,
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                {/* Expand chevron */}
                <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
              </Pressable>

              {/* Expandable tips */}
              {expanded && (
                <View style={styles.tipsContainer}>
                  {item.tips.map((tip, idx) => (
                    <View key={idx} style={styles.tipRow}>
                      <View style={styles.tipBullet} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* ---- Bottom CTA ---- */}
        <View style={styles.bottomCta}>
          {!allDone && (
            <Text style={styles.bottomCtaHint}>
              You can move on any time — but completing the checklist gives you
              the best shot at top dollar.
            </Text>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Pricing')}
          >
            <Text style={styles.primaryButtonText}>
              I'm Ready — Let's Price It!
            </Text>
          </Pressable>
        </View>

        {/* Spacer for safe area */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Saving indicator */}
      {saving && (
        <View style={styles.savingBadge}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.savingText}>Saving…</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.sm,
    paddingBottom: spacing.xs,
  },
  backText: {
    ...typography.body,
    color: colors.primaryLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  // ---- Hero ----
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroIcon: {
    fontSize: 40,
  },
  heroTitle: {
    ...typography.hero,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 340,
    lineHeight: 22,
  },

  // ---- Progress ----
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressCount: {
    ...typography.h2,
    color: colors.primaryLight,
  },
  progressTotal: {
    ...typography.body,
    color: colors.textMuted,
  },
  progressBarBg: {
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  progressBarDone: {
    backgroundColor: colors.accent,
  },
  progressHint: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // ---- Celebration ----
  celebrationCard: {
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  celebrationTitle: {
    ...typography.h2,
    color: colors.accentDark,
    marginBottom: spacing.xs,
  },
  celebrationBody: {
    ...typography.body,
    color: colors.accentDark,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  celebrationButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  celebrationButtonText: {
    ...typography.bodyBold,
    color: colors.textOnAccent,
  },

  // ---- Card ----
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardChecked: {
    borderColor: colors.accentLight,
    backgroundColor: '#FAFFFE',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },

  // Checkbox
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginTop: -1,
  },

  cardEmoji: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  cardTitleChecked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  chevron: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },

  // Tips
  tipsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
    marginTop: 8,
    marginRight: spacing.sm,
  },
  tipText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // ---- Bottom CTA ----
  bottomCta: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  bottomCtaHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    maxWidth: 300,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    width: '100%',
    alignItems: 'center',
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: colors.textOnPrimary,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // ---- Saving badge ----
  savingBadge: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    ...shadows.lg,
  },
  savingText: {
    ...typography.small,
    color: colors.white,
    marginLeft: spacing.xs,
  },
});
