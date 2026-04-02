# STATE.md — 현재 작업 상태

> 세션 시작 시 이 파일을 읽어 맥락을 파악하고, 작업 완료 후 업데이트한다.

---

## 현재 위치

**마지막 커밋**: `fix: AI 등대 입력창 위치 불안정 — useBottomTabBarHeight 적용` (2026-04-02)

**현재 브랜치**: main

---

## 최근 완료된 작업

- [x] fix: AI 등대 바다 전환 시 대화 히스토리 초기화 — cross-child 컨텍스트 오염 버그 수정 (SearchScreen.tsx)
- [x] rich ingestion pipeline: StructuredData 타입 확장 (event_type/antecedent/behavior/consequence/domain)
- [x] aiProcessor.ts 프롬프트 강화: 기록 유형 분류 + ABC + domain 추출 + JSON 예시 + maxOutputTokens 256→700
- [x] parseAIResponse 방어 로직 보강: 빈 문자열 필드 제거 + 유효하지 않은 event_type 제거
- [x] searchPipeline.ts formatRecord 개선: behavioral_incident→[A/B/C], developmental→[domain/type], 기존 방식 유지
- [x] 캘린더 직접 입력 타임스탬프 23:59:59 고정 (카드 맨 뒤 정렬)
- [x] DB v6 마이그레이션: records.source TEXT 컬럼 추가
- [x] source 필드 추가: voice / calendar_text 구분
- [x] RecordCard "추가 기록" 배지 (source=calendar_text)
- [x] CalendarScreen 카드 시간만 표시 (timeOnly=true)
- [x] 데드코드 제거: embedding 시스템 잔재 (aiProcessor, recordsDao, queries, types, pipeline, offlineQueue — ~140줄)
- [x] 데드코드 제거: textSearchRecords 함수 (queries.ts ~34줄)
- [x] 데드코드 제거: pauseRecording/resumeRecording/isRecording (audioRecorder.ts)
- [x] 데드코드 제거: pause/resume hook 로직 (useRecording.ts ~37줄)
- [x] 데드코드 제거: handleRecordPress (SearchScreen.tsx)
- [x] CLAUDE.md Obsidian HQ 참조 추가
- [x] codebase map 생성 (.planning/codebase/ 7개 문서)
- [x] 온보딩 플로우 추가 (OnboardingScreen, ChildContext.isLoaded)
- [x] 아이 이름 STT/AI 컨텍스트 적용 (Whisper 힌트, Gemini 프롬프트)
- [x] CalendarScreen: 월 선택 피커 (AI 분석 기능 완전 제거)
- [x] CalendarScreen AI 분석 완전 제거: aiCacheDao.ts 삭제, analyzeDailySummary 제거, 관련 state/함수/UI/스타일 전부 삭제
- [x] RecordDetailScreen: KeyboardAvoidingView, 편집 시 자동 스크롤
- [x] TypeScript strict 강화 (noUnusedLocals, noUnusedParameters)
- [x] pre-commit TypeScript 타입 체크 hook 설정
- [x] CalendarScreen loadAIAnalysis 선언 순서 버그 수정
- [x] CLAUDE.md, STATE.md 추가 (컨텍스트 엔지니어링)
- [x] pre-commit hook: STATE.md 포함 여부 강제 검증 추가
- [x] iOS 개발 빌드 성공: expo-modules-core 55.x 호환성 shim (Podfile post_install)
- [x] iOS 빌드 수정: UMPromiseResolveBlock/UMPromiseRejectBlock typedef를 EXDefines.h에 shim (expo-av 16.x + expo-notifications)
- [x] 기록 알림 기능: 굿모닝(오전9시)/굿나잇(오후9시) + 커스텀 알람, 설정 화면 슬라이드 토글 (expo-notifications)
- [x] CalendarScreen 날짜 UTC 버그 수정: toISOString() → getFullYear/getMonth/getDate (한국 시간대)
- [x] AI 등대 SearchScreen: 쿼리 임베딩 생성 추가 (generateEmbedding 호출)
- [x] aiProcessor.ts generateEmbedding 8초 AbortController 타임아웃 추가
- [x] 백업/복원 기능: JSON 내보내기(expo-sharing) + 가져오기(expo-document-picker), 덮어쓰기/병합 두 모드
- [x] 프리미엄 UI 리디자인 (다크/라이트 테마, 새 색상 팔레트, AppColors 확장)
- [x] 앱 아이콘 교체: 바다 컨셉 (딥 네이비 + 진주 버튼 + 마이크 + 파도) — scripts/generate-icons.js
- [x] 설정 화면 모드 토글: 씬 카드 → 슬라이드 토글로 교체
- [x] 온보딩 이모지 제거, 시작하기 버튼 다크모드 색상 수정 (primary 사용)
- [x] 홈 빈 상태 문구 개선, 로딩 중 슬로건 표시
- [x] 할루시네이션 방지 강화: Whisper no_speech_prob 세그먼트별 체크, prompt 힌트, STT 빈 결과 저장 차단
- [x] 미분류 기록 불러오기: 바다 삭제 시 기록 이동 옵션 + 설정 미분류 섹션
- [x] Android release APK 빌드 (로컬, 서버 불필요)
- [x] expo-sharing 55.0.11 AAR 바이트코드 패치: FilePermissionService$Permission → expo.modules.interfaces.filesystem.Permission (Python 스크립트로 classes.jar 직접 수정, patch-package 바이너리 diff 포함)
- [x] 스플래시 화면: 슬로건 "기록에 치이지 말고, 그냥 말하세요" 표시 (scripts/generate-splash.js)
- [x] NavigationContainer 단일화: 바다 삭제 시 네비게이션 리셋 버그 수정
- [x] 바다 삭제 후 navigation.goBack() 추가
- [x] ChildContext: refreshChildren 시 stale activeChildId 자동 수정
- [x] iOS 네이티브 STT contextualStrings에 아이 이름 변형 전달 (이름 오인식 방지)
- [x] RecordingScreen: 기록중입니다... 텍스트를 WaveLoader 바로 아래로 이동
- [x] 온보딩 타이틀 줄넘김 수정 ("바다의 이름을 / 지어주세요")
- [x] 설정 화면 테스트 데이터 추가 버튼 (seedData.ts, 10일치 샘플)
- [x] AI 등대 SearchScreen: 쿼리 임베딩 생성 추가 (generateEmbedding 호출)
- [x] GitHub Actions deploy-deno.yml 삭제: Deno Deploy from GitHub 자동배포로 대체
- [x] deno-main.ts v5 주석으로 Deno Deploy 재배포 트리거
- [x] 알림 기능 완전 제거: alarmService.ts 삭제, SettingsScreen.tsx 알람 관련 코드 전체 삭제, app.json expo-notifications 플러그인/권한 제거, package.json 의존성 제거
- [x] mood 필드 완전 제거: types, aiProcessor 프롬프트, recordPipeline, recordsDao, queries, offlineQueue, backupService, RecordCard, RecordDetailScreen (DB 컬럼은 NULL로 유지)
- [x] UX 개선 6종: RecordCard 날짜별 opacity, 캘린더 키보드 시트 이동, 텍스트 입력 selectedDate 적용, 태그 한국어 IME 수정+삭제버튼, AI 캐시 즉시 복원, 캘린더 스와이프 날짜 이동
- [x] TagsScreen: 태그 추가 입력창 키보드에 가려지는 문제 수정 (KeyboardAvoidingView + scrollToOffset)
- [x] AI 무한로딩 근본 원인 수정: callGeminiAPI 15초 타임아웃, 기록 생성 직후 + pull-to-refresh 시 processOfflineQueue 즉시 실행
- [x] 녹음 30초 제한: 자동 종료 + 프로그레스 바 + 20초부터 빨간색 경고
- [x] AI 에러 디버그 로깅 추가 (aiProcessor, recordPipeline)
- [x] Groq Whisper STT 교체: deno-main.ts STT 핸들러를 OpenAI → Groq API로 전환 (비용 9배 절감)
- [x] 후원 계좌 섹션 추가 (설정 화면, 복사 버튼)
- [x] 백업/복원 안내 문구 개선 (카카오톡 나에게 보내기 안내)
- [x] 파일 연동: "다른 앱으로 열기 → 바다"로 백업 파일 바로 복원 (iOS/Android)

