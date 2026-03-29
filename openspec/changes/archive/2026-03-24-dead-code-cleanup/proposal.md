## Why

코드베이스에 참조되지 않는 파일, 함수, 타입, export가 누적되어 있다. 이들은 TypeScript strict 모드에서도 탐지되지 않는 구조적 dead code로, 향후 리팩터링 시 혼란을 유발한다.

## What Changes

- `src/screens/STTReviewScreen.tsx` 파일 삭제 — 네비게이터 미등록, import 없는 완전 고아 파일
- `src/db/queries.ts`의 `getRecordsByTagNames()` 함수 삭제 — 호출되는 곳 없음
- `src/types/record.ts`의 `RecordTag` interface 삭제 — import하는 곳 없음
- `src/constants/theme.ts`의 `COLORS` export 삭제 — "하위 호환용"이나 실제로 import되는 곳 없음
- `src/services/aiProcessor.ts`의 `USER_PROMPT_TEMPLATE`에서 `{subjectLine}` 플레이스홀더 제거 — 항상 빈 문자열로 치환되는 잔재 코드

## Capabilities

### New Capabilities

없음. 이 변경은 기능 추가 없이 dead code만 제거한다.

### Modified Capabilities

없음. 제거 대상 코드는 현재 어떤 동작에도 기여하지 않으므로 기존 spec에 영향 없음.

## Impact

- `src/screens/STTReviewScreen.tsx` — 삭제
- `src/db/queries.ts` — `getRecordsByTagNames` 함수 제거
- `src/types/record.ts` — `RecordTag` interface 제거
- `src/constants/theme.ts` — `COLORS` export 제거
- `src/services/aiProcessor.ts` — `USER_PROMPT_TEMPLATE` 단순화
- `npx tsc --noEmit` 통과 확인 필수
