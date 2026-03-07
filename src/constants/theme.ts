// 바다(vibediary) 디자인 토큰

export const DARK_COLORS = {
  primary: '#A8DADC',
  primaryLight: '#1A4A5A',
  primaryDark: '#7BBFC2',
  secondary: '#EAEAEA',
  background: '#051622',
  surface: '#0A2337',
  surfaceSecondary: '#0D2B42',
  textPrimary: '#EAEAEA',
  textSecondary: '#A8C5DA',
  textTertiary: '#5A8AA8',
  textOnPrimary: '#051622',
  accent: '#E9C46A',
  accentLight: '#2A1F0A',
  tagMedical: '#EF5350',
  tagMedication: '#42A5F5',
  tagBehavior: '#FFA726',
  tagDaily: '#66BB6A',
  tagTherapy: '#AB47BC',
  error: '#EF5350',
  success: '#66BB6A',
  warning: '#FFA726',
  info: '#42A5F5',
  border: '#0F3252',
  divider: '#0A2840',
  recordingRed: '#E76F51',
  recordingRedLight: '#2A1510',
} as const;

export const LIGHT_COLORS = {
  primary: '#2980B9',
  primaryLight: '#D4EAF7',
  primaryDark: '#1A5F8A',
  secondary: '#1A4A6B',
  background: '#F0F7FF',
  surface: '#FFFFFF',
  surfaceSecondary: '#E8F3FA',
  textPrimary: '#1A2A3A',
  textSecondary: '#4A6A8A',
  textTertiary: '#8AAABB',
  textOnPrimary: '#FFFFFF',
  accent: '#E9C46A',
  accentLight: '#FDF3D8',
  tagMedical: '#E53935',
  tagMedication: '#1E88E5',
  tagBehavior: '#FB8C00',
  tagDaily: '#43A047',
  tagTherapy: '#8E24AA',
  error: '#E53935',
  success: '#43A047',
  warning: '#FB8C00',
  info: '#1E88E5',
  border: '#C5DFF0',
  divider: '#DDF0FA',
  recordingRed: '#E76F51',
  recordingRedLight: '#FDEAE4',
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
}

// 하위 호환용 (직접 import 하는 곳 있을 경우 대비)
export const COLORS = DARK_COLORS;

export const DARK_DENSITY_COLORS = [
  'transparent',
  '#0A2337',
  '#0F3252',
  '#1A4A75',
  '#2461A0',
] as const;

export const LIGHT_DENSITY_COLORS = [
  'transparent',
  '#E8F3FB',
  '#C5DFF0',
  '#8ABCD8',
  '#5499BE',
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
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
