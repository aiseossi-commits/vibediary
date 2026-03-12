# STATE.md — 현재 작업 상태

> 세션 시작 시 이 파일을 읽어 맥락을 파악하고, 작업 완료 후 업데이트한다.

---

## 현재 위치

**마지막 커밋**: `0879c3c feat: 홈화면 UI 개선, DB 안정성 강화, '바다' 용어 통일` (2026-03-12)

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

---

## 진행 중인 작업

없음

## 최근 버그 수정

- [x] 연속 녹음 시 "only one recording object can be prepared" 에러 수정 (`audioRecorder.ts`)
- [x] 소음 환경 할루시네이션: Whisper verbose_json + no_speech_prob 필터 추가 (`stt.ts`)
- [x] 앱 로고 "바다" 로 교체 (assets/)
- [x] 라이트 모드 색상 개선 (배경 #F8FAFC, 텍스트 슬레이트 표준화)
- [x] 그림자 opacity 완화 (0.3~0.5 → 0.06~0.08, 소프트 카드 스타일)
- [x] 녹음 완료 후 버튼 미사라짐: isProcessing 시 controls 숨기고 "기록중입니다..." 표시 (`RecordingScreen.tsx`)
- [x] expo-av + expo-modules-core 55.x 빌드 충돌 해결 (Podfile shim: EXFatal, EXLogWarn/Error/Info, UMPromise* 등)
- [x] "permissions module not found" 오류 수정 (EXPermissionsServiceAdapter.m — EXPermissionsService를 EXModuleRegistry에 등록)
- [x] metro.config.js mock 제거 (개발 빌드에서는 실제 네이티브 모듈 사용)
- [x] AI 요약 → 정제 방식 전환: 압축·재해석 금지, 빈도어·인과관계·행위주체 보존
- [x] AI 프롬프트에서 아이 이름 힌트 제거 (요약에 이름이 자동 삽입되던 문제 해결)

---

## 알려진 문제 / 기술부채

- `openspec/changes/child-profile/` 변경이 구현됐지만 아카이브되지 않음
- cloudflare-worker는 tsconfig에서 제외됨 (Deno 런타임 타입 충돌)

---

## 다음 계획

- [ ] child-profile OpenSpec 변경 아카이브
- [ ] 앱 전체 dead code 감사 (OpenSpec 도입 이전 코드)

---

## 주요 결정사항

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-03-10 | pre-commit TypeScript hook 도입 | 코드 삭제 시 영향 범위 자동 감지 |
| 2026-03-10 | noUnusedLocals/noUnusedParameters 활성화 | dead code 컴파일 타임 탐지 |
| 2026-03-10 | 코드 삭제 시 완전 삭제 원칙 | 기술부채 방지 |
| 2026-03-12 | Podfile post_install으로 expo-av 호환 shim | expo-av 16.x가 expo-modules-core 55.x와 빌드 충돌, 삭제된 헤더/매크로/타입 shimming |
| 2026-03-07 | Deno Deploy를 기본 프록시로 | Cloudflare Worker 대비 설정 간편 |
| 2026-03-04 | 모든 API 호출을 Worker 프록시 경유 | 클라이언트에 API 키 노출 방지 |
