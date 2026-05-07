## Context

현재 `src/screens/SettingsScreen.tsx`는 800+ 라인으로, 11개 이상의 독립 기능(알람, 바다 관리, 가족방, 테마, 홈 위젯, AI 태그, 백업, 동기화 진단, 프라이버시, 후원, 앱 정보)이 한 컴포넌트에 들어 있다. 모든 상태(`alarms`, `pickerHour`, `nameModal*`, `isBackingUp`, `isRetagging`, `retagProgress`, `showDiagnostics` 등)와 모달이 공존해 변경 시 회귀 위험이 누적되고, 사용자에게도 길고 잡다한 한 화면으로 보인다.

라우팅은 `BottomTabNavigator`의 `Settings` 탭 → `SettingsScreen` 단일 매핑이고, 별도 Stack이 없다. 다른 탭(예: `Calendar`)은 `BottomTab → DetailScreen` 형태로 push 흐름이 있어 기존에도 Stack 사용 패턴은 존재한다.

## Goals / Non-Goals

**Goals:**
- `SettingsScreen`을 메뉴 허브로 축소하고, 기능별 디테일 스크린 11개로 분리.
- 공통 UI(`SettingsRow`, `SettingsSection`, `SettingsCard`)를 추출하여 디테일 스크린 간 일관성 확보.
- 단계별 점진 분리 (3+3+3+2)로 회귀 위험 통제.
- iOS/Android 공통으로 자연스러운 헤더/뒤로가기 동작.

**Non-Goals:**
- DAO/서비스 레이어 변경 (DB 마이그레이션 없음, 도메인 로직 그대로).
- 새 기능 추가 (모든 동작은 현재 SettingsScreen에 있는 것과 1:1 동치).
- 깊은 다국어/접근성 개선 (별도 작업으로 분리).
- 디자인 시스템 일신 (현재 theme/SPACING/FONT_SIZE 그대로 사용).

## Decisions

### 1. 네비게이션 구조: Tab → Stack → Screens

- **결정**: BottomTab의 "설정" 탭을 새 `SettingsStackNavigator`로 wrap. 허브가 root, 디테일은 `navigation.navigate('SettingsAlarm')` 형태로 push.
- **대안**: ① 모달 시트로 띄우기 — 깊이감/뒤로가기 불일치, 다중 모달 누적 위험. ② 한 스크린 내 토글 collapsible 섹션 — 코드 분리 효과 없음, 한 파일에 다 남음.
- **이유**: Stack은 RN 기본 패턴이고, 헤더 자동 처리, 뒤로가기 제스처 OS 표준 일치, 향후 deep link 확장 쉬움.

### 2. 공통 컴포넌트 우선 추출

- **결정**: 디테일 스크린 분리 **이전에** `src/components/settings/` 아래에 `SettingsRow`, `SettingsSection`, `SettingsCard` 작성. 각 디테일 스크린은 이 컴포넌트로 작성 시작.
- **대안**: 디테일 스크린 먼저 만들고 나중에 추출 — 11개 스크린마다 비슷한 스타일 중복 발생, 일관성 ↓.
- **이유**: 추출 비용은 1회, 사용은 11회. 미리 만드는 것이 ROI 우수.

### 3. 모달은 각 디테일 스크린 내부로 이동

- **결정**: 시간 피커(timePickerModal), 이름 변경(nameModal), 사진 액션(photoActionModal) 등을 해당 디테일 스크린 내부 state/JSX로 이전.
- **대안**: 글로벌 모달 컴포넌트화 (Provider 패턴) — 추상화 비용 큼, 1~2개 스크린만 사용하면 과설계.
- **이유**: 각 모달은 특정 기능의 부분이므로 같은 스크린 안에 두는 것이 응집도 ↑. 추후 Provider 필요해지면 그때 리팩터.

### 4. 단계별 분리 순서 (회귀 위험 기반)