---

## 최근 완료된 작업 (이번 세션)

- [x] 태그 버그 근본 수정: setTagsForRecord에 childId 미전달로 tags.child_id=NULL 저장되던 문제 — recordPipeline(2곳) + offlineQueue 수정
- [x] DB v8 마이그레이션: child_id=NULL 잘못 저장된 기존 태그 레코드 child_id 기준으로 복구
- [x] DiaryRecord 타입 + mapRowToRecordWithTags에 childId 필드 추가
- [x] TagsScreen useFocusEffect stale closure 수정 + useEffect([loadTags]) 추가 (activeChild 비동기 로드 대응)
- [x] 바다 선택 모달 선택 항목 색상 개선: primaryLight+primary → primary+textOnPrimary (전 테마 대비 보장)

- [x] app.json name: VibeDiary → 바다 (홈 화면 표시 이름 변경)
- [x] bada-intro.md 포지셔닝 업데이트 (발달장애 특화 → 관찰일지 일반화)
- [x] docs/store-metadata.md 생성 (스토어 메타데이터 확정본)
- [x] scripts/generate-featured-image.js 생성 (Play Store 피처드 이미지 1024×500)
- [x] docs/privacy-policy.html 업데이트 (포지셔닝 일반화, Groq 반영, 알림 권한 제거)
- [x] store-metadata.md 지원 이메일 확정 (aiseossi@gmail.com)
- [x] 태그 개선: 바다별 분리 (DB v7 마이그레이션), 모든 태그 삭제 가능, 이름 수정 UI (✎ 버튼)



