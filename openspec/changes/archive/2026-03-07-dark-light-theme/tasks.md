## 1. 색상 상수 분리

- [x] 1.1 DARK_COLORS, LIGHT_COLORS 정의
- [x] 1.2 AppColors 인터페이스 추가
- [x] 1.3 DARK_DENSITY_COLORS, LIGHT_DENSITY_COLORS 분리

## 2. ThemeContext

- [x] 2.1 ThemeContext.tsx 생성: ThemeProvider, useTheme
- [x] 2.2 app_settings.json에서 테마 로드/저장
- [x] 2.3 App.tsx에 ThemeProvider 래핑

## 3. 전체 화면/컴포넌트 적용

- [x] 3.1 HomeScreen, RecordDetailScreen, RecordingScreen, SearchScreen, CalendarScreen, TagsScreen, STTReviewScreen: useTheme + useMemo 패턴
- [x] 3.2 RecordCard, TagChip, WaveLoader 컴포넌트 동적 색상 적용

## 4. 설정 화면 UI

- [x] 4.1 바다/밤바다 카드 UI 추가
- [x] 4.2 현재 선택된 테마에 테두리 표시

## 5. 검증

- [x] 5.1 테마 전환 후 전체 앱 색상 즉시 변경 확인
- [x] 5.2 앱 재시작 후 테마 유지 확인
