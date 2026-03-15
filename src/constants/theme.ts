// 바다(vibediary) 디자인 토큰

export const DARK_COLORS = {
  primary: '#60A5FA',
  primaryLight: '#1C3353',
  primaryDark: '#3B82F6',
  secondary: '#F1F5F9',
  background: '#070D1A',
  surface: '#111827',
  surfaceSecondary: '#1A2535',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textOnPrimary: '#070D1A',
  accent: '#FCD34D',
  accentLight: '#1C1A08',
  tagMedical: '#F87171',
  tagMedication: '#60A5FA',
  tagBehavior: '#FBBF24',
  tagDaily: '#4ADE80',
  tagTherapy: '#C084FC',
  error: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  info: '#60A5FA',
  border: '#1E3352',
  divider: '#0F1E35',
  recordingRed: '#F87171',
  recordingRedLight: '#1C1020',
  micBg: '#1E293B',
  micBorder: '#334155',
  micIcon: '#94A3B8',
  micLabel: '#94A3B8',
  tabBg: '#070D1A',
  tabBorder: '#0F1E35',
  tabInactive: '#475569',
} as const;

export const LIGHT_COLORS = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',
  secondary: '#111827',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  textOnPrimary: '#FFFFFF',
  accent: '#F59E0B',
  accentLight: '#FEF3C7',
  tagMedical: '#EF4444',
  tagMedication: '#2563EB',
  tagBehavior: '#F59E0B',
  tagDaily: '#16A34A',
  tagTherapy: '#9333EA',
  error: '#EF4444',
  success: '#16A34A',
  warning: '#F59E0B',
  info: '#2563EB',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  recordingRed: '#EF4444',
  recordingRedLight: '#FEF2F2',
  micBg: '#EFF6FF',
  micBorder: '#BFDBFE',
  micIcon: '#BFDBFE',
  micLabel: '#4B5563',
  tabBg: '#FFFFFF',
  tabBorder: '#E5E7EB',
  tabInactive: '#6B7280',
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
  '#0F1E35',
  '#1C3353',
  '#1E5190',
  '#2563EB',
] as const;

export const LIGHT_DENSITY_COLORS = [
  'transparent',
  '#DBEAFE',
  '#BFDBFE',
  '#93C5FD',
  '#3B82F6',
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
