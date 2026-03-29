## 1. 파일 삭제

- [x] 1.1 `src/screens/STTReviewScreen.tsx` 삭제

## 2. queries.ts 정리

- [x] 2.1 `src/db/queries.ts`에서 `getRecordsByTagNames()` 함수 삭제

## 3. 타입 정리

- [x] 3.1 `src/types/record.ts`에서 `RecordTag` interface 삭제

## 4. theme.ts 정리

- [x] 4.1 `src/constants/theme.ts`에서 `COLORS` export 삭제

## 5. aiProcessor.ts 정리

- [x] 5.1 `src/services/aiProcessor.ts`의 `USER_PROMPT_TEMPLATE`에서 `{subjectLine}\n` 줄 제거 및 `.replace('{subjectLine}', '')` 호출 제거

## 6. 검증

- [x] 6.1 `npx tsc --noEmit` 통과 확인
- [x] 6.2 STATE.md 업데이트
