## 1. 공통 컴포넌트 추출

- [x] 1.1 `src/components/settings/` 디렉토리 생성
- [x] 1.2 `SettingsRow.tsx` 작성 (좌측 라벨, 우측 chevron, 부가 텍스트, onPress)
- [x] 1.3 `SettingsSection.tsx` 작성 (섹션 헤더 + children wrapper)
- [x] 1.4 `SettingsCard.tsx` 작성 (카드 wrapper, surface 배경 + radius)
- [x] 1.5 `index.ts` barrel export
- [x] 1.6 `npx tsc --noEmit` 통과 확인
- [x] 1.7 단독 커밋

## 2. 허브 skeleton (실제 구조에 맞춰 보정)

설계 보정: BottomTab에 Settings 탭이 없음. Settings는 root Stack의 한 screen.
별도 SettingsStackNavigator 불필요 — 디테일 스크린을 root Stack에 추가.

- [x] 2.1 ~~SettingsStackNavigator 신설~~ → 보류 (root Stack에 직접 등록 방식으로 변경)
- [x] 2.2 ~~BottomTab 설정 탭 변경~~ → 보류 (해당 탭 없음)
- [x] 2.3 기존 `SettingsScreen.tsx`를 `SettingsHubScreen.tsx`로 파일명 변경
- [x] 2.4 `AppNavigator.tsx` import 경로 갱신
- [x] 2.5 빌드 + 타입 체크 통과
- [x] 2.6 커밋

## 3. 복잡 3종 분리: Alarm / Backup / SyncDiagnostics

- [x] 3.1 `SettingsAlarmScreen.tsx` 작성 — 알람 추가/삭제/토글/시간 피커 모달/배터리 최적화 안내 이전
- [x] 3.2 `SettingsBackupScreen.tsx` 작성 — 내보내기/가져오기/공유 시트 + `isBackingUp`/`isRestoring` state 이전
- [x] 3.3 `SettingsSyncDiagnosticsScreen.tsx` 작성 — `getSyncDiagnostics` + 클립보드 복사 이전
- [x] 3.4 root Stack에 3개 스크린 등록, 헤더 타이틀 설정
- [x] 3.5 허브에서 해당 3개 섹션을 `SettingsRow`로 교체 (알람 활성 N개 hint 포함)
- [x] 3.6 진행 중 작업 보호: 백업 진행 중 뒤로가기 시 confirm 다이얼로그 (beforeRemove)
- [ ] 3.7 회귀 검증 체크리스트:
  - [ ] 알람: 추가/삭제/토글/배터리 최적화 다이얼로그/하단 링크
  - [ ] 백업: 내보내기 성공·실패 alert / 가져오기 picker / 공유 시트
  - [ ] 동기화 진단: 데이터 표시·새로고침·클립보드 복사
- [ ] 3.8 빌드 + 실기기 검증
- [x] 3.9 커밋 (다음)

## 4. 데이터 관리 분리: Children / AiTag (Family는 직접 nav)

- [x] 4.1 `SettingsChildrenScreen.tsx` 작성 — 바다 추가/이름변경/삭제/활성 전환 + nameModal/deleteModal 이전 + 미분류 기록 처리
- [x] 4.2 ~~SettingsFamilyScreen~~ → 보류 (기존 FamilyShareScreen 직접 navigation)
- [x] 4.3 `SettingsAiTagScreen.tsx` 작성 — 태그 재분석/진행률/일일 제한 + 진행 중 뒤로가기 보호
- [x] 4.4 root Stack에 SettingsChildren/SettingsAiTag 등록
- [x] 4.5 허브에서 해당 섹션을 `SettingsRow`로 교체 (활성 바다 이름 hint)
- [ ] 4.6 회귀 검증 체크리스트:
  - [ ] 바다 관리: 추가/롱프레스 편집/삭제/활성 전환 + ChildContext 동기화
  - [ ] 가족 공유: 만들기/참여/공유 화면 진입
  - [ ] AI 태그: 재분석 진행률/일일 제한/완료 후 상태
- [ ] 4.7 빌드 + 실기기 검증
- [x] 4.8 커밋 (다음)

## 5. 단순 5종 분리: Theme / HomeWidgets / Privacy / Support / About

- [ ] 5.1 `SettingsThemeScreen.tsx` 작성 — 다크모드 토글
- [ ] 5.2 `SettingsHomeWidgetsScreen.tsx` 작성 — 홈 위젯 토글 (음성/텍스트/증상/오늘기록)
- [ ] 5.3 `SettingsPrivacyScreen.tsx` 작성 — 데이터/프라이버시 안내 텍스트
- [ ] 5.4 후원/앱 정보 라인 수 확인
  - [ ] 5.4.1 합산 50라인 미만이면 `SettingsAboutScreen.tsx` 한 화면으로 통합
  - [ ] 5.4.2 50라인 이상이면 `SettingsSupportScreen.tsx`/`SettingsAboutScreen.tsx` 분리
- [ ] 5.5 SettingsStack에 4~5개 스크린 등록
- [ ] 5.6 허브에서 해당 섹션을 `SettingsRow`로 교체
- [ ] 5.7 회귀 검증 체크리스트:
  - [ ] 화면 모드: 다크모드 토글 시 모든 화면 즉시 반영
  - [ ] 홈 위젯: 토글 시 홈 화면에 즉시 반영
  - [ ] 프라이버시: 외부 링크 동작
  - [ ] 후원/앱 정보: 정적 텍스트 표시 + 라이선스 모달
- [ ] 5.8 빌드 + 실기기 검증
- [ ] 5.9 커밋

## 6. 정리 및 마감

- [ ] 6.1 기존 `SettingsHubScreen` (구 SettingsScreen)에서 이전된 섹션의 죽은 코드(state/모달/스타일/import) 일괄 삭제
- [ ] 6.2 사용하지 않는 import/util 제거 (`knip` 또는 수동 확인)
- [ ] 6.3 `npx tsc --noEmit` 통과
- [ ] 6.4 종합 회귀 검증:
  - [ ] 11개 디테일 스크린 모두 진입/뒤로가기
  - [ ] 허브 스크롤 위치 보존
  - [ ] iOS 스와이프 백 / Android 시스템 백
  - [ ] 다크모드/팔레트 변경 시 모든 화면 일관성
- [ ] 6.5 빌드 + 최종 실기기 검증
- [ ] 6.6 OpenSpec verify 실행 (`/openspec-verify-change settings-hub-detail-refactor`)
- [ ] 6.7 커밋
- [ ] 6.8 OpenSpec archive (`/openspec-archive-change settings-hub-detail-refactor`)
