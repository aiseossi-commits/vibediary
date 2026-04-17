## 1. parseMultiEntries 반환 타입 및 프롬프트 확장

- [x] 1.1 `aiProcessor.ts`: `ParsedEntry` 타입에 `childName?: string`, `eventHint?: string` 필드 추가
- [x] 1.2 `aiProcessor.ts`: `parseMultiEntries` 시스템 프롬프트에 오늘 요일 전달 (`오늘: YYYY-MM-DD (요일)` 형식)
- [x] 1.3 `aiProcessor.ts`: 프롬프트에 요일·범위 파싱 규칙 추가 — "월수금에", "이번주 내내" → 복수 날짜, 미래 날짜 금지
- [x] 1.4 `aiProcessor.ts`: 프롬프트에 아이 이름 감지 규칙 추가 — 이름 있으면 `childName` 포함
- [x] 1.5 `aiProcessor.ts`: 프롬프트에 이벤트 감지 규칙 추가 — 발열/발작/수면문제/공격행동 시작 → `eventHint` 포함, 치료방문·투약은 제외
- [x] 1.6 `aiProcessor.ts`: `responseMimeType: 'application/json'` 추가 (구조화 출력 보장)

## 2. HomeScreen 처리 로직 확장

- [x] 2.1 `HomeScreen.tsx`: `children` 목록을 `useChild()`에서 가져와 `processInlineRecording`에서 접근 가능하게 함
- [x] 2.2 `HomeScreen.tsx`: `childName → childId` 매핑 헬퍼 작성 (정확 매칭 → includes 부분 매칭 → activeChild fallback)
- [x] 2.3 `HomeScreen.tsx`: `processInlineRecording` 루프에서 항목별 childId 분기 적용
- [x] 2.4 `HomeScreen.tsx`: `eventHint` 있는 항목 처리 — `getActiveEvents` 조회 후 중복 없으면 `createEvent` 호출
- [x] 2.5 `HomeScreen.tsx`: 저장 결과 메시지 개선 — 단순 "N개 저장" 대신 복수 아이 분기 시 "수진 2개, 민준 1개" 형식
- [x] 2.6 `HomeScreen.tsx`: `createEvent` import 추가 (`../db/eventDao`)

## 3. 발견성 — 힌트 레이블

- [x] 3.1 `HomeScreen.tsx`: `createStyles`에 `pearlHintText` 스타일 추가 (작고 흐린 텍스트)
- [x] 3.2 `HomeScreen.tsx`: PearlButton 하단에 "길게 눌러서 AI 입력" 레이블 — 녹음 중·처리 중 아닐 때만 표시

## 4. 검증

- [x] 4.1 `npx tsc --noEmit` 통과 확인
- [ ] 4.2 단일 항목 발화 테스트 — 기존 동작 유지 확인
- [ ] 4.3 복수 날짜 발화 테스트 — 캘린더에 올바른 날짜로 저장 확인
- [ ] 4.4 요일 표현 발화 테스트 — "이번주 월수금에 치료" → 3개 항목 확인
- [ ] 4.5 아이 이름 포함 발화 테스트 (복수 아이 프로파일 있는 경우)
- [ ] 4.6 이벤트 트리거 발화 테스트 — "어제부터 열 났어" → 기록 + 이벤트 등록 확인