- [x] 인앱 업데이트 체크: deno-main.ts v6.4 /version 엔드포인트 + AppNavigator 버전 비교 Alert (force 옵션 포함)
- [x] 재생 기능 완전 제거: playAudio 함수, isPlaying state, soundRef, handlePlayAudio, 음성 섹션 JSX, 관련 스타일 (expo-av는 녹음에 계속 사용)



- [x] RecordCard: 플라스틱 depth 효과 (per-side 보더, 드롭 섀도우)
- [x] HomeScreen 진주 버튼: 유니폼 보더로 복귀 (per-side 보더 → white arc 버그)
- [x] WaveLoader: useNativeDriver:true (scaleY 변환으로 JS 스레드 blocking 방지)
- [x] AppNavigator: 녹음 완료 후 캘린더/홈 탭으로 정확히 복귀
- [x] offlineQueue: 429 쿨다운 5분, INSERT OR IGNORE 중복 방지, aiPending 사전 체크
- [x] schema.ts: offline_queue.record_id UNIQUE 제약 추가
- [x] CalendarScreen: 텍스트 기록 → "직접 입력", 음성 기록 → "음성 기록" 라벨
- [x] CalendarScreen: 오늘 날짜 filled circle (primary 배경 + 흰 숫자) — 밀도색과 겹침 방지
- [x] recordsDao: audioPath || null (빈 문자열 → NULL 저장)
- [x] 캘린더 기록이 홈에 안 뜨는 문제 → 의도된 동작으로 결론, 디버그 로그 제거

