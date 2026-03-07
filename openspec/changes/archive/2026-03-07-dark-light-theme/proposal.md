## Why

앱이 단일 다크 테마만 지원해 밝은 환경에서 가독성이 떨어진다. 라이트 모드(바다)와 다크 모드(밤바다)를 설정에서 전환할 수 있도록 한다.

## What Changes

- DARK_COLORS, LIGHT_COLORS 두 가지 색상 팔레트 정의
- AppColors 인터페이스로 타입 안전성 확보
- ThemeContext로 전역 테마 상태 관리 및 영속화
- 모든 화면/컴포넌트를 useTheme() 훅으로 동적 색상 적용
- 설정 화면에 테마 전환 UI 추가

## Capabilities

### New Capabilities
- `theme-switching`: 다크/라이트 모드 전환 및 설정 영속화

### Modified Capabilities

## Impact

- `src/constants/theme.ts`: DARK_COLORS, LIGHT_COLORS, AppColors, DARK_DENSITY_COLORS, LIGHT_DENSITY_COLORS
- `src/context/ThemeContext.tsx`: 신규 — ThemeProvider, useTheme
- `src/screens/SettingsScreen.tsx`: 테마 전환 UI
- 전체 화면/컴포넌트: useTheme() + useMemo 패턴 적용
- `App.tsx`: ThemeProvider 래핑
