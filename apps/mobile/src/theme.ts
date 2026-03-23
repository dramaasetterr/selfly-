// Chiavo brand palette — luxury cream/navy/gold
export const colors = {
  // Primary brand
  cream: '#F5F0E8',          // Primary background
  creamLight: '#FAF8F4',     // Card/section backgrounds
  navy: '#1C1C28',           // Headings, primary text
  navyLight: '#2D2D3D',      // Secondary surfaces

  // Gold accent
  gold: '#C4A265',           // Primary accent, CTAs
  goldLight: '#D4B87A',      // Hover states
  goldDark: '#A88B4A',       // Pressed states
  goldMuted: '#E8D5B0',      // Subtle borders, dividers
  goldBg: '#F9F3E8',         // Gold-tinted backgrounds

  // Legacy aliases (so existing screens don't break)
  primary: '#1C1C28',        // → navy
  primaryLight: '#C4A265',   // → gold
  primarySoft: '#F9F3E8',    // → goldBg
  accent: '#C4A265',         // → gold
  accentLight: '#E8D5B0',    // → goldMuted
  accentDark: '#A88B4A',     // → goldDark
  amber: '#C4A265',          // → gold
  amberLight: '#F9F3E8',     // → goldBg
  amberDark: '#A88B4A',      // → goldDark

  // Status
  success: '#2D7A4F',        // Muted forest green
  successLight: '#E6F4EC',
  warning: '#C4A265',        // Reuse gold
  error: '#B03A3A',          // Muted red
  errorLight: '#FAEAEA',
  errorDark: '#8A2C2C',

  // Neutrals
  white: '#FFFFFF',
  background: '#F5F0E8',     // Cream
  card: '#FFFFFF',
  border: '#E5E0D8',         // Warm gray
  borderLight: '#F0EBE3',

  // Text
  textPrimary: '#1C1C28',    // Navy
  textSecondary: '#5A5A6E',  // Medium gray
  textMuted: '#8E8E9F',      // Light gray
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#1C1C28',   // Navy text on gold buttons
};

export const shadows = {
  sm: {
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
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

export const fonts = {
  heading: 'PlayfairDisplay',       // Loaded via expo-font
  headingBold: 'PlayfairDisplay-Bold',
  body: 'System',                   // System sans-serif
};

export const typography = {
  hero: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5, fontFamily: fonts.headingBold },
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3, fontFamily: fonts.headingBold },
  h2: { fontSize: 22, fontWeight: '700' as const, fontFamily: fonts.heading },
  h3: { fontSize: 18, fontWeight: '600' as const, fontFamily: fonts.heading },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  captionBold: { fontSize: 14, fontWeight: '600' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  smallBold: { fontSize: 12, fontWeight: '600' as const },
};
