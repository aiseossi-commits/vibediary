# STATE.md — 현재 작업 상태

> 세션 시작 시 이 파일을 읽어 맥락을 파악하고, 작업 완료 후 업데이트한다.

---

## 현재 위치

**마지막 커밋**: `feat: 기록 알림 기능 (굿모닝/굿나잇 + 커스텀 알람)` (2026-03-13)

**현재 브랜치**: main

---

## 최근 완료된 작업

- [x] 온보딩 플로우 추가 (OnboardingScreen, ChildContext.isLoaded)
- [x] 아이 이름 STT/AI 컨텍스트 적용 (Whisper 힌트, Gemini 프롬프트)
- [x] CalendarScreen: 월 선택 피커, AI stale 표시
- [x] RecordDetailScreen: KeyboardAvoidingView, 편집 시 자동 스크롤
- [x] TypeScript strict 강화 (noUnusedLocals, noUnusedParameters)
- [x] pre-commit TypeScript 타입 체크 hook 설정
- [x] CalendarScreen loadAIAnalysis 선언 순서 버그 수정
- [x] CLAUDE.md, STATE.md 추가 (컨텍스트 엔지니어링)
- [x] pre-commit hook: STATE.md 포함 여부 강제 검증 추가
- [x] iOS 개발 빌드 성공: expo-modules-core 55.x 호환성 shim (Podfile post_install)
- [x] 프리미엄 UI 리디자인 (다크/라이트 테마, 새 색상 팔레트, AppColors 확장)
- [x] 앱 아이콘 교체: 바다 컨셉 (딥 네이비 + 진주 버튼 + 마이크 + 파도) — scripts/generate-icons.js
- [x] 설정 화면 모드 토글: 씬 카드 → 슬라이드 토글로 교체
- [x] 온보딩 이모지 제거, 시작하기 버튼 다크모드 색상 수정 (primary 사용)
- [x] 홈 빈 상태 문구 개선, 로딩 중 슬로건 표시
- [x] 할루시네이션 방지 강화: Whisper no_speech_prob 세그먼트별 체크, prompt 힌트, STT 빈 결과 저장 차단
- [x] 미분류 기록 불러오기: 바다 삭제 시 기록 이동 옵션 + 설정 미분류 섹션
- [x] Android release APK 빌드 (로컬, 서버 불필요)
- [x] 스플래시 화면: 슬로건 "기록에 치이지 말고, 그냥 말하세요" 표시 (scripts/generate-splash.js)
- [x] NavigationContainer 단일화: 바다 삭제 시 네비게이션 리셋 버그 수정
- [x] 바다 삭제 후 navigation.goBack() 추가
- [x] ChildContext: refreshChildren 시 stale activeChildId 자동 수정
- [x] iOS 네이티브 STT contextualStrings에 아이 이름 변형 전달 (이름 오인식 방지)
- [x] RecordingScreen: 기록중입니다... 텍스트를 WaveLoader 바로 아래로 이동
- [x] 온보딩 타이틀 줄넘김 수정 ("바다의 이름을 / 지어주세요")
- [x] 설정 화면 테스트 데이터 추가 버튼 (seedData.ts, 10일치 샘플)
- [x] AI 등대 SearchScreen: 쿼리 임베딩 생성 추가 (generateEmbedding 호출)
- [x] GitHub Actions deploy-deno.yml: 프로젝트명 vibediary-proxy → vibediary 수정

---

## 진행 중인 작업

없음

## 최근 버그 수정

- [x] 연속 녹음 시 "only one recording object can be prepared" 에러 수정 (`audioRecorder.ts`)
- [x] 소음 환경 할루시네이션: Whisper verbose_json + no_speech_prob 필터 추가 (`stt.ts`)
- [x] 앱 로고 "바다" 로 교체 (assets/)
- [x] 라이트 모드 색상 개선 (배경 #F8FAFC, 텍스트 슬레이트 표준화)
- [x] 그림자 opacity 완화 (0.3~0.5 → 0.06~0.08, 소프트 카드 스타일)
- [x] 녹음 완료 후 버튼 미사라짐: isProcessing 시 controls 숨기고 "기록중입니다..." 표시
- [x] expo-av + expo-modules-core 55.x 빌드 충돌 해결
- [x] "permissions module not found" 오류 수정
- [x] metro.config.js mock 제거
- [x] AI 요약 → 정제 방식 전환
- [x] AI 프롬프트에서 아이 이름 힌트 제거
- [x] 바다 삭제 시 NavigationContainer 리셋으로 뒤로가기 버튼 사라지는 버그 수정
- [x] iOS STT "지투" → "질투" 오인식: contextualStrings로 이름 힌트 전달
- [x] 스플래시 구버전 로고: SplashScreenLegacy 이미지 슬로건 PNG로 교체

---

## 알려진 문제 / 기술부채

- `openspec/changes/child-profile/` 변경이 구현됐지만 아카이브되지 않음
- cloudflare-worker는 tsconfig에서 제외됨 (Deno 런타임 타입 충돌)

---

## 다음 계획

- [ ] child-profile OpenSpec 변경 아카이브
- [ ] 앱 전체 dead code 감사 (OpenSpec 도입 이전 코드)
- [x] 기록 알림 기능: 굿모닝/굿나잇 + 커스텀 알람, 설정 화면 토글 (expo-notifications)
- [ ] 백업/복원 기능: JSON 파일 내보내기/가져오기 (설정 화면)
- [ ] AI 등대 탭 구현

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
