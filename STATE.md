# STATE.md — 현재 작업 상태

> 세션 시작 시 이 파일을 읽어 맥락을 파악하고, 작업 완료 후 업데이트한다.

---

## 현재 위치

**마지막 커밋**: `feat: 후원 계좌, 백업 UX 개선, 파일 연동` (2026-03-17)

**현재 브랜치**: main

---

## 최근 완료된 작업

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

## 진행 중인 작업

(없음)

## 최근 완료된 작업 (dead-code-cleanup)

- [x] `STTReviewScreen.tsx` 삭제 (고아 파일)
- [x] `getRecordsByTagNames()` 삭제 (`src/db/queries.ts`)
- [x] `RecordTag` interface 삭제 (`src/types/record.ts`)
- [x] `COLORS` export 삭제 (`src/constants/theme.ts`)
- [x] `USER_PROMPT_TEMPLATE` `{subjectLine}` 플레이스홀더 제거 (`aiProcessor.ts`)
- [x] whisperSTT 30초 AbortController 타임아웃 추가 (`stt.ts`)
- [x] recordPipeline DB 저장 구간 트랜잭션 적용 (createRecord + setTagsForRecord + addToOfflineQueue)
- [x] RecordingScreen 무음/저음량 취소 시 임시 오디오 파일 삭제 (스토리지 누수 수정)

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
- [ ] 앱 전체 dead code 감사 (OpenSpec 도입 이전 코드) → `/openspec-explore` 권장
- [x] 기록 알림 기능: 굿모닝/굿나잇 + 커스텀 알람, 설정 화면 토글 (expo-notifications)
- [x] 백업/복원 기능: JSON 파일 내보내기/가져오기 (설정 화면) → `/openspec-new` 권장
- [x] AI 등대 탭 구현 (SearchScreen — 이미 완성)

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
