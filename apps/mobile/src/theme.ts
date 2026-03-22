// Premium color palette
export const colors = {
  // Primary gradient endpoints
  primary: '#1E3A5F',      // Deep navy
  primaryLight: '#2563EB',  // Bright blue
  primarySoft: '#EFF6FF',   // Very light blue bg

  // Accent
  accent: '#10B981',        // Emerald green
  accentLight: '#D1FAE5',   // Light emerald bg
  accentDark: '#065F46',    // Dark emerald text

  // Warm accents
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  amberDark: '#92400E',

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#991B1B',

  // Neutrals
  white: '#FFFFFF',
  background: '#F8FAFC',    // Subtle cool gray bg
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Text
  textPrimary: '#0F172A',   // Near black
  textSecondary: '#475569',  // Medium gray
  textMuted: '#94A3B8',     // Light gray
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  hero: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  captionBold: { fontSize: 14, fontWeight: '600' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  smallBold: { fontSize: 12, fontWeight: '600' as const },
};