- [x] APK 빌드 파일명에 날짜+시간 포함 (bada-releaseMMDDHHmm.apk)
- [x] 앱 소개 문서 생성 (docs/bada-intro.md)
- [x] 미구현 기능 검토 목록 생성 (docs/future-features.md)
- [x] CalendarScreen 텍스트 입력 UI 통일 (빈 날/기록 있는 날 동일 너비)
- [x] AI 등대 검색 개선: offlineQueue embedding 누락 수정, vectorSearch threshold 기반(0.3, max 50건), 패턴 분석 프롬프트, maxOutputTokens 600, compact context 포맷
- [x] STT 환각 필터 강화: 한글 비율 체크, trailing strip, 세그먼트별 재조합
- [x] STT 반복 단어 감지: 같은 단어 3회 연속 반복 → 환각 차단
- [x] Whisper temperature=0 설정 (deno-main.ts v6.3, 환각 전반 감소)
- [x] RecordingScreen: 프로그레스 바 제거, 25초부터 5초 카운트다운
- [x] RecordingScreen: 일시정지 버튼 제거, 종료 버튼만 유지
- [x] 컬러 팔레트 교체: 세이지 그린 (#86A789) — "기록이 쌓여 성장이 되는" 컨셉
- [x] 팔레트 후보 5종 보관 (docs/colorcode.md)

## 최근 완료된 작업 (feat/pretendard-blob, 2026-03-18)

- [x] Pretendard 폰트 4종 적용 (App.tsx useFonts, FONT_FAMILY 상수, TYPOGRAPHY fontFamily)
- [x] babel.config.js 추가 (babel-preset-expo, Metro TypeScript 처리 정상화)
- [x] RecordingScreen: 바 시각화 → OrganicBlob (RN Animated, borderRadius oscillation + audioLevel spring)
- [x] RecordingScreen: 타이머 제거, 마지막 5초 카운트다운만 유지
- [x] 커스텀 태그 AI 자동 적용: buildSystemPrompt(extraTags)로 프롬프트 동적 생성, recordPipeline/offlineQueue에서 DB 커스텀 태그 조회 후 전달
- [x] 3개 탭 헤더 통일: paddingHorizontal 24, fontSize 28 (FONT_SIZE.title), Pretendard-Bold
- [x] SearchScreen 등대 아이콘: 🔦 → MaterialCommunityIcons lighthouse-on
- [x] SearchScreen 빈 상태 안내 문구 교체 (사용법 + 휘발 안내)
- [x] SearchScreen 태그 필터 완전 제거 (버튼, 패널, state, 스타일)

- [x] HomeScreen 바다 선택 chevron: 텍스트 `⌄` → Ionicons `chevron-down` 아이콘 (발견성 개선)

## 최근 완료된 작업 (gitnew, 2026-03-18)

- [x] 전체 코드 점검: 실제 수정 필요 이슈 2건 확인 (offlineQueue race condition, deno-main.ts fetch try-catch)
- [x] 항해일지 기능 구현 (voyage-log OpenSpec 변경):
  - DB: `search_logs` 테이블 + `searchLogsDao.ts` (create/getAll/delete)
  - SearchScreen: 헤더 우상단 항해일지 토글 버튼, 검색 답변 저장 버튼, 항해일지 뷰
  - activeChild 기준 분리, 삭제 확인 Alert 포함
- [x] 기능 점검 3원칙 수립 (앱 안전성 / 유저 친화성 / 토큰 효율성) → memory 저장
- [x] SearchScreen 버그 수정 다수:
  - 항해일지 모드에서 하단 검색 입력창 숨김 (UI 겹침 해결)
  - SafeAreaView edges에 bottom 추가 (Android 네비게이션 바 겹침 수정)
  - CalendarScreen 동일 수정
  - searchPipeline.ts context 날짜 형식 MM-DD → YYYY-MM-DD (AI 연도 오추론 수정)
  - 항해일지 카드 날짜 형식 `M/D` → `YYYY.M.D`
- [x] Recording 화면 전환 애니메이션 slide_from_bottom → none (탭 전환과 통일)
- [x] Recording 모달 다크모드 흰 배경 플래시 수정 (contentStyle backgroundColor 추가)

## 최근 완료된 작업 (main, 2026-03-18)

- [x] AI 항해사 웹 내보내기 포맷 준비: `exportForWeb()` + `WebExportData` 타입 (버튼 미노출)
  - ISO 8601 타임스탬프, refined_text, 태그 인라인, structured_data 객체화
  - 기존 `exportBackup()` 복원 로직 무손상 유지
  - 웹 팀 확정: structured_data는 웹 최초 업로드 시 Gemini 1.5 Flash로 일괄 파싱 → IndexedDB 캐싱
  - 앱 추가 작업 없음. 통합 테스트 요청 시 버튼 노출 예정

## 최근 완료된 작업 (reanimated-chat-upgrade, 2026-03-19)

- [x] babel.config.js에 `react-native-reanimated/plugin` 추가
- [x] OrganicBlob: RN Animated → Reanimated (`useSharedValue` + `useAnimatedStyle` + `withRepeat/withSequence/withSpring`)
- [x] `ScoredRecord` 타입 추가, `SearchResult.sourceRecords` score 포함
- [x] `ChatMessage` 타입 추가 (`id`, `role`, `text`, `sourceRecords?`, `createdAt`)
- [x] searchPipeline.ts: 유사도 0.6 기준 컨텍스트 압축 (이상: full 포맷, 미만: summary만)
- [x] searchPipeline.ts: 슬라이딩 윈도우 conversationHistory 파라미터 추가 (Gemini multi-turn)
- [x] SearchScreen: 채팅 버블 UI (UserBubble/AssistantBubble), FlatList, 자동 스크롤
- [x] AssistantBubble: Reanimated FadeInDown 등장 애니메이션, 근거 N건 접기/펼치기, 저장 버튼
- [x] AssistantBubble isSaving 독립화: 버블마다 저장 상태 분리 (3원칙 검토 후 수정)
- [x] react-native-reanimated 4.2.1, babel-preset-expo package.json 명시 + iOS 재빌드
- [x] SearchScreen: Fragment→View 래핑 (KeyboardAvoidingView 레이아웃 버그 수정)
- [x] 항해일지 독립 탭 분리: VoyageLogScreen 신규, 탭 4개로 확장
- [x] Search 탭 아이콘: 나침반 → 돋보기(search), 항해일지 탭: journal 아이콘
- [x] SearchScreen 단순화: 로그 토글/상태 전부 제거

## 최근 완료된 작업 (테스터 배포 전 감사, 2026-03-19)

- [x] eas.json 하드코딩 시크릿 제거 (preview env 블록 삭제)
- [x] .env.example 생성
- [x] 미사용 GROQ_API_KEY .env에서 제거
- [x] 빈 catch 블록 보강 (ChildContext, VoyageLogScreen, SettingsScreen)
- [x] babel-plugin-transform-remove-console: 프로덕션 빌드 console 자동 제거 (process.env.NODE_ENV 사용)
- [x] 접근성 라벨 추가 (HomeScreen, SearchScreen, RecordingScreen, VoyageLogScreen)
- [x] Android versionCode 추가 (app.json)

- [x] 탭 화면 SafeAreaView edges 통일 (bottom 제거 — 탭 바 겹침 수정)
- [x] SearchScreen Android KeyboardAvoidingView behavior undefined (탭 바 뒤 입력창 겹침 수정)
- [x] OrganicBlob 스프링 튜닝 (damping 14, stiffness 90, 배율 0.35 — Android 촐싹거림 완화)
- [x] 탭 바 height 고정값 제거 → paddingTop/Bottom 방식 (입력창 겹침 근본 수정)

## 최근 완료된 작업 (main, 2026-03-19 UX 개선)

- [x] CalendarScreen 날짜 카드 스와이프 슬라이드 애니메이션 (드래그 추적 + 밀어내기/밀어넣기 전환)
- [x] SearchScreen 키보드 입력창 슬라이드업: behavior="padding" 통일 + keyboardVerticalOffset(tabBarHeight)
- [x] AI 등대 검색 환각 방지 (방안 E):
  - 유사도 임계값 0.3→0.55, 최대 반환 50→10건
  - 평균 유사도 <0.5 거부 메커니즘
  - 프롬프트 인용 강제 + 무관 기록 거부 규칙
  - fallback(무관한 최근 기록 반환) 완전 제거
- [x] EAS 프로젝트 aiseossi 계정으로 이전 (projectId/owner 변경)
- [x] .gitignore keystore/credentials 보안 패턴 추가
- [x] iOS Info.plist NSPhotoLibraryUsageDescription 권한 추가
- [x] expo 패키지 버전 업데이트 (expo 55.0.5, expo-sqlite 55.0.11 등)
- [x] react-native-worklets 0.7.2 추가

## 최근 완료된 작업 (2026-03-25)

- [x] Android "다른 앱으로 열기" 수정:
  - AndroidManifest.xml에 intent filter 3종 추가 (application/json, application/octet-stream, text/plain)
  - AppNavigator: content:// URI도 허용하도록 URL 체크 완화
  - backupService: content:// URI → 캐시 복사 후 읽기 + finally 블록에서 임시 파일 삭제
- [x] iOS TestFlight 미업데이트 원인 파악:
  - eas build는 잘 됐으나 eas submit을 누락한 것이 원인
  - build 5 (eee9db11, 3.24)가 이미 제출 성공 상태였음
  - App Store Connect에서 외부 테스터 그룹에 build 5 수동 추가 완료 (직접 처리)
- [x] 설정 화면 버전 동적 표시: expo-constants + expo-application으로 v{version} (build {nativeBuildVersion})
- [x] CHANGELOG.md 생성 (build 1~5 소급 정리)
- [x] iOS TestFlight 배포 워크플로우 확립:
  - eas build → eas submit (내가 처리)
  - App Store Connect 테스터 그룹 빌드 추가 → 직접 처리 (터미널로 불가)

## 최근 완료된 작업 (2026-03-29, tag-system-overhaul)

- [x] schema.ts: tags 테이블 child_id 추가, UNIQUE(name, child_id), MIGRATE_TAGS_V3
- [x] database.ts: v3 마이그레이션 (tags 테이블 재생성)
- [x] tagsDao.ts: getAllTags/createTag/getTagsWithCount에 childId 필터, isDefault 플래그 추가
- [x] recordPipeline.ts: BASE_TAG_NAMES 하드코딩 제거 → DEFAULT_TAGS import
- [x] offlineQueue.ts: baseTags 하드코딩 제거 → DEFAULT_TAGS import
- [x] TagsScreen.tsx: getTagsWithCount/createTag에 activeChild.id 전달, 기본 태그 삭제 버튼 숨김
- [x] RecordDetailScreen.tsx: 태그 편집 UI 추가 (전체 태그 선택 피커, 저장/취소)

## 최근 완료된 작업 (2026-03-29)

- [x] Android 앱 아이콘 수정: android-icon-foreground.png를 새 아이콘으로 업데이트 (3/21 icon.png 교체 시 누락됐던 것)
- [x] 다크모드 마이크 아이콘 색상 수정: 8종 팔레트 micIcon을 primaryLight로 통일 (기존 border색과 동일해 안보이던 문제)
- [x] improve-embedding-source OpenSpec 아카이브 + spec sync
- [x] offlineQueue force 파라미터 + 수동 처리 피드백 개선
  - processOfflineQueue(force=true): 쿨다운 무시, QueueProcessResult 반환 (ok/empty/offline/already_running/cooldown)
  - SettingsScreen 수동 처리 버튼: 상태별 명확한 메시지 (오프라인, 처리 중, 없음 등)
- [x] 텍스트 검색 limit 제거: 특정 키워드 포함 기록 전체 반환 (오래된 기록도 검색 가능)
- [x] AI 등대 텍스트 검색 폴백 추가: 키워드 단어가 raw_text/summary에 직접 포함된 기록도 검색
  - queries.ts: textSearchRecords(keywords, childId) 추가 (LIKE 검색, 최대 20건)
  - searchPipeline.ts: extractKeywords() + 벡터/텍스트 병렬 실행 + 결과 병합 (텍스트 매칭은 score 0.5)
  - 텍스트 매칭 결과가 있으면 평균 유사도 거부 로직 건너뜀
- [x] 임베딩 소스 합성 (improve-embedding-source): buildEmbeddingText(rawText, summary) 도입
  - aiProcessor.ts에 buildEmbeddingText 추가 (raw+summary 합성, 중복 시 하나만 사용)
  - recordPipeline.ts 2곳, offlineQueue.ts 1곳, SettingsScreen.tsx 재색인 1곳 적용

## 최근 완료된 작업 (2026-03-27)

- [x] AI 등대 검색 임베딩 소스 변경: summary → raw_text (약물명, 수치 등 구체적 단어 검색 가능)
  - recordPipeline.ts 2곳, offlineQueue.ts 1곳 수정
  - 테스터 피드백: "류코보린 20mg증량한날" 검색 미검출 → 근본 원인 수정
- [x] 설정 화면 검색 재색인 버튼 추가 (백업/복원 카드 하단)
  - getAllRecordsForReindex() DAO 함수 추가
  - 기존 기록 raw_text 기반 임베딩 일괄 재생성, Alert 확인 후 실행
- [x] 인앱 팔레트 선택 기능 (유저 기능, 설정 화면 노출)
  - theme.ts: PaletteKey 타입 + PALETTES 레코드 8종 (세이지/에메랄드/골드/앰버/칼름블루/딥오션/맑은하늘/슬레이트네이비)
  - ThemeContext: palette 상태 + setPalette 추가, app_settings.json에 저장
  - SettingsScreen: 색상 스와치 UI (화면 모드 카드 하단, 선택 원형 표시)
  - docs/colorcode.md: 블루 3종 팔레트 추가

## 최근 완료된 작업 (2026-03-30)

- [x] AI summary 문체 고정: ~함/~음 체로 통일 (aiProcessor.ts buildSystemPrompt 규칙 추가)
- [x] TagsScreen 커스텀 태그 색상 다양화: 이름 해시 기반 8색 팔레트 배정 (항상 동일 색상 보장)
- [x] AI 등대 전체 컨텍스트 검색으로 전환 (full-context-ai-search): 벡터 임베딩 제거, 전체 기록을 LLM에 직접 전달, 날짜/집계/의미론 모든 질문 처리 가능
- [x] HomeScreen 기록 10개 고정 표시, 무한스크롤/푸터 스피너 제거
- [x] AI 등대 프롬프트 개선: 아이 이름 컨텍스트 주입, 멀티턴 연속성 규칙 추가, structuredData 전체 태그 확장(의료 한정 제거)
- [x] AI 등대 대화 기억 창 4→8 메시지 확장
- [x] CHANGELOG.md 재정비: 현재 배포 현황 표 + 빌드 체크리스트 + iOS/Android 분리 기록
- [x] app.json Android versionCode 4→5 (다음 빌드용)
- [x] .easignore build-*.apk + /apk 추가 (EAS 업로드 사이즈 727MB→80MB 수준으로 감소)
- [x] scripts/bump-android-version.js 추가 (app.json + build.gradle versionCode 동시 bump)
- [x] iOS build 9 / Android versionCode 6 배포 (2026-03-30)

## 최근 완료된 작업 (2026-04-02)

- [x] Android AI 등대 입력창 키보드 위치 버그 수정: adjustNothing + behavior='height' + keyboardVerticalOffset=0 (adjustResize 타이밍 불일치 근본 수정)
- [x] 사진 첨부 기능 백로그 등록 (999.1): 해비유저 페르소나 니즈, 핵심 플로우 안정화 후 재검토

## 진행 중인 작업

(없음)

## 미해결 이슈 (다음 세션)

(없음)

## 최근 완료된 작업 (2026-03-24 — 미비 정리)

- [x] offlineQueue.ts: cancelRetry() 미사용 export 삭제
- [x] CLAUDE.md: child-profile 아카이브 완료 언급 제거

## 최근 완료된 작업 (2026-03-24)

- [x] AI 무한로딩 근본 수정:
  - callGeminiAPI 타임아웃 15초 → 25초 (Deno cold start + LTE 지연 커버)
  - offlineQueue 지수 백오프 자동 재시도 (10s→30s→1m→2m, 실패 시 자동 복구)
  - offlineQueue 처리 완료 콜백 메커니즘 (onQueueProcessed)
  - RecordDetailScreen aiPending 배너 자동 갱신 (큐 처리 완료 구독)
  - Deno Deploy warm 핑 (warmDeno, 4분 간격, /health 엔드포인트)
  - HomeScreen 포커스 + 녹음 화면 진입 시 warmDeno 호출
  - warmDeno AbortSignal.timeout → AbortController (Hermes 호환성 수정)

## 최근 완료된 작업 (2026-03-22)

- [x] aiseossi-knowledge 서브모듈 연결 → 독립 클론으로 전환 (../aiseossi-knowledge)
- [x] CLAUDE.md에 공유 지식 참조 섹션 추가

## 최근 완료된 작업 (dead-code-cleanup, 완료 2026-03-21)

- [x] `STTReviewScreen.tsx` 삭제 (고아 파일)
- [x] `getRecordsByTagNames()` 삭제 (`src/db/queries.ts`)
- [x] `RecordTag` interface 삭제 (`src/types/record.ts`)
- [x] `COLORS` export 삭제 (`src/constants/theme.ts`)
- [x] `USER_PROMPT_TEMPLATE` `{subjectLine}` 플레이스홀더 제거 (`aiProcessor.ts`)
- [x] whisperSTT 30초 AbortController 타임아웃 추가 (`stt.ts`)
- [x] recordPipeline DB 저장 구간 트랜잭션 적용 (createRecord + setTagsForRecord + addToOfflineQueue)
- [x] RecordingScreen 무음/저음량 취소 시 임시 오디오 파일 삭제 (스토리지 누수 수정)
- [x] `processRecording()` 삭제 — recordPipeline.ts (미사용, processFromText로 대체됨)
- [x] `FONT_FAMILY` 상수 삭제 — theme.ts (미사용)
- [x] `removeTagFromRecord()` 삭제 — tagsDao.ts (미사용)
- [x] `WebExportData`/`exportForWeb()` 삭제 — backupService.ts (미사용)
- [x] export → 내부 함수 전환: requestAudioPermission, cosineSimilarity, addTagToRecord, getRecordsByDateRange, TagChipProps
- [x] app.json: ITSAppUsesNonExemptEncryption: false 추가, Android versionCode 2

## 최근 버그 수정

- [x] 연속 녹음 시 "only one recording object can be prepared" 에러 수정 (`audioRecorder.ts`)
- [x] 소음 환경 할루시네이션: Whisper verbose_json + no_speech_prob 필터 추가 (`stt.ts`)
- [x] 앱 로고 "바다" 로 교체 (assets/)
- [x] 라이트 모드 색상 개선 (배경 #F8FAFC, 텍스트 슬레이트 표준화)
- [x] 그림자 opacity 완화 (0.3~0.5 → 0.06~0.08, 소프트 카드 스타일)
- [x] 녹음 완료 후 버튼 미사라짐: isProcessing 시 controls 숨기고 "기록중입니다..." 표시
- [x] expo-av + expo-modules-core 55.x 빌드 충돌 해결 (UMPromiseResolveBlock shim 포함)
- [x] expo-sharing 백업 내보내기 NoClassDefFoundError 수정: 사전 빌드된 AAR의 바이트코드를 Python으로 직접 패치
- [x] 캘린더 당일 표시 하루 전 오표시: toISOString() UTC 버그 수정 (한국 UTC+9)
- [x] AI 등대 임베딩 null로 검색 실패: generateEmbedding 호출 누락 수정
- [x] "permissions module not found" 오류 수정
- [x] metro.config.js mock 제거
- [x] AI 요약 → 정제 방식 전환
- [x] AI 프롬프트에서 아이 이름 힌트 제거
- [x] 바다 삭제 시 NavigationContainer 리셋으로 뒤로가기 버튼 사라지는 버그 수정
- [x] iOS STT "지투" → "질투" 오인식: contextualStrings로 이름 힌트 전달
- [x] 스플래시 구버전 로고: SplashScreenLegacy 이미지 슬로건 PNG로 교체

---

## 알려진 문제 / 기술부채

- cloudflare-worker는 tsconfig에서 제외됨 (Deno 런타임 타입 충돌)
- **Gemini 유료 플랜 전환 완료** (2026-03-17, aiseossi@gmail.com Individual 계정)

---

## 다음 세션 시작 전 참고

- AI 무한로딩은 코드 버그가 아닌 **Gemini API 일일 할당량 초과(429)** 였음 (2026-03-15)
- 내일(2026-03-16) 자정(UTC) 리셋되면 자동 복구
- 큐에 쌓인 "AI 처리 중" 기록들은 앱 재시작 시 자동 재처리됨
- 장기적으로 모델 교체 또는 유료 플랜 검토 필요

## 다음 계획

- [x] child-profile OpenSpec 변경 아카이브
- [ ] 앱 전체 dead code 감사 (진행 중)
- [x] 기록 알림 기능: 굿모닝/굿나잇 + 커스텀 알람, 설정 화면 토글 (expo-notifications)
- [x] 백업/복원 기능: JSON 파일 내보내기/가져오기 (설정 화면) → `/openspec-new` 권장
- [x] AI 등대 탭 구현 (SearchScreen — 이미 완성)

## v2로 이관 (현재 범위 밖)

- family-sync (이벤트 로그 기반 가족 동기화)
- AI 등대 로컬 LLM 전환 (llama.rn 등)
- 잠금화면 위젯 / 빠른 녹음 트리거

---

## 주요 결정사항

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-03-10 | pre-commit TypeScript hook 도입 | 코드 삭제 시 영향 범위 자동 감지 |
| 2026-03-10 | noUnusedLocals/noUnusedParameters 활성화 | dead code 컴파일 타임 탐지 |
| 2026-03-10 | 코드 삭제 시 완전 삭제 원칙 | 기술부채 방지 |
| 2026-03-12 | Podfile post_install으로 expo-av 호환 shim | expo-av 16.x가 expo-modules-core 55.x와 빌드 충돌, 삭제된 헤더/매크로/타입 shimming |
| 2026-03-12 | NavigationContainer 단일화 | 조건부 이중 NC로 인한 바다 삭제 시 네비게이션 리셋 버그 |
| 2026-03-07 | Deno Deploy를 기본 프록시로 | Cloudflare Worker 대비 설정 간편 |
| 2026-03-04 | 모든 API 호출을 Worker 프록시 경유 | 클라이언트에 API 키 노출 방지 |
