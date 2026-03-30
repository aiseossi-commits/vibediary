## 1. 임베딩 생성 제거

- [x] 1.1 `recordPipeline.ts`에서 `generateEmbedding()` 호출 및 embedding 저장 코드 제거
- [x] 1.2 `offlineQueue.ts`에서 `generateEmbedding()` 호출 및 embedding 저장 코드 제거
- [x] 1.3 `SettingsScreen.tsx`에서 검색 재색인 버튼 및 관련 코드 제거

## 2. 기존 검색 파이프라인 제거

- [x] 2.1 `src/services/vectorSearch.ts` 파일 삭제
- [x] 2.2 `src/db/queries.ts`에서 `getRecordsWithEmbeddings()` 함수 삭제
- [x] 2.3 `src/db/recordsDao.ts`에서 `getAllRecordsForReindex()` 삭제

## 3. 전체 기록 조회 함수 추가

- [x] 3.1 `src/db/queries.ts`에 `getAllRecordsForSearch(childId, limit)` 추가 (created_at DESC, limit 2000)

## 4. 새 검색 파이프라인 구현

- [x] 4.1 `src/services/searchPipeline.ts` 전면 재작성
  - 전체 기록 조회 (최대 2000건)
  - compact 직렬화: `YYYY-MM-DD #태그 요약 [key:val]` (의료/투약만 structured_data 포함)
  - 시스템 프롬프트에 오늘 날짜 포함
  - 단일 LLM 호출로 답변 생성
  - 오프라인 시 즉시 안내 메시지 반환
  - conversationHistory(multi-turn) 유지

## 5. 타입 정리

- [x] 5.1 `SearchResult` 타입에서 `sourceRecords` 제거
- [x] 5.2 `ScoredRecord` 타입 삭제

## 6. SearchScreen UI 정리

- [x] 6.1 `SearchScreen.tsx`에서 sourceRecords 기반 "근거 N건" UI 및 generateEmbedding 호출 제거

## 7. 검증

- [x] 7.1 `npx tsc --noEmit` 통과 확인
- [ ] 7.2 날짜 기반 질문("3월에 무슨일이 있었지?") 시뮬레이터 동작 확인
- [ ] 7.3 의미론적 질문("기분 안 좋았던 날") 시뮬레이터 동작 확인
