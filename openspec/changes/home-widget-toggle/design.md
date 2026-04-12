## Context

홈화면은 현재 4개 섹션이 하드코딩으로 항상 표시된다: 텍스트 입력, 증상 추적, 진주 버튼(음성), 최근 기록 피드. 사용자마다 사용 패턴이 달라 선택적 표시 기능이 필요하다.

저장소 옵션:
- `@react-native-async-storage/async-storage` — 미설치, 새 의존성 추가 필요
- `expo-sqlite` — **이미 설치됨**, 프로젝트 전반에서 사용 중

## Goals / Non-Goals

**Goals:**
- 설정 탭에서 홈화면 4개 섹션 각각 on/off
- 앱 재시작 후에도 설정 유지
- 새 위젯 추가 시 상수 파일 한 줄만 추가로 확장 가능

**Non-Goals:**
- 섹션 순서 변경 (드래그 리오더)
- 아이별 개별 설정 (전체 앱 공통 설정)
- 원격 저장/동기화

## Decisions

**1. 저장소: SQLite `app_settings` 테이블 (신규 의존성 없음)**

`key TEXT PRIMARY KEY, value TEXT` 구조의 범용 key-value 테이블. AsyncStorage 대신 SQLite를 선택한 이유: 이미 설치된 의존성만 사용, DB 마이그레이션 패턴 통일.

**2. 위젯 키 상수 중앙 관리**

```ts
// src/constants/homeWidgets.ts
export const HOME_WIDGETS = {
  VOICE_INPUT:    'widget_voice_input',    // 진주 버튼 (기본 ON)
  TEXT_INPUT:     'widget_text_input',     // 텍스트 입력창
  EVENT_TRACKER:  'widget_event_tracker',  // 증상·상태 추적
  RECENT_RECORDS: 'widget_recent_records', // 최근 기록 피드
} as const;

export const HOME_WIDGET_DEFAULTS: Record<string, boolean> = {
  [HOME_WIDGETS.VOICE_INPUT]:    true,
  [HOME_WIDGETS.TEXT_INPUT]:     true,
  [HOME_WIDGETS.EVENT_TRACKER]:  true,
  [HOME_WIDGETS.RECENT_RECORDS]: true,
};
```

**3. 훅: `useHomeWidgetSettings()`**

```ts
useHomeWidgetSettings()
  → { settings: Record<string, boolean>, toggle(key: string): void, isLoaded: boolean }
```

- 앱 시작 시 DB에서 전체 설정 로드
- `toggle()`: 즉시 메모리 업데이트 → 비동기 DB 저장 (낙관적 업데이트)
- 기본값: `HOME_WIDGET_DEFAULTS` 참조, DB에 없는 키는 `true`
- `isLoaded = false` 구간엔 기본값(전부 true) 사용 → 깜빡임 없음

**4. HomeScreen 조건부 렌더링**

```tsx
{settings[HOME_WIDGETS.TEXT_INPUT]     && <View style={styles.inputBar}>...</View>}
{settings[HOME_WIDGETS.EVENT_TRACKER]  && <View style={styles.eventSection}>...</View>}
{settings[HOME_WIDGETS.VOICE_INPUT]    && <View style={styles.pearlCenter}>...</View>}
{settings[HOME_WIDGETS.RECENT_RECORDS] && <FlatList ... />}
```

## Risks / Trade-offs

- [DB 마이그레이션] app_settings 테이블 추가 → DB v16 bump, 기존 패턴 그대로
- [기본값] 기존 사용자는 모든 위젯 ON → 변화 없이 기존과 동일
- [음성 입력 OFF] 진주 버튼이 사라지면 녹음 불가 → UX상 사용자 선택이므로 허용. 설정 탭에서 다시 켤 수 있음
- [최근 기록 OFF + 빈 화면] 텍스트·음성·이벤트 모두 OFF 시 홈화면이 거의 비어 보일 수 있음 → 설정에서 제어하는 사용자의 의도적 선택으로 간주

## Open Questions

- 향후 추가될 홈화면 위젯 후보 → `HOME_WIDGETS` 상수에 추가만 하면 되는 구조
