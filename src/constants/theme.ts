// 바다(vibediary) 디자인 토큰

export const DARK_COLORS = {
  primary: '#86A789',
  primaryLight: '#A1B7A3',
  primaryDark: '#6B8E70',
  secondary: '#E6EEE8',
  background: '#1F2420',
  surface: '#262A26',
  surfaceSecondary: '#3F443F',
  textPrimary: '#EBF3EC',
  textSecondary: '#D9E6DB',
  textTertiary: '#86A789',
  textOnPrimary: '#000000',
  accent: '#EAB308',
  accentLight: '#FDE68A',
  tagMedical: '#EF4444',
  tagMedication: '#86A789',
  tagBehavior: '#EAB308',
  tagDaily: '#22C55E',
  tagTherapy: '#A855F7',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#CA8A04',
  info: '#2563EB',
  border: '#535753',
  divider: '#3F443F',
  recordingRed: '#EF4444',
  recordingRedLight: '#FEE2E2',
  micBg: '#3F443F',
  micBorder: '#535753',
  micIcon: '#535753',
  micLabel: '#D9E6DB',
  tabBg: '#1F2420',
  tabBorder: '#262A26',
  tabInactive: '#717D73',
} as const;

export const LIGHT_COLORS = {
  primary: '#86A789',
  primaryLight: '#A1B7A3',
  primaryDark: '#6B8E70',
  secondary: '#EBF3EC',
  background: '#F1F6F2',
  surface: '#EBF3ED',
  surfaceSecondary: '#D9E6DB',
  textPrimary: '#1F2420',
  textSecondary: '#3F443F',
  textTertiary: '#717D73',
  textOnPrimary: '#FFFFFF',
  accent: '#CA8A04',
  accentLight: '#F59E0B',
  tagMedical: '#EF4444',
  tagMedication: '#86A789',
  tagBehavior: '#EAB308',
  tagDaily: '#22C55E',
  tagTherapy: '#A855F7',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#CA8A04',
  info: '#2563EB',
  border: '#DEE8DF',
  divider: '#EBF3EC',
  recordingRed: '#EF4444',
  recordingRedLight: '#FEE2E2',
  micBg: '#EBF3EC',
  micBorder: '#D9E6DB',
  micIcon: '#D9E6DB',
  micLabel: '#3F443F',
  tabBg: '#F1F6F2',
  tabBorder: '#EBF3ED',
  tabInactive: '#717D73',
} as const;

export interface AppColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  accent: string;
  accentLight: string;
  tagMedical: string;
  tagMedication: string;
  tagBehavior: string;
  tagDaily: string;
  tagTherapy: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  border: string;
  divider: string;
  recordingRed: string;
  recordingRedLight: string;
  micBg: string;
  micBorder: string;
  micIcon: string;
  micLabel: string;
  tabBg: string;
  tabBorder: string;
  tabInactive: string;
}

// 하위 호환용 (직접 import 하는 곳 있을 경우 대비)
export const COLORS = DARK_COLORS;

export const DARK_DENSITY_COLORS = [
  'transparent',
  '#2A312B',
  '#374038',
  '#4A5E4C',
  '#6B8E70',
] as const;

export const LIGHT_DENSITY_COLORS = [
  'transparent',
  '#D9E6DB',
  '#B8CEB9',
  '#A1B7A3',
  '#86A789',
] as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 56,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  extraLarge: 32,
  full: 999,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.25,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const TOUCH_TARGET = {
  min: 48,
  recordButton: 96,
  fab: 56,
} as const;

export const TYPOGRAPHY = {
  h1: {
    fontSize: FONT_SIZE.title,
    fontWeight: '700' as const,
    lineHeight: FONT_SIZE.title * 1.45,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600' as const,
    lineHeight: FONT_SIZE.xxl * 1.55,
    letterSpacing: -0.3,
  },
};
