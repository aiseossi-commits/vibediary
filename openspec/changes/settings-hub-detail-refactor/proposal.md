## Why

`SettingsScreen.tsx`가 800+ 라인으로 비대해져 유지보수가 어렵고, 한 화면에 11개 이상의 서로 무관한 기능(알람·바다·가족·테마·홈위젯·태그·백업·동기화·프라이버시·후원·앱정보)이 섞여 있어 사용자 가독성도 떨어진다. 새 기능 추가/수정 시 회귀 위험이 누적되고, 모달·상태가 한 컴포넌트에 집중되어 책임 분리가 약하다.

## What Changes

- `SettingsScreen`을 **메뉴 허브** 역할로 축소 (메뉴 목록만 표시, 각 항목 탭 시 상세 화면으로 이동)
- 11개 디테일 스크린 신설:
  - `SettingsAlarmScreen` (알람 추가/삭제/토글/배터리 최적화 안내)
  - `SettingsChildrenScreen` (바다 추가/이름변경/삭제/활성 전환)
  - `SettingsFamilyScreen` (가족방 만들기/참여/공유 설정)
  - `SettingsThemeScreen` (다크모드/색상 팔레트)
  - `SettingsHomeWidgetsScreen` (홈 위젯 토글)
  - `SettingsAiTagScreen` (AI 태그 관리/재분석)
  - `SettingsBackupScreen` (백업/복원/공유)
  - `SettingsSyncDiagnosticsScreen` (동기화 진단)
  - `SettingsPrivacyScreen` (데이터/프라이버시)
  - `SettingsSupportScreen` (후원)
  - `SettingsAboutScreen` (앱 정보/버전)
- 공통 UI 컴포넌트 추출: `SettingsRow` / `SettingsSection` / `SettingsCard` (`src/components/settings/`)
- 라우팅 변경: BottomTab의 "설정" 탭을 자체 Stack Navigator로 wrap, 디테일은 push 네비게이션
- 각 디테일 스크린이 자신의 모달(이름변경/시간피커/사진액션 등)을 자체 보유
- 단계별 점진 분리 (3개씩 묶음) + 각 단계마다 빌드 + 회귀 검증
- 도메인 로직(DAO·서비스) 변경 없음. UI/네비게이션 리팩터만.

## Capabilities

### New Capabilities
- `settings-navigation`: 설정 탭의 허브-디테일 네비게이션 구조. 메뉴 허브가 11개 디테일 스크린으로 push 라우팅. Stack Navigator 기반 헤더/뒤로가기 동작 정의.

### Modified Capabilities

(없음 — 기존 기능의 사양은 그대로, UI 호스팅 위치만 변경.)

## Impact

- **코드**: `src/screens/SettingsScreen.tsx`(~800라인) 분해 → 허브(~150라인) + 11 디테일 스크린 + `src/components/settings/*` 공통 컴포넌트
- **라우팅**: `src/navigation/AppNavigator.tsx` 수정 (Settings Stack Navigator 추가)
- **모달 이전**: nameModal, photoActionModal, timePickerModal 등 SettingsScreen 내부 모달 → 각 디테일 스크린으로 이동
- **DB**: 변경 없음
- **API/서비스**: 변경 없음 (DAO/서비스 호출만 이전)
- **회귀 위험 영역**: 백업/복원(비동기 흐름), 동기화 진단(SQL+클립보드), AI 태그 재분석(진행률+일일 제한)
- **검증 비용**: 단계당 빌드 + 실기기 검증 4회 (3+3+3+2 분리), 총 작업 반나절~하루
