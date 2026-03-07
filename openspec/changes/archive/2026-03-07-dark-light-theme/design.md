## Context

기존에는 정적 COLORS 상수를 직접 import해 사용했다. 동적 테마를 위해 Context 패턴 도입.

## Goals / Non-Goals

**Goals:**
- 다크/라이트 모드 전환
- 설정 영속화

**Non-Goals:**
- 시스템 테마 자동 감지
- 커스텀 색상 설정

## Decisions

### Decision 1: ThemeContext + useTheme 패턴

React Context로 colors, densityColors, isDark, setTheme을 전역 제공. 각 화면은 useMemo(() => createStyles(colors), [colors])로 스타일 재계산.

### Decision 2: AppColors 인터페이스

typeof DARK_COLORS는 리터럴 타입 충돌을 유발. string 기반 AppColors 인터페이스로 통일.

### Decision 3: app_settings.json에 theme 저장

expo-file-system/legacy로 documentDirectory의 app_settings.json에 { theme: 'dark' | 'light' } 저장.
