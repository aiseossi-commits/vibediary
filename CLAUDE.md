# VibeDiary — Claude 작업 지침

## 프로젝트 개요

발달장애인 돌봄 가족을 위한 음성 기록 앱. 녹음 → STT → AI 요약 → DB 저장의 파이프라인으로 일상 돌봄 기록을 자동 정리한다.

**핵심 가치**: 빠르고 간편하게 기록, 아이별 데이터 분리, 오프라인에서도 동작

---

## 기술 스택

- **프레임워크**: React Native + Expo (TypeScript strict)
- **DB**: expo-sqlite (`src/db/database.ts`, 10s 타임아웃)
- **STT**: iOS 네이티브 → Whisper fallback (Deno Deploy 프록시)
- **AI**: Gemini 2.5 Flash Lite (Deno Deploy 프록시)
- **프록시**: `https://vibediary.aiseossi-commits.deno.net` (`cloudflare-worker/deno-main.ts`)
- **인증**: `X-App-Secret` 헤더 (`EXPO_PUBLIC_WORKER_SECRET` 환경변수)

---

## 아키텍처

```
녹음(RecordingScreen)
  → STT(stt.ts: 디바이스 → Whisper fallback)
  → AI(aiProcessor.ts: Gemini via Worker)
  → DB(recordsDao.ts: expo-sqlite)
  → 오프라인 큐(offlineQueue.ts: 네트워크 복구 시 재처리)
```

**핵심 파일:**
- `src/navigation/AppNavigator.tsx` — 라우팅, 온보딩 분기, RecordingScreenWrapper
- `src/context/ChildContext.tsx` — 활성 아이 상태 전역 관리 (isLoaded 포함)
- `src/services/recordPipeline.ts` — STT + AI + DB 통합 파이프라인
- `src/services/stt.ts` — 무음 감지, 환각 필터, 이름 변형 힌트
- `src/services/aiProcessor.ts` — Gemini 호출, 프롬프트 인젝션 방어
- `src/db/schema.ts` — children, records, tags 테이블 정의

---

## 코딩 규칙

### 커밋 전 필수 절차 (이 순서대로)
1. `STATE.md` 업데이트 — 완료된 작업, 진행 중인 작업, 다음 계획 반영
2. `git add STATE.md` — STATE.md를 반드시 같은 커밋에 포함
3. 커밋 — pre-commit hook이 STATE.md 포함 여부 + 타입 체크 자동 검증

### 반드시 지킬 것
- 커밋 시 STATE.md를 항상 함께 업데이트하고 같은 커밋에 포함 (hook이 강제함)
- 코드 수정 후 `npx tsc --noEmit` 통과 확인 (pre-commit hook이 자동 실행)
- API 직접 호출 금지 — 모든 Gemini/Whisper 호출은 Worker 프록시 경유
- 환경변수는 `EXPO_PUBLIC_` 접두어 사용 (클라이언트 번들 포함)
- `JSON.parse()` 항상 try-catch로 감싸기
- async 락(isProcessingQueue 등)은 반드시 try/finally로 해제

### 절대 하지 말 것
- 코드 제거 요청 시 주석 처리나 덮어씌우기 금지 — **완전 삭제**
- 삭제 후 반드시 `npx tsc --noEmit`으로 영향받는 파일 확인
- 다른 곳에서 참조하는 코드 삭제 시 참조하는 쪽도 함께 처리 (또는 명시적으로 보고)
- `EXPO_PUBLIC_` 환경변수를 직접 API 키로 사용 금지 (Worker secret은 허용)

### 스타일
- 모든 UI 상수는 `src/constants/theme.ts`의 SPACING, FONT_SIZE, BORDER_RADIUS 사용
- 색상은 `useTheme()` colors 객체 사용, 하드코딩 금지
- StyleSheet는 `createStyles(colors)` 패턴으로 컴포넌트 외부에 정의

---

## 현재 앱 구조

**화면:**
- `OnboardingScreen` — 최초 실행, 아이 프로필 없을 때
- `HomeScreen` — 메인 (녹음 버튼, 최근 기록)
- `CalendarScreen` — 월별 기록 + AI 일별 분석
- `SearchScreen` — 벡터 유사도 검색
- `TagsScreen` — 태그별 기록 조회
- `RecordDetailScreen` — 기록 상세/편집
- `SettingsScreen` — 아이 프로필 관리, 테마

**데이터 흐름:**
- 아이 프로필 없음 → OnboardingScreen
- 아이 프로필 있음 → 메인 탭 네비게이터
- 모든 기록 조회는 `activeChild.id` 기준 필터링

---

## 변경 관리 (OpenSpec)

새 기능은 OpenSpec 워크플로우로 관리:
1. `/openspec-ff-change` — 설계 아티팩트 생성
2. `/openspec-apply-change` — 코드 구현
3. `/openspec-verify-change` — 검증
4. `/openspec-archive-change` — 완료

진행 중인 변경: `openspec/changes/child-profile/` (아카이브 필요)

---

## 보안

- Worker 모델 allowlist 검증 (`ALLOWED_MODELS`)
- Worker 크기 제한: STT 25MB, AI body 100KB
- 프롬프트 인젝션 방어: 사용자 입력을 `<user_input>` XML 태그로 감싸기
