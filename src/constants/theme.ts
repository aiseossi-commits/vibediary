// 바다(vibediary) 디자인 토큰
// "기록에 치이지 말고, 그냥 말하세요" — 따뜻하고 편안한 감성 UI

export const COLORS = {
  // Primary - 바다를 연상시키는 따뜻한 블루 톤
  primary: '#5B9BD5',
  primaryLight: '#A8D1F0',
  primaryDark: '#3A7BBF',

  // Background
  background: '#FAFBFD',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F7FA',

  // Text
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C9B',
  textTertiary: '#B0BEC5',
  textOnPrimary: '#FFFFFF',

  // Accent - 따뜻한 톤
  accent: '#FF8A65',
  accentLight: '#FFCCBC',

  // Tag Colors (캘린더 + 태그)
  tagMedical: '#EF5350', // #의료 - 빨강
  tagMedication: '#42A5F5', // #투약 - 파랑
  tagBehavior: '#FFA726', // #행동 - 주황
  tagDaily: '#66BB6A', // #일상 - 초록
  tagTherapy: '#AB47BC', // #치료 - 보라

  // System
  error: '#E53935',
  success: '#43A047',
  warning: '#FB8C00',
  info: '#1E88E5',

  // Border & Divider
  border: '#E8ECF0',
  divider: '#F0F2F5',

  // Recording
  recordingRed: '#FF5252',
  recordingRedLight: '#FFCDD2',
} as const;

export const TAG_COLOR_MAP: Record<string, string> = {
  '#의료': COLORS.tagMedical,
  '#투약': COLORS.tagMedication,
  '#행동': COLORS.tagBehavior,
  '#일상': COLORS.tagDaily,
  '#치료': COLORS.tagTherapy,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
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
  full: 9999,
} as const;

export const SHADOW = {
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
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// 녹음 버튼 최소 터치 영역 (한 손 조작 최적화)
export const TOUCH_TARGET = {
  min: 48, // 최소 48dp (접근성 기준)
  recordButton: 72, // 녹음 버튼
  fab: 56, // FAB
} as const;
