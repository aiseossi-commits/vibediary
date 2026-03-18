## Why

AI 등대에서 주고받은 검색 질문과 답변이 화면을 벗어나면 사라진다. 돌봄 기록에서 얻은 인사이트를 나중에 다시 참고하거나 패턴을 추적하려면 저장 수단이 필요하다.

## What Changes

- AI 등대 탭에 "항해일지" 히스토리 섹션 추가
- 검색 답변 하단에 "저장" 버튼 노출 → 질문 + AI 답변 + 날짜를 카드로 저장
- 저장된 카드 목록을 AI 등대 탭 내에서 확인 가능
- 카드 개별 삭제 가능 (삭제 확인 포함)
- activeChild 기준으로 카드 분리

## Capabilities

### New Capabilities
- `voyage-log`: AI 등대 검색 결과를 카드로 저장·조회·삭제하는 항해일지 기능

### Modified Capabilities
- `search-pattern-analysis`: AI 등대 SearchScreen에 저장 버튼 및 항해일지 섹션 UI 추가

## Impact

- **DB**: `search_logs` 테이블 신규 추가 (id, child_id, query, answer, created_at)
- **UI**: `SearchScreen.tsx` — 저장 버튼, 항해일지 섹션 (카드 목록)
- **DAO**: `searchLogsDao.ts` 신규 생성 (create, getAll, delete)
- **Schema**: `src/db/schema.ts` 테이블 정의 추가
- 기존 벡터 검색/답변 생성 로직 변경 없음
- 추가 API 호출 없음
