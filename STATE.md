# STATE.md — 현재 작업 상태

> 세션 시작 시 이 파일을 읽어 맥락을 파악하고, 작업 완료 후 업데이트한다.

---

## 현재 위치

**마지막 커밋**: `23b88fd chore: TypeScript strict 강화 및 dead code 정리` (2026-03-10)

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

---

## 진행 중인 작업

없음

## 최근 버그 수정

- [x] 연속 녹음 시 "only one recording object can be prepared" 에러 수정 (`audioRecorder.ts`)

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
| 2026-03-07 | Deno Deploy를 기본 프록시로 | Cloudflare Worker 대비 설정 간편 |
| 2026-03-04 | 모든 API 호출을 Worker 프록시 경유 | 클라이언트에 API 키 노출 방지 |
