## 1. DB 스키마 및 DAO

- [x] 1.1 `src/db/schema.ts`에 `CREATE_SEARCH_LOGS_TABLE` 추가 (id, child_id, query, answer, created_at)
- [x] 1.2 `src/db/database.ts` 초기화 시 search_logs 테이블 생성 포함
- [x] 1.3 `src/db/searchLogsDao.ts` 신규 생성: `createSearchLog`, `getSearchLogs`, `deleteSearchLog`

## 2. SearchScreen UI — 저장 버튼

- [x] 2.1 `SearchScreen.tsx` answerCard에 저장 버튼 추가 (우하단 아이콘 버튼)
- [x] 2.2 `isSaved` state 추가 — 저장 완료 시 버튼 비활성화 및 "저장됨" 상태 전환
- [x] 2.3 새 검색 시작 시 `isSaved` 초기화
- [x] 2.4 저장 버튼 핸들러: `createSearchLog` 호출, 실패 시 에러 표시

## 3. SearchScreen UI — 항해일지 섹션

- [x] 3.1 `SearchLog` 타입 정의 (`src/types/record.ts` 또는 별도 파일)
- [x] 3.2 `SearchScreen.tsx`에 `logs` state 및 `loadLogs` 함수 추가
- [x] 3.3 화면 포커스 시 + 저장 완료 시 `loadLogs` 호출
- [x] 3.4 항해일지 섹션 렌더링: 카드 목록 (질문·답변 4줄 truncate·날짜)
- [x] 3.5 logs가 없을 때 섹션 미표시 처리
- [x] 3.6 activeChild 변경 시 목록 갱신 (useEffect dependency 추가)

## 4. SearchScreen UI — 카드 삭제

- [x] 4.1 항해일지 카드에 삭제 버튼 추가
- [x] 4.2 삭제 확인 Alert 다이얼로그 구현
- [x] 4.3 확인 시 `deleteSearchLog` 호출 후 목록 갱신

## 5. 스타일

- [x] 5.1 저장 버튼 스타일 (활성/비활성 상태 포함)
- [x] 5.2 항해일지 섹션 헤더 스타일 (섹션 제목)
- [x] 5.3 항해일지 카드 스타일 (기존 answerCard와 구분되는 디자인)

## 6. 검증

- [x] 6.1 `npx tsc --noEmit` 타입 체크 통과
- [ ] 6.2 저장 → 목록 표시 → 삭제 플로우 수동 테스트
- [ ] 6.3 activeChild 전환 시 목록 갱신 수동 테스트
