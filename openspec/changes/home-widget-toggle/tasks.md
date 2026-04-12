## 1. DB 마이그레이션

- [x] 1.1 `src/db/schema.ts` — `CREATE_APP_SETTINGS_TABLE` 상수 추가 (`key TEXT PRIMARY KEY, value TEXT NOT NULL`)
- [x] 1.2 `src/db/database.ts` — v15→v16 마이그레이션 블록 추가 (`CREATE TABLE IF NOT EXISTS app_settings`)

## 2. 위젯 상수 및 DAO

- [x] 2.1 `src/constants/homeWidgets.ts` — `HOME_WIDGETS` 상수 4개 키 정의 (`VOICE_INPUT`, `TEXT_INPUT`, `EVENT_TRACKER`, `RECENT_RECORDS`) + `HOME_WIDGET_DEFAULTS` 전부 true
- [x] 2.2 `src/db/appSettingsDao.ts` — `getSetting(key): Promise<string | null>`, `setSetting(key, value): Promise<void>` 구현 (try-catch)
- [x] 2.3 `src/db/index.ts` — appSettingsDao export 추가

## 3. 훅

- [x] 3.1 `src/hooks/useHomeWidgetSettings.ts` — `useHomeWidgetSettings()` 훅 구현
  - `isLoaded` 상태 포함 (로드 전엔 기본값 true 사용)
  - DB에서 HOME_WIDGETS 키 전체 읽어 `settings` 상태 초기화
  - `toggle(key)`: 낙관적 메모리 업데이트 → 비동기 `setSetting` 호출

## 4. 설정 화면 UI

- [x] 4.1 `src/screens/SettingsScreen.tsx` — `useHomeWidgetSettings()` import
- [x] 4.2 `src/screens/SettingsScreen.tsx` — "홈화면 구성" 섹션 추가: 4개 항목 각각 Switch + 라벨 (음성 입력·텍스트 입력·증상 추적·최근 기록)
- [x] 4.3 스타일: `theme.ts`의 SPACING, FONT_SIZE, colors 사용, 하드코딩 금지

## 5. 홈화면 조건부 렌더링

- [x] 5.1 `src/screens/HomeScreen.tsx` — `useHomeWidgetSettings()` import
- [x] 5.2 `src/screens/HomeScreen.tsx` — 텍스트 입력 바 (`inputBar`)를 `settings[HOME_WIDGETS.TEXT_INPUT]` 조건으로 감싸기
- [x] 5.3 `src/screens/HomeScreen.tsx` — 이벤트 섹션 (`eventSection`)을 `settings[HOME_WIDGETS.EVENT_TRACKER]` 조건으로 감싸기
- [x] 5.4 `src/screens/HomeScreen.tsx` — 진주 버튼 (`pearlCenter`)을 `settings[HOME_WIDGETS.VOICE_INPUT]` 조건으로 감싸기
- [x] 5.5 `src/screens/HomeScreen.tsx` — 최근 기록 FlatList를 `settings[HOME_WIDGETS.RECENT_RECORDS]` 조건으로 감싸기 (빈 상태 뷰도 함께)

## 6. 검증

- [x] 6.1 `npx tsc --noEmit` 타입 에러 없음 확인
- [ ] 6.2 실기기에서 각 토글 OFF → 해당 섹션 즉시 사라짐 확인
- [ ] 6.3 앱 재시작 후 설정 유지 확인
