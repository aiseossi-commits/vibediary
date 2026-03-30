// 바다(vibediary) 디자인 토큰

export type PaletteKey = 'sage' | 'emerald' | 'gold' | 'amber' | 'calmBlue' | 'deepOcean' | 'clearSky' | 'slateNavy';

export interface PaletteEntry {
  name: string;
  dark: AppColors;
  light: AppColors;
  darkDensity: readonly string[];
  lightDensity: readonly string[];
}

export const PALETTES: Record<PaletteKey, PaletteEntry> = {
  sage: {
    name: '세이지 그린',
    dark: {
      primary: '#86A789', primaryLight: '#A1B7A3', primaryDark: '#6B8E70',
      secondary: '#E6EEE8', background: '#1F2420', surface: '#262A26',
      surfaceSecondary: '#3F443F', textPrimary: '#EBF3EC', textSecondary: '#D9E6DB',
      textTertiary: '#86A789', textOnPrimary: '#000000', accent: '#EAB308',
      accentLight: '#FDE68A', tagMedical: '#EF4444', tagMedication: '#86A789',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#535753', divider: '#3F443F', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#3F443F', micBorder: '#535753',
      micIcon: '#535753', micLabel: '#D9E6DB', tabBg: '#1F2420',
      tabBorder: '#262A26', tabInactive: '#717D73',
    },
    light: {
      primary: '#86A789', primaryLight: '#A1B7A3', primaryDark: '#6B8E70',
      secondary: '#EBF3EC', background: '#F1F6F2', surface: '#EBF3ED',
      surfaceSecondary: '#D9E6DB', textPrimary: '#1F2420', textSecondary: '#3F443F',
      textTertiary: '#717D73', textOnPrimary: '#FFFFFF', accent: '#CA8A04',
      accentLight: '#F59E0B', tagMedical: '#EF4444', tagMedication: '#86A789',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#DEE8DF', divider: '#EBF3EC', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#EBF3EC', micBorder: '#D9E6DB',
      micIcon: '#D9E6DB', micLabel: '#3F443F', tabBg: '#F1F6F2',
      tabBorder: '#EBF3ED', tabInactive: '#717D73',
    },
    darkDensity: ['transparent', '#2A312B', '#374038', '#4A5E4C', '#6B8E70'],
    lightDensity: ['transparent', '#D9E6DB', '#B8CEB9', '#A1B7A3', '#86A789'],
  },
  emerald: {
    name: '에메랄드',
    dark: {
      primary: '#10B981', primaryLight: '#34D399', primaryDark: '#059669',
      secondary: '#ECFDF5', background: '#121A16', surface: '#1A2320',
      surfaceSecondary: '#29332E', textPrimary: '#F0FDF8', textSecondary: '#D1FAE5',
      textTertiary: '#10B981', textOnPrimary: '#000000', accent: '#F97316',
      accentLight: '#FB923C', tagMedical: '#EF4444', tagMedication: '#10B981',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#3D4844', divider: '#29332E', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#29332E', micBorder: '#3D4844',
      micIcon: '#3D4844', micLabel: '#D1FAE5', tabBg: '#121A16',
      tabBorder: '#1A2320', tabInactive: '#647A71',
    },
    light: {
      primary: '#10B981', primaryLight: '#34D399', primaryDark: '#059669',
      secondary: '#F0FDF8', background: '#ECFDF5', surface: '#E0FAEE',
      surfaceSecondary: '#D1FAE5', textPrimary: '#121A16', textSecondary: '#29332E',
      textTertiary: '#4F665C', textOnPrimary: '#FFFFFF', accent: '#EA580C',
      accentLight: '#F97316', tagMedical: '#EF4444', tagMedication: '#10B981',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#C6EFDC', divider: '#F0FDF8', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#F0FDF8', micBorder: '#D1FAE5',
      micIcon: '#D1FAE5', micLabel: '#29332E', tabBg: '#ECFDF5',
      tabBorder: '#E0FAEE', tabInactive: '#4F665C',
    },
    darkDensity: ['transparent', '#1A2E24', '#1E4030', '#155E3A', '#059669'],
    lightDensity: ['transparent', '#D1FAE5', '#6EE7B7', '#34D399', '#10B981'],
  },
  gold: {
    name: '골드',
    dark: {
      primary: '#FBBF24', primaryLight: '#FDE68A', primaryDark: '#F59E0B',
      secondary: '#FFFBEB', background: '#1F1E1B', surface: '#292824',
      surfaceSecondary: '#44423C', textPrimary: '#FEFBDC', textSecondary: '#FDF7B8',
      textTertiary: '#FBBF24', textOnPrimary: '#000000', accent: '#059669',
      accentLight: '#34D399', tagMedical: '#EF4444', tagMedication: '#FBBF24',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#57554E', divider: '#44423C', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#44423C', micBorder: '#57554E',
      micIcon: '#57554E', micLabel: '#FDF7B8', tabBg: '#1F1E1B',
      tabBorder: '#292824', tabInactive: '#A8A69E',
    },
    light: {
      primary: '#FBBF24', primaryLight: '#FDE68A', primaryDark: '#F59E0B',
      secondary: '#FEFBDC', background: '#FFFEE0', surface: '#FEFBED',
      surfaceSecondary: '#FDF7B8', textPrimary: '#1F1E1B', textSecondary: '#44423C',
      textTertiary: '#78756C', textOnPrimary: '#FFFFFF', accent: '#065F46',
      accentLight: '#10B981', tagMedical: '#EF4444', tagMedication: '#FBBF24',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#F9F1D3', divider: '#FEFBDC', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#FEFBDC', micBorder: '#FDF7B8',
      micIcon: '#FDF7B8', micLabel: '#44423C', tabBg: '#FFFEE0',
      tabBorder: '#FEFBED', tabInactive: '#78756C',
    },
    darkDensity: ['transparent', '#2E2C26', '#3E3B32', '#5A5540', '#F59E0B'],
    lightDensity: ['transparent', '#FDF7B8', '#FDE68A', '#FCD34D', '#FBBF24'],
  },
  amber: {
    name: '앰버',
    dark: {
      primary: '#F59E0B', primaryLight: '#FBBF24', primaryDark: '#D97706',
      secondary: '#FFFBEB', background: '#1F1F1E', surface: '#292524',
      surfaceSecondary: '#44403C', textPrimary: '#FEF3C7', textSecondary: '#FDE68A',
      textTertiary: '#FBBF24', textOnPrimary: '#000000', accent: '#0D9488',
      accentLight: '#5EEAD4', tagMedical: '#EF4444', tagMedication: '#F59E0B',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#57534E', divider: '#44403C', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#44403C', micBorder: '#57534E',
      micIcon: '#57534E', micLabel: '#FDE68A', tabBg: '#1F1F1E',
      tabBorder: '#292524', tabInactive: '#A8A29E',
    },
    light: {
      primary: '#F59E0B', primaryLight: '#FBBF24', primaryDark: '#D97706',
      secondary: '#FEF3C7', background: '#FFFBEB', surface: '#FFF7ED',
      surfaceSecondary: '#FDE68A', textPrimary: '#1F1F1E', textSecondary: '#44403C',
      textTertiary: '#78716C', textOnPrimary: '#FFFFFF', accent: '#0F766E',
      accentLight: '#2DD4BF', tagMedical: '#EF4444', tagMedication: '#F59E0B',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#F6E0B3', divider: '#FEF3C7', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#FEF3C7', micBorder: '#FDE68A',
      micIcon: '#FDE68A', micLabel: '#44403C', tabBg: '#FFFBEB',
      tabBorder: '#FFF7ED', tabInactive: '#78716C',
    },
    darkDensity: ['transparent', '#2E2B27', '#3D3830', '#57503A', '#D97706'],
    lightDensity: ['transparent', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'],
  },
  calmBlue: {
    name: '칼름 블루',
    dark: {
      primary: '#6B8EAC', primaryLight: '#A1B7CB', primaryDark: '#4F667D',
      secondary: '#E6EEEB', background: '#1F2422', surface: '#262A28',
      surfaceSecondary: '#3F4442', textPrimary: '#EBF3EF', textSecondary: '#D9E6E1',
      textTertiary: '#6B8EAC', textOnPrimary: '#000000', accent: '#EAB308',
      accentLight: '#FDE68A', tagMedical: '#EF4444', tagMedication: '#6B8EAC',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#535755', divider: '#3F4442', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#3F4442', micBorder: '#535755',
      micIcon: '#535755', micLabel: '#D9E6E1', tabBg: '#1F2422',
      tabBorder: '#262A28', tabInactive: '#717D77',
    },
    light: {
      primary: '#6B8EAC', primaryLight: '#A1B7CB', primaryDark: '#4F667D',
      secondary: '#EBF3EF', background: '#F1F6F4', surface: '#EBF3EF',
      surfaceSecondary: '#D9E6E1', textPrimary: '#1F2422', textSecondary: '#3F4442',
      textTertiary: '#717D77', textOnPrimary: '#FFFFFF', accent: '#CA8A04',
      accentLight: '#F59E0B', tagMedical: '#EF4444', tagMedication: '#6B8EAC',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#DEE8E3', divider: '#EBF3EF', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#EBF3EF', micBorder: '#D9E6E1',
      micIcon: '#D9E6E1', micLabel: '#3F4442', tabBg: '#F1F6F4',
      tabBorder: '#EBF3EF', tabInactive: '#717D77',
    },
    darkDensity: ['transparent', '#2A302E', '#364040', '#4A5E6A', '#4F667D'],
    lightDensity: ['transparent', '#D9E6E1', '#B8CEC8', '#A1B7CB', '#6B8EAC'],
  },
  deepOcean: {
    name: '딥 오션',
    dark: {
      primary: '#1A7A9E', primaryLight: '#4BA8C4', primaryDark: '#0F5870',
      secondary: '#E1EEF5', background: '#111E24', surface: '#192730',
      surfaceSecondary: '#243842', textPrimary: '#E8F4F9', textSecondary: '#C5DFE9',
      textTertiary: '#4BA8C4', textOnPrimary: '#FFFFFF', accent: '#EAB308',
      accentLight: '#FDE68A', tagMedical: '#EF4444', tagMedication: '#1A7A9E',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#2E4552', divider: '#243842', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#243842', micBorder: '#2E4552',
      micIcon: '#2E4552', micLabel: '#C5DFE9', tabBg: '#111E24',
      tabBorder: '#192730', tabInactive: '#4A6675',
    },
    light: {
      primary: '#1A7A9E', primaryLight: '#4BA8C4', primaryDark: '#0F5870',
      secondary: '#DDF0F7', background: '#EBF5FA', surface: '#DDF0F7',
      surfaceSecondary: '#C5E5F0', textPrimary: '#111E24', textSecondary: '#243842',
      textTertiary: '#4A6675', textOnPrimary: '#FFFFFF', accent: '#CA8A04',
      accentLight: '#F59E0B', tagMedical: '#EF4444', tagMedication: '#1A7A9E',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#B3D9E9', divider: '#DDF0F7', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#DDF0F7', micBorder: '#C5E5F0',
      micIcon: '#C5E5F0', micLabel: '#243842', tabBg: '#EBF5FA',
      tabBorder: '#DDF0F7', tabInactive: '#4A6675',
    },
    darkDensity: ['transparent', '#192F3B', '#1A3E50', '#105870', '#0F5870'],
    lightDensity: ['transparent', '#C5E5F0', '#8DCCDF', '#4BA8C4', '#1A7A9E'],
  },
  clearSky: {
    name: '맑은 하늘',
    dark: {
      primary: '#4B9FD5', primaryLight: '#7ABDE5', primaryDark: '#2B7EB0',
      secondary: '#E1EEF8', background: '#131B22', surface: '#1A2530',
      surfaceSecondary: '#263543', textPrimary: '#EAF2F9', textSecondary: '#C8DEF0',
      textTertiary: '#7ABDE5', textOnPrimary: '#000000', accent: '#EAB308',
      accentLight: '#FDE68A', tagMedical: '#EF4444', tagMedication: '#4B9FD5',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#344A5C', divider: '#263543', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#263543', micBorder: '#344A5C',
      micIcon: '#344A5C', micLabel: '#C8DEF0', tabBg: '#131B22',
      tabBorder: '#1A2530', tabInactive: '#4A6980',
    },
    light: {
      primary: '#4B9FD5', primaryLight: '#7ABDE5', primaryDark: '#2B7EB0',
      secondary: '#E1EFF8', background: '#EFF6FC', surface: '#E1EFF8',
      surfaceSecondary: '#C8DEF0', textPrimary: '#131B22', textSecondary: '#263543',
      textTertiary: '#4A6980', textOnPrimary: '#FFFFFF', accent: '#CA8A04',
      accentLight: '#F59E0B', tagMedical: '#EF4444', tagMedication: '#4B9FD5',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#B0D3EB', divider: '#E1EFF8', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#E1EFF8', micBorder: '#C8DEF0',
      micIcon: '#C8DEF0', micLabel: '#263543', tabBg: '#EFF6FC',
      tabBorder: '#E1EFF8', tabInactive: '#4A6980',
    },
    darkDensity: ['transparent', '#1B2E3C', '#1E3F53', '#2B7EB0', '#2B7EB0'],
    lightDensity: ['transparent', '#C8DEF0', '#93C3E2', '#7ABDE5', '#4B9FD5'],
  },
  slateNavy: {
    name: '슬레이트 네이비',
    dark: {
      primary: '#3D5A7A', primaryLight: '#6685A4', primaryDark: '#2A3F57',
      secondary: '#E0E6EF', background: '#141922', surface: '#1C2330',
      surfaceSecondary: '#28334A', textPrimary: '#E8ECF5', textSecondary: '#C5CEDE',
      textTertiary: '#6685A4', textOnPrimary: '#FFFFFF', accent: '#EAB308',
      accentLight: '#FDE68A', tagMedical: '#EF4444', tagMedication: '#3D5A7A',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#36425A', divider: '#28334A', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#28334A', micBorder: '#36425A',
      micIcon: '#36425A', micLabel: '#C5CEDE', tabBg: '#141922',
      tabBorder: '#1C2330', tabInactive: '#56697F',
    },
    light: {
      primary: '#3D5A7A', primaryLight: '#6685A4', primaryDark: '#2A3F57',
      secondary: '#E0E6EF', background: '#EDF0F5', surface: '#E0E6EF',
      surfaceSecondary: '#C5CEDE', textPrimary: '#141922', textSecondary: '#28334A',
      textTertiary: '#56697F', textOnPrimary: '#FFFFFF', accent: '#CA8A04',
      accentLight: '#F59E0B', tagMedical: '#EF4444', tagMedication: '#3D5A7A',
      tagBehavior: '#EAB308', tagDaily: '#22C55E', tagTherapy: '#A855F7',
      error: '#DC2626', success: '#16A34A', warning: '#CA8A04', info: '#2563EB',
      border: '#B0BFCF', divider: '#E0E6EF', recordingRed: '#EF4444',
      recordingRedLight: '#FEE2E2', micBg: '#E0E6EF', micBorder: '#C5CEDE',
      micIcon: '#C5CEDE', micLabel: '#28334A', tabBg: '#EDF0F5',
      tabBorder: '#1C2330', tabInactive: '#56697F',
    },
    darkDensity: ['transparent', '#1D2B3A', '#253347', '#2A3F57', '#2A3F57'],
    lightDensity: ['transparent', '#C5CEDE', '#9BACC0', '#6685A4', '#3D5A7A'],
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
