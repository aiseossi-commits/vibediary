## Why

홈화면에 섹션이 늘어나면서 사용자마다 필요한 구성이 달라졌다. 음성 위주 사용자에게는 텍스트 입력창이 불필요하고, 이벤트 추적을 안 쓰는 사용자에게는 해당 섹션이 노이즈다. 설정 탭에서 홈화면 구성을 직접 제어할 수 있어야 한다.

## What Changes

- 설정 화면에 "홈화면 구성" 섹션 추가 — 4개 홈 위젯의 on/off 토글 제공
- 토글 상태를 `app_settings` SQLite 테이블에 퍼시스트 (DB v16 마이그레이션)
- 홈화면은 저장된 설정을 읽어 해당 섹션만 렌더링

**토글 대상 위젯:**
| 위젯 | 기본값 | 설명 |
|------|--------|------|
| 음성 입력 (진주 버튼) | ON | 메인 녹음 버튼 |
| 텍스트 입력 | ON | 타이핑 입력창 + 전송 버튼 |
| 증상·상태 추적 | ON | 이벤트 트래커 섹션 |
| 최근 기록 | ON | 홈화면 기록 카드 피드 |

## Capabilities

### New Capabilities
- `home-widget-visibility`: 사용자가 홈화면 위젯별 표시 여부를 설정 탭에서 제어하는 기능. `app_settings` DB 테이블 + `useHomeWidgetSettings` 훅 + 설정 UI + 홈화면 조건부 렌더링 포함.

### Modified Capabilities
- `home-bottom-layout`: 홈화면 레이아웃이 위젯 표시 설정에 따라 조건부 렌더링됨

## Impact

- `src/db/schema.ts` + `src/db/database.ts` — `app_settings` 테이블 추가 (DB v16)
- `src/db/appSettingsDao.ts` — 신규: key-value 읽기/쓰기
- `src/constants/homeWidgets.ts` — 신규: `HOME_WIDGETS` 상수 (4개 키)
- `src/hooks/useHomeWidgetSettings.ts` — 신규: 설정 로드/토글 훅
- `src/screens/SettingsScreen.tsx` — "홈화면 구성" 섹션 추가
- `src/screens/HomeScreen.tsx` — 4개 위젯 조건부 렌더링
- 외부 의존성 없음 (기존 expo-sqlite 사용)
