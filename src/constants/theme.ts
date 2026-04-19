// 바다(vibediary) 디자인 토큰

export type PaletteKey = 'pearl';

export interface PaletteEntry {
  name: string;
  dark: AppColors;
  light: AppColors;
  darkDensity: readonly string[];
  lightDensity: readonly string[];
}

export const PALETTES: Record<PaletteKey, PaletteEntry> = {
  pearl: {
    name: '진주',
    dark: {
      primary: '#0EA5A0', primaryLight: '#2DD4CF', primaryDark: '#0D7A76',
      secondary: '#E0F7F6', background: '#0F1117', surface: '#1A1D24',
      surfaceSecondary: '#252932', textPrimary: '#F9FAFB', textSecondary: '#E5E7EB',
      textTertiary: '#9CA3AF', textOnPrimary: '#FFFFFF', accent: '#0EA5A0',
      accentLight: '#2DD4CF', tagMedical: '#EF4444', tagMedication: '#0EA5A0',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#2D3240', divider: '#252932', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#252932', micBorder: '#2D3240',
      micIcon: '#2D3240', micLabel: '#E5E7EB', tabBg: '#0F1117',
      tabBorder: '#1A1D24', tabInactive: '#6B7280',
    },
    light: {
      primary: '#0EA5A0', primaryLight: '#2DD4CF', primaryDark: '#0D7A76',
      secondary: '#E0F7F6', background: '#F9FAFB', surface: '#FFFFFF',
      surfaceSecondary: '#F3F4F6', textPrimary: '#111827', textSecondary: '#374151',
      textTertiary: '#6B7280', textOnPrimary: '#FFFFFF', accent: '#0EA5A0',
      accentLight: '#2DD4CF', tagMedical: '#EF4444', tagMedication: '#0EA5A0',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#E5E7EB', divider: '#F3F4F6', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#FFFFFF', micBorder: 'transparent',
      micIcon: '#A8C5C3', micLabel: '#374151', tabBg: '#F9FAFB',
      tabBorder: '#FFFFFF', tabInactive: '#9CA3AF',
    },
    darkDensity: ['transparent', '#1A2E2D', '#1A3F3D', '#0D7A76', '#0EA5A0'],
    lightDensity: ['transparent', '#D9EEEC', '#B8D8D6', '#8FBFBD', '#6BA5A2'],
  },
};

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
    fontFamily: 'Pretendard-Bold',
    lineHeight: FONT_SIZE.title * 1.45,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: 'Pretendard-SemiBold',
    lineHeight: FONT_SIZE.xxl * 1.55,
    letterSpacing: -0.3,
  },
};
