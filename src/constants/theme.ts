// 바다(vibediary) 디자인 토큰
// "기록에 치이지 말고, 그냥 말하세요" — 따뜻한 종이 질감, 미니멀 힐링 UI

export const COLORS = {
  // Primary - 부드러운 민트 블루 (안정감)
  primary: '#A8DADC',
  primaryLight: '#D4F1F4',
  primaryDark: '#457B9D',

  // Secondary - 신뢰감을 주는 딥 블루
  secondary: '#457B9D',

  // Background - 따뜻한 아이보리
  background: '#F1FAEE',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F9FA',

  // Text - 가독성 높은 네이비 계열
  textPrimary: '#1D3557',
  textSecondary: '#457B9D',
  textTertiary: '#A0B8C8',
  textOnPrimary: '#FFFFFF',

  // Accent - 따뜻한 옐로우 포인트
  accent: '#E9C46A',
  accentLight: '#FFF3CD',

  // Tag Colors (캘린더 + 태그)
  tagMedical: '#EF5350',
  tagMedication: '#42A5F5',
  tagBehavior: '#FFA726',
  tagDaily: '#66BB6A',
  tagTherapy: '#AB47BC',

  // System
  error: '#E53935',
  success: '#43A047',
  warning: '#FB8C00',
  info: '#457B9D',

  // Border & Divider
  border: '#D4E8EC',
  divider: '#EAF4F4',

  // Recording - 소프트한 산호빛
  recordingRed: '#E76F51',
  recordingRedLight: '#FAD7CB',
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
  extraLarge: 32,
  full: 999,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;

// 녹음 버튼 최소 터치 영역 (한 손 조작 최적화)
export const TOUCH_TARGET = {
  min: 48,
  recordButton: 96, // 확장된 녹음 버튼
  fab: 56,
} as const;

// 제목 타이포그래피 (여백의 미)
export const TYPOGRAPHY = {
  h1: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.bold as const,
    lineHeight: FONT_SIZE.title * 1.45,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.semibold as const,
    lineHeight: FONT_SIZE.xxl * 1.55,
    letterSpacing: -0.3,
  },
} as const;
