// Chiavo brand palette — luxury cream/navy/gold
export const colors = {
  // Primary gradient endpoints
  primary: '#1C1C28',        // Navy (was #1E3A5F)
  primaryLight: '#C4A265',   // Gold (was #2563EB)
  primarySoft: '#F9F3E8',    // Gold bg (was #EFF6FF)

  // Accent
  accent: '#C4A265',         // Gold (was #10B981)
  accentLight: '#E8D5B0',    // Gold muted (was #D1FAE5)
  accentDark: '#A88B4A',     // Gold dark (was #065F46)

  // Warm accents
  amber: '#C4A265',
  amberLight: '#F9F3E8',
  amberDark: '#A88B4A',

  // Status
  success: '#2D7A4F',
  warning: '#C4A265',
  error: '#B03A3A',
  errorLight: '#FAEAEA',
  errorDark: '#8A2C2C',

  // Neutrals
  white: '#FFFFFF',
  background: '#F7F0DD',     // Matches logo background exactly
  card: '#FFFFFF',
  border: '#E5E0D8',
  borderLight: '#F0EBE3',

  // Text
  textPrimary: '#1C1C28',
  textSecondary: '#5A5A6E',
  textMuted: '#8E8E9F',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#1C1C28',

  // New brand tokens (bonus, screens can use these too)
  cream: '#F7F0DD',
  creamLight: '#FAF6EF',
  navy: '#1C1C28',
  navyLight: '#2D2D3D',
  gold: '#C4A265',
  goldLight: '#D4B87A',
  goldDark: '#A88B4A',
  goldMuted: '#E8D5B0',
  goldBg: '#F9F3E8',
  successLight: '#E6F4EC',
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
