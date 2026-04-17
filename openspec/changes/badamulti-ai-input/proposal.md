## Why

AI 입력 모드(진주 버튼 롱프레스)가 날짜별 분리는 구현됐지만, 유저 페르소나 시뮬레이션에서 3개 갭이 드러남: 요일·패턴 표현 처리 불확실, 쌍둥이·복수 아이 페르소나 미지원, 이벤트 트래킹과 분리돼 "어제부터 열 났어"가 기록으로만 저장되고 이벤트로는 등록 안 됨. 발견성 문제도 있어 버튼 힌트 없이는 기능 존재 자체를 모름.

## What Changes

- `parseMultiEntries` 프롬프트에 요일·패턴("월수금에", "이번주 내내") 처리 규칙 추가
- `parseMultiEntries` 반환 타입에 `childName?`, `eventHint?` 필드 추가
- `HomeScreen` 인라인 처리 로직: childName → childId 매핑 후 아이별 저장
- `HomeScreen` 인라인 처리 로직: `eventHint` 있으면 `active_events` 자동 등록
- 진주 버튼 하단 힌트 레이블 상시 표시 ("길게 눌러서 AI 입력")

## Capabilities

### New Capabilities
- `ai-input-weekday-pattern`: "월수금에 치료", "이번주 내내 약 먹었어" → 요일·범위 파싱해 복수 날짜로 분리
- `ai-input-multi-child`: 발화에서 아이 이름 감지 → childId 자동 라우팅
- `ai-input-event-trigger`: 발화에서 이벤트 시작 의도 감지(발열, 발작, 수면 등) → EventTracker 자동 등록
- `ai-input-discoverability`: 진주 버튼 하단 힌트 레이블 상시 노출

### Modified Capabilities
- `stt-auto-save`: AI 입력 모드 파이프라인에서 childId 분기 처리 추가 (기존 단일 childId → 항목별 childId)

## Impact

- `src/services/aiProcessor.ts`: `parseMultiEntries` 반환 타입 확장 (`childName?`, `eventHint?`)
- `src/screens/HomeScreen.tsx`: processInlineRecording 로직 확장 (child 매핑, event 등록)
- `src/context/ChildContext.tsx`: children 목록 접근 (이미 있음, 사용 추가)
- `src/db/eventDao.ts`: `createEvent` 또는 `startEvent` 호출 (기존 함수 재사용)
- 외부 의존성 없음 — 기존 인프라 재조합