1. **공통 컴포넌트 + 허브 skeleton** — 메뉴 목록만 만들고 각 항목은 기존 `SettingsScreen`로 임시 fallback 가능 구조 (점진 마이그레이션)
2. **복잡 3종**: Alarm / Backup / SyncDiagnostics — 비동기 흐름·SQL 직접 호출이 많아 회귀 위험 큰 영역 우선 분리
3. **데이터 관리 3종**: Children / Family / AiTag — 모달·외부 화면 연결 있음
4. **단순 5종**: Theme / HomeWidgets / Privacy / Support / About — UI 토글/정적 텍스트 위주

각 단계 완료 후 빌드 + 실기기 검증 → 문제 시 그 단계만 롤백 가능.

### 5. 헤더 타이틀 / 뒤로가기

- **결정**: 각 디테일 스크린은 `Stack.Screen options={{ title: '알람 설정' }}` 형태로 헤더 타이틀 명시. 뒤로가기는 OS 기본(왼쪽 화살표 + 스와이프 백).
- **대안**: 커스텀 헤더 컴포넌트 — 일관성 위해 굳이 만들 필요 없음. 기존 화면들도 기본 헤더 사용.
- **이유**: OS 표준 동작이 사용자에게 가장 친숙. 커스텀 헤더는 유지보수 비용만 늘어남.

## Risks / Trade-offs

- **회귀 위험: 백업/복원 비동기 흐름** — `isBackingUp`/`isRestoring` state가 디테일 스크린으로 이동하면 화면 전환 중 상태 유지가 끊길 수 있음 → **완화**: 백업/복원 중에는 navigation back 비활성화 또는 confirm 다이얼로그.
- **회귀 위험: AI 태그 재분석 진행률** — `retagProgress` state + `last_retag_at` 일일 제한 로직이 SettingsAiTagScreen으로 이동 → **완화**: 진행률은 화면 내부 state로 충분(중간 이탈 시 재시작 허용 정책 명시), 일일 제한은 DB에 저장되어 화면 전환과 무관.
- **회귀 위험: 동기화 진단 데이터 동기성** — `getSyncDiagnostics()` 호출 시점이 화면 진입 시 1회 → **완화**: pull-to-refresh 추가 또는 자동 refresh.
- **트레이드오프: 화면 진입 횟수 증가** — 사용자가 "알람 설정 → 백업 → 동기화 진단" 같이 여러 메뉴 순회 시 탭 횟수 증가 → **수용**: 본래 자주 순회할 흐름 아님(설정은 occasional). 메뉴 허브가 대시보드 역할로 핵심 정보는 보임.
- **트레이드오프: 코드 총량 약간 증가** — 11 스크린으로 분산되면서 각자의 import/styles 작성 → 공통 컴포넌트로 상쇄, 순 증가 100~200라인 예상.

## Migration Plan

1. `src/components/settings/` 디렉토리 생성, `SettingsRow`/`Section`/`Card` 작성. 단독 PR.
2. `SettingsStackNavigator` 생성 + BottomTab의 "설정" 탭 연결. 기존 `SettingsScreen`을 `SettingsHubScreen`으로 이름 변경 (라우팅에서 root). 단독 PR.
3. 디테일 스크린 3개씩 4번에 걸쳐 분리. 각 PR에서 분리한 섹션은 허브에서 메뉴 항목으로 교체.
4. 모든 디테일 분리 완료 후 기존 `SettingsScreen`에서 죽은 코드(이전된 state/모달/스타일) 일괄 삭제.

**롤백**: 단계마다 분리되어 있으므로 문제 발생 시 해당 PR만 revert. 데이터 변경 없음.

## Open Questions

- 후원/앱 정보가 분리할 만큼 길이가 있는지? 현재 짧다면 한 스크린에 합치는 것도 고려. (분리 작업 단계에서 라인 수 확인 후 결정 — 50라인 미만이면 합침 권장)
- 다크모드 토글이 `SettingsThemeScreen`으로 가면, 다른 모든 화면에서 즉시 반영되는지 확인 필요(현재 `useTheme` Context이므로 자동 반영될 것이나 검증 필요).
