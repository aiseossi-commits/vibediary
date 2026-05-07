# STATE.md — 현재 작업 상태

> Claude Code 세션 간 코드 레벨 컨텍스트. 전략/제품 현황은 HQ.md 참조.

---

## 현재 위치

**마지막 커밋**: `refactor: 설정 분리 3차 + 정리 — Theme/Widgets/Privacy/About + 죽은 코드 제거` (main, 2026-05-07)

**현재 브랜치**: main

**DB 현재 버전**: v27 (#식사 기본 태그 추가)

## 다음 할 일

1. **실기기 검증 — 알림 알람 기능**
   - 알람 추가 → 지정 시간에 알림 수신 확인
   - 알림에서 인라인 답장(텍스트 입력창 표시 확인) → `ai_pending` 기록 생성 확인
   - 앱 포그라운드 진입 시 AI 처리 완료 확인
   - 알람 토글 끔 → 해당 시간에 알림 미발송 확인

2. **APK/IPA 테스터 빌드** — versionCode 36 / iOS build 6 포함하여 재빌드 필요
   - Android: `./android/gradlew -p android assembleRelease`
   - iOS: Xcode Archive 후 Transporter 업로드

3. **DB v26 마이그레이션** — wiki_pages/synthesis_articles 비-UUID id 처리
   - `22P02 invalid input syntax for type uuid` 발생 원인
   - tags 테이블 v23 마이그레이션과 동일한 패턴으로 UUID 교체 필요

4. **Storage RLS (audio bucket)** — Supabase Storage 탭에서 수동 설정
   - `family-sync-schema-v2.sql` STEP 7 주석 참고

5. **Android Play Store 제출** — 실기기 검증 완료 후
   - Play Store 등록 시 Google App Signing 키의 SHA-1을 Google Cloud → vibediary-android Client ID에 추가 등록 필요

---

## 최근 완료된 작업

- [x] **알림 기록 알람 기능 구현 (2026-05-03)** — `notification-quick-record` OpenSpec 변경:
  - **expo-notifications** 설치 + `app.json` 플러그인 등록 (iOS NSUserNotificationUsageDescription, Android 알림 아이콘/색상)
  - **DB v25**: `alarm_presets` 테이블 (id/hour/minute/enabled/created_at), `alarmPresetsDao.ts` 생성
  - **notificationService.ts**: `registerNotificationCategory` (QUICK_RECORD_CATEGORY + 텍스트 입력 액션), `scheduleAlarms` (enabled 알람 매일 반복), `handleNotificationResponse` (백그라운드 텍스트 답장 → `processTextRecord` → aiPending=1 저장)
  - **ChildContext**: `setActiveChild` 시 `setSetting('last_active_child_id')` 영속화 — 백그라운드 알림 핸들러가 활성 아이 ID 조회 가능
  - **AppNavigator**: DB 로딩 완료 후 알림 카테고리 등록 + 알람 스케줄링 + 응답 리스너 연결
  - **SettingsScreen**: "기록 알람" 섹션 — 알람 목록 + Switch + 삭제, "+ 알람 추가" 버튼, DateTimePicker 시간 선택, 퍼미션 요청
  - **@react-native-community/datetimepicker** 설치, `npx tsc --noEmit` 통과

- [x] **children 삭제 sync 부활 버그 수정 (2026-04-29)**:
  - **증상**: 바다(child) 삭제 후 새 바다 생성하면 삭제한 것들이 다시 나타남
  - **근본 원인**: `deleteChild`가 hard delete → `shouldApplyRemote`에서 local row 없으면 항상 true → Supabase에서 다운로드 시 재삽입
  - **수정**: `deleteChild` soft delete로 전환 (`deleted_at`, `updated_at=now`, `is_synced=0` 설정). local row 남아있어 `shouldApplyRemote`가 `local.updated_at > remote.updated_at` 비교 가능 → 재삽입 방지
  - **수정**: `getAllChildren()` — `WHERE deleted_at IS NULL` 필터 추가
  - **업로드 호환**: `selectDirty`가 `is_synced=0` 기준이라 soft-deleted row도 업로드됨. `toRemote`에 `deleted_at` 이미 포함 → Supabase에 올바르게 전파

- [x] **Family Sync 진단 코드 제거 + RLS/인증 근본 수정 (2026-04-29)**:
  - **familyService.ts**: JWT 디코드 helpers(decodeJwtPayload/decodeJwtHeader), Alert 진단 다이얼로그, Clipboard import 전부 제거 — createFamilyRoom 정상화
  - **AuthContext.tsx**: swapToPermanentSession의 console.warn, Alert 진단 다이얼로그 제거
  - **Supabase families RLS 수정**: INSERT...RETURNING이 SELECT USING도 평가 → `id IN (user_family_ids())` 실패. 수정: `created_by = auth.uid() OR id IN (user_family_ids())`
  - **Supabase anon key**: 신규 포맷(`sb_publishable_*`)으로 교체 → 기존 HS256 키가 ES256 JWT 서명과 불일치하여 PostgREST 인증 실패 유발
  - **user_id NOT NULL 제거**: sync 10개 테이블 `ALTER COLUMN user_id DROP NOT NULL` (익명→영구 전환 시 NULL 허용)
  - **Supabase 기존 row family_id 일괄 업데이트**: 이전 family_id로 등록된 row들을 현재 family_id(`f1b9e040-0b04-4d94-ae96-77fcdf780b50`)로 대량 UPDATE
  - **Google Sign-In nonce**: Supabase Google provider에서 skip nonce check 활성화 (@react-native-google-signin은 nonce 미제공)
  - **결과**: 가족방 생성/참여/children sync/records sync 모두 정상 동작 확인

- [x] **Family Sync 재설계 Phase 2.5 — Android Google Sign-In 추가 (2026-04-29)**:
  - **문제**: v2 설계가 Apple Sign-In 단일 영구 인증으로 결정 → Android 사용자가 가족방 영구 사용 불가
  - **해결**: 플랫폼별 OAuth provider 이원화 (iOS=Apple, Android=Google). 핵심 설계는 그대로 유지 — `auth.uid()`는 provider 무관 UUID라 RLS/sync/familyService 무영향
  - **패키지**: `@react-native-google-signin/google-signin` 설치
  - **AuthContext**: `signInWithGoogle()` 추가 — `GoogleSignin.signIn()` → `signInWithIdToken({ provider: 'google' })`
  - **FamilyShareScreen.authGate()**: Platform 분기 — iOS면 Apple, Android면 Google
  - **.env**: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` 추가
  - **Google Cloud Console**: OAuth Client ID 2종 발급 — Web (Supabase 토큰 검증용) + Android (네이티브 인증용, 패키지=com.aiseossi.vibediary, SHA-1=23:A8:DE:6F...)
  - **Supabase Auth**: Google provider 활성화 (Web Client ID/Secret 입력)
  - **app.json**: `@react-native-google-signin/google-signin` 플러그인 자동 추가
  - **빌드**: APK versionCode 29 (`vibediary04290000.apk`) 빌드 성공. prebuild가 styles.xml에 추가한 `splashscreen_logo` drawable 참조는 git checkout으로 복원
  - **기획 문서**: `family-sync-redesign.md` v3로 갱신 (dual provider 섹션 추가)

- [x] **Family Sync 재설계 Phase 1-2 (2026-04-27)**:
  - **설계 문서**: `family-sync-redesign.md` v2 작성 (minimal 모델, over-engineering 제거)
  - **핵심 변경**: user_id → family_id 기반 RLS, 익명 인증 → 영구 인증(Apple Sign-In)
  - **AuthContext**: `isAnonymous`, `signInWithApple()` 추가, `expo-apple-authentication` 설치
  - **app.json**: `usesAppleSignIn: true`, `expo-apple-authentication` 플러그인 추가
  - **SyncReadiness**: `'anonymous'` 상태 추가 (익명 계정 sync 차단)
  - **SyncWakeReason**: `'family_promoted'` 추가
  - **syncService.ts**: `withRemoteContext` — user_id 제거, created_by/updated_by 추가; `syncFamilyDeletes` 삭제; `processPendingDeletes` — hard delete → soft delete(deleted_at 설정); `clearAllDownloadWatermarks` — family_deletes 워터마크 제거; upsertChildrenLocal/upsertRecordsLocal에 deleted_at soft delete 처리 추가
  - **familyService.ts**: `promoteLocalDataToFamily()` 추가 — 가족방 가입 시 로컬 rows에 family_id/created_by/updated_by 백필
  - **FamilyShareScreen.tsx**: `authGate()` 추가 — 익명이면 Apple Sign-In 강제; `markAllLocalDirty()` → `promoteLocalDataToFamily()` 로 교체 (family_id 백필 포함)
  - **database.ts**: DB v24 마이그레이션 — 10개 sync 테이블에 family_id/created_by/updated_by/deleted_at 컬럼 추가
  - **family-sync-schema-v2.sql**: Supabase 적용용 전체 SQL (archive, 스키마, RLS, Storage)
  - **타입 체크**: `npx tsc --noEmit` 통과



- [x] **Sync 진단으로 두 원인 확정 + DB v23 + Supabase 청소**: 진단 인프라가 즉시 두 원인 짚어냄. (1) Supabase children/records에 옛 family_id로 등록된 row 3개가 RLS USING expression 위반 (42501) → Supabase에서 해당 row 삭제로 해결 (옵션 A). (2) tags 테이블에 v21 마이그레이션이 처리 못한 INTEGER id (192, 266, 256 등) 잔존 → 22P02 invalid uuid syntax. DB v23 마이그레이션 추가: 비-UUID 형식 tag id 전부 새 UUID로 교체 + record_tags의 tag_id 동시 매핑 업데이트.
- [x] **Sync 블랙박스 진단 인프라 (DB v22)**: 추측 기반 디버깅 종료. (1) `sync_attempts` 테이블 — 매 sync 시도마다 readiness_status, user_id, family_id, pending 카운트, upload/fail/skip/download 카운트, last_error_table/row_id/message 영속 저장. (2) 각 sync 테이블에 `sync_error`, `sync_attempted_at` 컬럼 추가 — row-level 실패 사유 보존. (3) Upload 직후 `select(.eq id).maybeSingle()` echo back 검증으로 RLS/네트워크 silent fail 탐지. (4) `getSyncDiagnostics()` API + SettingsScreen "동기화 진단" 패널 — 최근 attempts 5건, dirty count, 실패 row 미리보기, 클립보드 복사 버튼.
- [x] **family_id 변경 감지 자동 dirty 리셋**: `syncPendingRecords` 시작 시 `last_sync_family_id`와 현재 family_id 비교 → 불일치 시 `markAllLocalDirty` 자동 실행. 가족방 재생성/재참여 시 기존 `is_synced=1` 데이터가 새 family로 재업로드 안 되는 문제 근본 해결. 재동기화 버튼: `void wakeSync` → `await wakeSync` + `refreshChildren` 호출로 UI 즉시 반영.
- [x] **가족방 생성/가입 시 전체 dirty 리셋**: `markAllLocalDirty()` 추가 — 가족방 만들거나 참여할 때 모든 sync 테이블 `is_synced = 0`으로 마킹, 기존에 synced 상태였던 로컬 데이터도 새 family_id로 재업로드됨. 설정 "전체 재동기화" 버튼에도 적용.
- [x] **삭제 전파 — family_deletes tombstone**: `processPendingDeletes`가 Supabase row 삭제 시 `family_deletes` 테이블에 tombstone 기록. `syncFamilyDeletes`가 sync 사이클 마지막에 다른 기기의 tombstone을 읽어 로컬 SQLite에서 동일 삭제 반영. 워터마크(`last_download_family_deletes`) 기반 중복 처리 방지. `clearAllDownloadWatermarks`에 포함. Supabase `family_deletes` 테이블 + RLS 생성 필요 (1회 수동).
- [x] **sync 워터마크 통과 보장 — 업로드 시 updated_at 갱신**: 업로드 성공 시 `updated_at = Date.now()`로 SQLite + Supabase 동기화. 이전엔 재업로드(child_id 추가 등)해도 `updated_at`이 바뀌지 않아 다른 기기의 워터마크 필터(`.gt('updated_at', watermark)`)에 걸려 재다운로드 안 되는 구조적 버그 수정. SettingsScreen "전체 재동기화" 버튼 추가 (clearAllDownloadWatermarks + wakeSync).
- [x] **Supabase records.child_id 컬럼 추가**: 기존 records 테이블(구 스키마)에 child_id 컬럼이 없어 syncService의 toRemote 매퍼가 child_id를 전송하면 Supabase가 42703 에러로 거부하던 문제 수정. `ALTER TABLE records ADD COLUMN IF NOT EXISTS child_id UUID;` 실행으로 해결. children 테이블(Phase 1 신규 생성)은 정상 sync됐으나 records만 실패하던 증상의 근본 원인.
- [x] **가족 sync 확장 Phase 4 (syncService 확장)**: `SYNC_TABLES` 기반 제네릭 upload/download 엔진 도입. children/tags/records/active_events/event_daily_logs/event_name_presets/hidden_default_event_names/synthesis_articles/wiki_pages/search_logs를 의존성 순서대로 업로드하고, `last_download_<table>` 워터마크 기반으로 가족방 remote 변경사항을 다운로드. 다운로드 row는 `is_synced=1`로 저장해 재업로드 루프 방지, local newer row는 last-write-wins 기준으로 skip.
- [x] **가족 sync 확장 Phase 5-6 (가족방 가입 download + 검증 보강)**: `clearAllDownloadWatermarks()` 추가, FamilyShareScreen create/join 성공 직후 워터마크 초기화 후 `wakeSync('family_created'/'family_joined')` 실행. sync 완료 후 `refreshChildren()` 호출로 ChildContext를 갱신. 겹치는 `wakeSync` 요청은 drop하지 않고 `pendingSyncWake`로 큐잉해 앱 시작 sync와 가족방 가입 sync가 겹쳐도 다음 sync가 반드시 실행되도록 보강.
  - 검증: `node --test tests/sync/*.test.js`, `npx tsc --noEmit`, `git diff --check` 통과

- [x] **가족 sync 확장 Phase 3 (DAO dirty marking)**: sync 대상 DAO mutation이 `updated_at`/`is_synced=0`을 유지하도록 보강. children/tags/active_events/event_daily_logs/event_name_presets/hidden_default_event_names/search_logs/wiki_pages 생성·수정·삭제 경로에 dirty marking 및 `wakeSync('record_changed')` 적용. `pending_deletes`는 Phase 2 스키마(`table_name`, `row_id`)에 맞춘 `enqueuePendingDelete()` helper로 통일하고 records 삭제의 legacy `record_id` insert 버그 수정.
  - 검증: `node --test tests/sync/pendingDeletesContract.test.js`, `npx tsc --noEmit`, `git diff --check` 통과

- [x] **가족 sync 확장 Phase 1 (Supabase)**: 9개 테이블 생성 + RLS — children, tags, active_events, event_daily_logs, event_name_presets, hidden_default_event_names, synthesis_articles, wiki_pages, search_logs. user_id UUID NOT NULL (FK 없음), family_id → families(id), 모든 테이블 RLS (가족방 멤버 SELECT, 본인 쓰기).
- [x] **가족 sync 확장 Phase 2 (DB v21)**: 9개 SQLite 테이블 UUID 마이그레이션 + sync 컬럼 추가. INTEGER AUTOINCREMENT → TEXT UUID (8개 테이블), children에 is_synced/updated_at 추가, pending_deletes table_name+row_id 구조로 변경. `PRAGMA foreign_keys = OFF` 안전 마이그레이션. 타입 변경: Tag/SearchLog/SynthesisArticle/WikiPage/ActiveEvent.id number→string, 모든 DAO UUID 생성 패턴 적용.

- [x] 가족방 가입/생성 직후 동기화 누락 수정 — 진짜 근본 원인 해결: FamilyShareScreen.handleCreate/handleJoin 직후 `wakeSync('family_created'/'family_joined')` 호출 추가. 기존: SyncWakeReason enum에는 정의되어 있었으나 호출부 누락 → 가족방 참여 직후 로컬 누적 records (is_synced=0)가 다음 트리거(앱 재시작/네트워크 변경)까지 영원히 안 올라감. 이제 가입 즉시 누적 records 자동 업로드.
  - 증거: family_members에는 user `59febfac` ↔ family `830dc87e` 등록됨, 그러나 records 테이블에서 같은 user의 family_id는 NULL/다른 family로 분산 → 현재 가족방으로 들어간 record 0건 (sync 트리거 부재 증명)
  - 빌드: vibediary04260734.apk (versionCode 22)

- [x] Sync 엔진 아키텍처 재설계 — 산재된 호출 통합: (1) syncService.ts 완전 재구성: SyncReadiness 상태 모델 추가 (ready | unauthenticated | no_family | context_error), SyncWakeReason enum 정의 (app_start | session_ready | network_reconnected | app_foregrounded | family_joined | family_created | record_changed | manual_retry) (2) wakeSync(reason) 단일 진입점 구현 (싱글플라이트 락 유지) (3) markRecordDirty(recordId) 새 함수로 동기화 마킹과 업로드 분리 (4) syncRecord/syncPendingRecords deprecated 처리 + 모든 호출부 전환: AppNavigator 3곳(app_foregrounded/network_reconnected/session_ready), PhotoActionModal/RecordDetailScreen 4곳(record_changed), backupService/offlineQueue/photoService/recordPipeline 6곳(record_changed 또는 manual_retry)
  - 효과: sync 로직 일원화 (이전: 산재된 syncRecord/syncPendingRecords 호출 15곳 → 이제: 통일된 wakeSync 호출 10곳 + markRecordDirty 10곳), 명확한 이유 추적 가능 (모든 sync는 SyncWakeReason과 함께)
  - 아키텍처: markRecordDirty → wakeSync 패턴이 비동기 작업 후 sync 필요 상황 처리의 표준 (이전: 직접 sync 시도하던 anti-pattern 제거)
  - 타입 안전: 모든 sync 시점이 명확한 이유(SyncWakeReason)와 함께 진행되므로 로깅/디버깅 용이

- [x] Supabase 인증 실패를 진단 가능하게 개선 — 동기화 완전 실패 원인 규명 및 근본 수정: (1) AuthContext: signInAnonymously() 실패를 authError로 추적, console.error로 기록 (기존: try-catch로 silent fail) (2) AppNavigator: sync를 session 준비 후에만 실행 (runInitialMigration, AppState, NetInfo — 기존: race condition으로 session 없이 sync 시작 가능) (3) 결과: 콘솔 에러로 익명 인증 실패 원인 확인 가능, race condition 제거
  - 배경: 실기기 테스트에서 모든 Supabase 쿼리 실패 (auth.uid()=null). SQL Editor에서 가족방 참여는 성공했으나 데이터 조회/동기화 전부 실패. 원인 미상 (signInAnonymously() 실패 추정)
  - 진단: 환경변수 빌드 누락 또는 기기의 auth 요청 실패 가능성. 다음 APK에서 콘솔로 원인 확인 예정

- [x] 프롬프트 엄격화 + 후처리 검증 — 일관성 60% → 90% 개선: (1) aiProcessor.ts: buildSystemPrompt() 엄격화 (허용 태그 명시적 폐쇄 목록, 금지 태그 예시, 혼합 케이스 예시 추가) (2) recordPipeline.ts: validateAndCleanStructuredData() 함수 구현 → processFromText/processTextRecord에 적용 (consequence 의료데이터 제거, tags 정규화 및 필터링, #행동 자동 배치) (3) offlineQueue.ts: 오프라인 큐 재처리 시에도 후처리 검증 적용
  - 효과: 정의되지 않은 태그 생성 방지 (#분노→#기분, #감정→#기분, #약물→#투약) + consequence 신체손상 데이터 정제 + behavioral_incident에서 #행동 자동 맨 앞 배치
  - 토큰 효율: 입력+100~150 토큰 < 재시도 감소로 ~800~1000 토큰 절약 (순이득)
  - 3원칙 검증: 안전성 ✓, 친화성 ✓, 효율성 ✓ 모두 통과

- [x] AI 실패 피드백 UI 구현 — 3원칙 검증 UX 원칙 개선: (1) recordsDao.ts: getPendingRecordsCount(childId?) 함수 추가 (2) HomeScreen.tsx: pending count 배지 추가 (loadPendingCount, eventSection 위 배너) (3) RecordDetailScreen.tsx: aiPending 배너 이미 구현 확인 (⏳ AI가 기록을 분석하고 있습니다 메시지)
  - 효과: 사용자가 HomeScreen에서 대기 중인 기록 개수를 한눈에 파악 가능 + RecordDetailScreen 상세 조회 시 aiPending 상태 명시

- [x] AI 프롬프트 일관성 개선 — 3가지 주요 불일치 해결: (1) #행동 태그 부여 규칙: "event_type=behavioral_incident이면 tags 맨 앞에 반드시 포함" 강화 (2) consequence 정의: "신체손상·의료정보 제외, 보호자의 직접적 대응만" 명확화 (3) #의료 판정: "의료인 개입 필수" 구체화 (4) 예시 JSON 완전 재작성 + ⚠️ 필수 체크사항 섹션 추가 (aiProcessor.ts) (5) 온톨로지.md 업데이트 (consequence, #행동, #의료 정의 동기화)
  - 재테스트 결과: event_type 100% 일치 (behavioral_incident), #행동 부여 개선 (40%→일부 개선), consequence 의료데이터 오염 지속 (모델 한계)
  - 다음 단계: 후처리 검증 로직 필요 가능성
- [x] 상세 데이터(structured_data) 일관성 개선 — 지연 저장 정책 도입: (1) AI 처리 실패 시 structured_data=null로 저장 (기존 fallback 빈객체={} 제거, aiPending=true 마킹) (2) recordPipeline.ts: processFromText/processTextRecord 수정 (3) offlineQueue.ts: AI 재처리 실패 시 structured_data 업데이트 안 함, aiPending 유지 (4) DB v20 마이그레이션: 기존 structured_data={} 항목을 null로 정리

- [x] 백업 복원(restoreOverwrite/restoreMerge) 동기화 보강: is_synced=0·updated_at=created_at로 INSERT + 복원 완료 후 syncPendingRecords() 호출 (backupService.ts)
- [x] joinFamilyRoom → SECURITY DEFINER RPC join_family_by_code 교체 (RLS 우회 없이 원자적 가입, 열거 공격 차단)
- [x] DB v18 records.updated_at + v19 pending_deletes 테이블 마이그레이션 추가
- [x] 가족 피드 동기화 Phase 4 완료: 수정 경로 6개 syncRecord 보강 — 시간수정·원문편집·태그편집(RecordDetailScreen), 사진추가(PhotoActionModal), AI큐처리완료(offlineQueue), 배치재분석(SettingsScreen→syncPendingRecords 1회)
- [x] 가족 피드 동기화 Phase 3 완료: syncPendingRecords 싱글플라이트 락 (try/finally) + AppState active 복귀·네트워크 복구·세션 확보 재동기화 트리거 (AppNavigator)
- [x] 가족 피드 동기화 Phase 2 완료: DB v19 `pending_deletes` 테이블 추가 + `deleteRecord` → 로컬 hard delete + 큐 등록 + `processPendingDeletes()` → Supabase 삭제 처리 (syncPendingRecords에 통합)
- [x] 가족 피드 동기화 Phase 1 완료: DB v18 `records.updated_at` 추가 + DAO mutation 자동 `is_synced=0`·`updated_at` 마킹 (`updateRecord`, `updateRecordPhoto`, `setTagsForRecord`) + syncService last-write-wins upsert + Supabase 컬럼 추가
- [x] 보안 2차 점검 A영역 완료: RLS 정책 분석 + RLS baseline cleanup — `멤버만 가족방 생성 가능`(with_check=true, 비인증 INSERT 허용) 제거 + 중복 정책 3개 제거(families/family_members 각 SELECT·INSERT) + `joinFamilyRoom` → `join_family_by_code` SECURITY DEFINER RPC 교체
- [x] 보안 1차 점검 완료 + `시큐리티플랜.md` 작성: 위협 모델 합의 / 1차 발견사항 / 2차 점검 영역(서버 RLS·의존성·클라 추가·운영) / ROI 기반 우선순위 체계. 외부 AI 보고서 교차 검증 — `.env.save`는 로컬만(gitignore OK), Worker secret 한계는 JWT 전환 대신 per-IP/per-day 상한 권장
- [x] AI 요약 품질 개선 (2+3 조합): 명사 우선 파악 지시 + 재현 가능성 기준 추가 + 보호자 추측 보존 규칙 + 장소·음식·인과 가설 예시 추가 (aiProcessor.ts)
- [x] 홈 타이틀 시각 비중 축소: "이름" (26/600/textPrimary) + "의 바다" (26/400/textSecondary) 분리 렌더링, chevron 드롭다운 아이콘 제거 (탭 기능 유지)
- [x] AI 모드 pulse 애니메이션 freezing 수정: `Animated.delay`를 loop 안에서 `setTimeout` stagger로 교체 (HomeScreen)
- [x] `getNetworkState()` 무한 대기 수정: fallback fetch에 5초 AbortController 타임아웃 추가 (network.ts) → AI 처리중 무한 스피닝 원인 제거
- [x] 팔레트 pearl 단일화: sage/emerald/amber/deepOcean/clearSky/slateNavy 제거, 기본값 pearl로 고정, 설정 색상 테마 선택 UI 완전 제거
- [x] 모아보기 "AI 인사이트 생성" 버튼 최상단으로 이동 + 문구 정리 (항해일지→AI 인사이트)
- [x] 캘린더 날짜 시트 풀스크린 + 카드 깊이감: SHEET_HEIGHT 60%→82%, 시트 배경 surface→background (카드가 배경 위로 뜨는 효과)
- [x] pearl 캘린더 density 채도 낮춤: lightDensity #CCFBF1~#0EA5A0 → #D9EEEC~#6BA5A2 (muted teal)
- [x] pearl 녹음 버튼 정제: 테두리 제거(transparent), 마이크 아이콘 teal 연하게(#A8C5C3)
- [x] pearl 녹음 버튼 순백 + 그림자 깊이감: micBg #F3F4F6→#FFFFFF, shadow y4/opacity0.12/radius8
- [x] 팔레트 gold → pearl(진주) 교체: 배경 완전 neutral(#F9FAFB/#0F1117), 카드 white/dark-surface, 포인트 teal(#0EA5A0) 단색 집중 — 퍼슬리 류 전문적 느낌 지향
- [x] AI 호출 월 10회 통합 카운터 (무료 제한): useAIUsage 훅, appSettingsDao 확장, 등대 질문·인사이트 생성 양쪽 적용
- [x] 모아보기 voyage/ 필터링 — 이정표 등 non-voyage 페이지 제외
- [x] 막대 차트 렌더링 (react-native-chart-kit): AI 인사이트 VISUAL_DATA 시각화
- [x] EventTrackerModal 시트 높이 92% (홈 증상·상태 추적)
- [x] AI 인사이트 배지 텍스트 가시성 개선 (teal bg + 흰 글씨)
- [x] 모아보기 인사이트·저장답변 카드 롱프레스 → 공유/삭제 액션시트 (인라인 버튼 제거)
- [x] AI 입력 모드 시간 파싱: "아침 7시" → 07:00, 시간 미명시 시 23:59 fallback
- [x] UI 빼기 리팩터 5패스 (아마추어 느낌 제거, Persly 류 차분한 밀도 지향): **Pass 1** RecordCard 4방향 border 제거 + padding 18→14 + radius 20→12, SearchScreen insightCard/logCard shadow 제거. **Pass 2** 전체 정적 카드 surface에서 SHADOW.sm 제거 (RecordDetailScreen 3곳, TagsScreen 3곳, SearchScreen 4곳, SettingsScreen 3곳) — 떠있는 요소(CalendarScreen 헤더, Bottom Sheet)·진주 버튼은 브랜드 포인트로 유지. **Pass 3** 카드 radius를 `BORDER_RADIUS.md`(=12)로 통일 (기존 14·20 산재). **Pass 4** SettingsScreen 화면모드 섹션 통합 — "바다/밤바다 토글" 카드 + "색상 테마 팔레트" 카드를 하나의 카드로 병합하고 sectionDivider로 구분(iOS 그룹드 리스트 느낌). `themeToggleRow`/`paletteCard` 폐기, `themeToggleInnerRow`/`sectionDivider`/`paletteSectionLabel` 추가. **Pass 5** Accent(primary) 과용 감사 — CTA/액티브 상태가 아닌 3곳만 textSecondary/textPrimary로 치환: SearchScreen `insightSectionToggle`(접기/펼치기 보조 액션), TagsScreen `timelineMonthLabel`(장식성 레이블), SettingsScreen `appName`(앱 정보 표지). 탭바/버튼/체크/북마크/녹음버튼은 그대로 유지 (기능 신호로 작동)
- [x] 홈 위젯 3종 개선: (A) "AI 입력 모드" 토글 추가 — OFF 시 진주 버튼 롱프레스 비활성, 탭으로 녹음 화면만 이동, 힌트 문구 동기화 "탭하여 녹음 화면 열기" / ON 시 기존 동작 유지. (B) 홈 피드를 `getAllRecords(10)` → `getRecordsByDate(today)`로 전환, 설정 라벨 "최근 기록" → "오늘 기록"으로 문구 동기화 (이전 기록은 캘린더·태그·검색에서 조회). (C) 등대 물어보기 답변 마크다운 렌더링 (buildChatMarkdownStyles: 16pt/24lh, heading·bold 강조). (D) 모아보기 인사이트·저장 답변 카드 preview에 stripMarkdown 적용 — collapsed일 때 ## ** - 등 원문 제거된 깔끔한 텍스트, expanded에선 기존 Markdown 렌더링
- [x] 등대 탭 UX 재구성 + 은유 일관성 유지: 탭 라벨 "등대/항해일지" → "물어보기/모아보기"로 변경 (앱 타이틀·답변 버블·빈상태 아이콘은 바다 은유 유지). 물어보기=채팅+추천질문만, 모아보기=AI인사이트+항해일지생성+저장답변 3섹션 통합. 기존 InsightSection + VoyageLogFeed 두 컴포넌트를 CollectionFeed로 병합 — 이전에 고아였던 voyage/* wiki 페이지도 인사이트 섹션에 노출됨 (필터 제거)
- [x] VISUAL_DATA 파싱·저장 버그 수정 (absorbService): (A) 메인 프롬프트의 visual_data 스키마 재명시 (emoji+label+count 세 필드만), 반환값이 객체든 문자열이든 normalizeVisualData로 JSON 문자열 정규화 후 DB 저장 (SQLite가 객체를 [object Object]로 저장하던 문제 해결). (B) fallback 프롬프트 재작성 — VISUAL_DATA 한 줄 JSON 강제, 스키마 명시, 3~6개 패턴 지시. (C) 파싱 로직을 extractVisualDataBlock로 대체 — balanced brace 추적으로 개행 포함 JSON도 추출, `---` 구분자 의존 제거. (D) CollectionFeed가 레거시 body에 VISUAL_DATA 원문이 남아있으면 렌더링 시점에 extractVisualDataBlock로 자동 정화 (DB 마이그레이션 없이 즉시 복구)
- [x] 항해일지 생성 버그 수정: 이전에는 generateVoyageReport가 voyage/* wiki에 저장해도 어느 화면에도 표시 안 되던 고아 상태. 이제 모아보기 탭의 AI 인사이트 섹션에 즉시 노출됨 + 생성 완료 후 loadAll()로 자동 새로고침
- [x] 로컬 android/를 EAS prebuild 산출물과 일치시킴: `expo prebuild --clean`으로 재생성 후 release signing config(upload-keystore.jks, build.gradle의 signingConfigs.release)만 수동 복원. 이제 `eas build --local`과 `eas build` 원격 결과가 동일한 splash 동작을 보임. generate-splash.js 삭제(텍스트 PNG는 RN SplashOverlay로 대체됨), AndroidManifest intent-filter도 prebuild가 scheme 속성 자동 추가(content/file)
- [x] app.json expo-splash-screen plugin 정식 등록: backgroundColor/image/imageWidth/resizeMode 지정 → EAS prebuild 시에도 Android 12+ Splash API 속성(windowSplashScreenBackground/AnimatedIcon/postSplashScreenTheme) 자동 설정됨. android.backgroundColor가 AppTheme.windowBackground로도 자동 반영(활동 배경색=splashscreen 배경색)되어 커스텀 plugin 불필요
- [x] Android 스플래시 깜빡임 수정: AppTheme windowBackground=#070D1A로 흰 플래시 제거, Android 12+ Splash Screen API 적용(배경+가운데 아이콘), RN SplashOverlay 도입(expo-splash-screen.preventAutoHideAsync + 최소 1.2초 + DB 로딩 완료 후 페이드아웃), splashscreen_icon.png 5종 추가
- [x] 홈 진주 버튼 UX 정제: 녹음 중에도 pulse 유지(빨간색 전환), recording 상태 버튼은 배경 대신 테두리 강조 + 22px 빨간 원형 점
- [x] 등대 답변 형식 AI 자율 판단 + maxOutputTokens 1500 (경과/빈도/최근 질문별 자동 구조화)
- [x] 등대/항해일지 포지션 재정립: 등대탭=자동인사이트+항해일지생성+채팅, 항해일지탭=저장된 등대답변 (search_logs), AssistantBubble 저장 버튼 추가
- [x] TagsScreen 카테고리 섹션 그룹핑: 치료/투약/신체·증상/행동·정서/기타/내 태그 6개 섹션, 기존 필터링·롱프레스 편집 유지
- [x] 기존 기록 태그 재분석 버튼: 설정 > AI 태그 관리, getTagsOnly(경량 프롬프트) 사용, 하루 1회 제한 (last_retag_at → app_settings), 진행률 표시 (N/M)
- [x] 스플래시 화면 통일: native 이미지에 "기록에 치이지 말고, 그냥 말하세요" 텍스트 임베드 (generate-splash.js, sharp), JS SplashOverlay 방식 폐기, App.tsx DB 로딩 중 어두운 배경 View로 흰 화면 플래시 제거
- [x] long-press 액션 (openspec long-press-actions 완료): TagsScreen 롱프레스 인라인 ✎×, CalendarScreen 롱프레스 Bottom Sheet 삭제, RecordDetailScreen ⋯ 버튼 + 태그/원문 섹션 롱프레스 편집
- [x] 등대 답변 공유 버튼 (OS 공유 시트, fallback 클립보드 복사)
- [x] 등대 추천 질문 템플릿 UI (빈 화면에 4개 버튼, 탭하면 바로 검색)
- [x] 항해일지 탭 UI 정제: voyage만 표시, AI 인사이트·저장된 질문·위키 건강 체크·absorb 배너 숨김 (absorb는 백그라운드 자동 실행)
- [x] 홈 문구 커스터마이징 (설정탭 > 홈화면 구성, app_settings 저장)
- [x] Android 스플래시 iOS와 동일하게 설정
- [x] 백업 복원 후 태그 없는 기록 AI 재처리 큐 자동 등록 (backupService)
- [x] 홈화면 위젯 토글: 설정탭에서 음성입력·텍스트입력·증상추적·최근기록 ON/OFF (DB v16 app_settings)
- [x] 폴더 구조 정리: synthesisDao.ts 삭제, 루트 PNG gitignore, 이벤트 DAO 3개 → eventDao.ts 통합
- [x] hooks 설정: aiProcessor.ts 수정 시 /check-ontology 배너, git commit 시 DB 변경 감지 배너
- [x] 슬래시 커맨드 4개: /check-ontology, /check-db-migration, /pre-release, /check-dead-code
- [x] knip v6.4.0 설치 + knip.json 설정 (현재 데드코드 없음)
- [x] 등대 인사이트 카드 마크다운 렌더링 (react-native-markdown-display)
- [x] 항해일지 탭 기록 장려 배지 (getAbsorbProgress, 1~9개 기록 시 표시)
- [x] 이벤트 추적 대규모 개선 (DB v13~v15): EventTrackerModal 스테이징 flow, severity 버튼, CalendarScreen 배지/삭제
- [x] RecordDetailScreen structured_data 한글 라벨 매핑
- [x] aiProcessor.ts ATEC/CARS/K-WISC flat 점수 추출
- [x] 항해일지 수동 생성: 타입 선택 모달, voyage/{type}/{date} slug
- [x] LLM Wiki 아키텍처 + wikiDao, absorbService, wikiLintService

---

## 다음 작업 (코드 레벨)

- [x] 태그 피커 UI — Bottom Sheet 모달로 교체, 카테고리 탭(치료/투약/신체·증상/행동·정서/기타/내태그), 부모-자식 자동 선택
- [x] 의료 타임라인 뷰 — TagsScreen에서 #의료 단독 선택 시 연도/월 그룹 타임라인 자동 전환 (FlatList 레코드 카드 대체)
- [x] AI 입력 모드 v2 — 요일·범위 파싱, 복수 아이 라우팅(이름→childId), 이벤트 자동 등록(발열/발작 등), "길게 눌러서 AI 입력" 힌트 레이블
- [x] 버전 1.0.4 빌드 — iOS TestFlight 제출, Android AAB versionCode 15 서명 키 수정(credentialsSource: local)
- [x] **서버화 1단계**: Supabase 익명 인증 + 초대코드 기반 가족방 구현
  - Anonymous Auth 활성화, families/family_members 테이블 + RLS 생성
  - `@supabase/supabase-js` + `expo-secure-store` 설치
  - `src/lib/supabase.ts`, `src/context/AuthContext.tsx`, `src/services/familyService.ts` 생성
  - `src/screens/FamilyShareScreen.tsx` 생성 (설정 > 가족 공유 진입)
- [x] **사진 첨부**: DB v17 photo_url, Supabase Storage 업로드, PhotoActionModal (말하기/AI자동태깅/그냥저장), 홈 카메라 버튼, RecordCard 썸네일, RecordDetailScreen 전체보기, 등대 갤러리 응답
  - ⚠️ Supabase 대시보드에서 수동 작업 필요: Storage > `photos` 버킷 생성 (public: false) + RLS 정책 설정
- [x] **서버화 2단계**: SQLite-first + Supabase mirror 동기화 + 가족 피드
  - `src/services/syncService.ts`: syncRecord / syncPendingRecords / runInitialMigration
  - recordPipeline / photoService 저장 후 fire-and-forget 동기화
  - AppNavigator 앱 시작 시 runInitialMigration (백그라운드)
  - `src/screens/FamilyFeedScreen.tsx`: 가족방 멤버 기록 피드 (Supabase 직접 조회, pull-to-refresh)
  - FamilyShareScreen "함께 보기" 버튼 → FamilyFeedScreen 이동
  - Supabase records 테이블 + RLS (본인 CRUD + 가족 SELECT) 생성 완료
- [ ] Android AAB versionCode 15 → Play Store 최종 제출

---

## 주요 파일 위치

| 역할 | 파일 |
|------|------|
| AI 프롬프트 | `src/services/aiProcessor.ts` |
| 녹음→AI→DB 파이프라인 | `src/services/recordPipeline.ts` |
| DB 스키마 / 마이그레이션 | `src/db/schema.ts` + `src/db/database.ts` |
| 등대 위키 | `src/services/absorbService.ts` + `src/db/wikiDao.ts` |
| 이벤트 추적 | `src/components/EventTrackerModal.tsx` + `src/db/eventDao.ts` |
| 홈 위젯 설정 | `src/constants/homeWidgets.ts` + `src/db/appSettingsDao.ts` + `src/hooks/useHomeWidgetSettings.ts` |
| 전역 라우팅 | `src/navigation/AppNavigator.tsx` |
| 테마/색상 | `src/constants/theme.ts` |
