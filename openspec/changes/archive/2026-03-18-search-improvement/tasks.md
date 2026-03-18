## 1. 버그 수정: offlineQueue embedding 누락

- [x] 1.1 `offlineQueue.ts`에 `generateEmbedding` import 추가
- [x] 1.2 `processOfflineQueue()`에서 AI 처리 완료 후 `generateEmbedding(result.summary)` 호출
- [x] 1.3 `updateRecord()` 호출 시 embedding 포함하여 저장
- [x] 1.4 embedding 생성 실패 시 null로 유지하고 큐 처리 계속 (try-catch로 감싸기)

## 2. 검색 범위 확대: threshold 기반 vectorSearch

- [x] 2.1 `vectorSearch.ts`에 `SIMILARITY_THRESHOLD = 0.3`, `MAX_RESULTS = 50` 상수 추가
- [x] 2.2 `vectorSearch()` 함수 시그니처에서 `topK` 파라미터를 threshold/cap 방식으로 변경
- [x] 2.3 유사도 scored 정렬 후 threshold 필터 적용, cap 적용하여 반환
- [x] 2.4 `searchPipeline.ts`의 `vectorSearch()` 호출부 업데이트

## 3. 답변 품질 개선: 프롬프트 및 토큰 설정

- [x] 3.1 `searchPipeline.ts` `SEARCH_SYSTEM_PROMPT`에 패턴/빈도 분석 지시 추가
- [x] 3.2 `generateAnswer()`에 `recordCount` 파라미터 추가, 프롬프트에 총 건수 주입
- [x] 3.3 `maxOutputTokens` 300 → 600으로 변경
- [x] 3.4 context 포맷 변경: `MM-DD #태그 요약 [키:값]` (연도 제거, 구분자 최소화)

## 4. 타입 체크 및 검증

- [x] 4.1 `npx tsc --noEmit` 실행하여 타입 오류 없음 확인
- [x] 4.2 STATE.md 업데이트
