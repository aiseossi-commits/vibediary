## Context

현재 SearchScreen은 검색 결과(질문 + AI 답변 + 근거 기록)를 state로만 보유한다. 탭 이동이나 앱 재시작 시 모두 사라진다. 항해일지는 사용자가 의미 있다고 판단한 검색 결과를 로컬 DB에 저장하고, 같은 탭 안에서 카드로 조회·삭제할 수 있게 한다.

기존 DB 패턴(expo-sqlite, DAO 분리, schema.ts 중앙 관리)과 UI 패턴(createStyles, useTheme, SPACING/FONT_SIZE 상수)을 그대로 따른다.

## Goals / Non-Goals

**Goals:**
- 검색 답변 영역에 "저장" 버튼 추가 → 질문 + AI 답변 + 날짜 + child_id를 DB에 저장
- SearchScreen 하단에 항해일지 섹션 노출 → 저장된 카드 목록 (최신순)
- 카드 개별 삭제 (확인 다이얼로그 포함)
- activeChild 전환 시 해당 아이 카드만 표시

**Non-Goals:**
- 항해일지를 별도 탭으로 분리하지 않음
- 근거 기록(sourceRecords) 저장하지 않음 — 질문·답변만
- 카드 편집 기능 없음
- 검색할 때마다 자동 저장하지 않음

## Decisions

### D1. 저장 버튼 위치
answerCard 우하단에 저장 아이콘 버튼 배치. 답변을 읽고 바로 저장할 수 있어 자연스럽다. 별도 "저장됨" 상태를 버튼에 표시해 중복 저장을 방지한다.

### D2. 항해일지 섹션 위치
ScrollView 내 검색 결과 아래 항해일지 섹션을 배치. 검색 결과가 없을 때(emptyState)는 항해일지 섹션이 상단에 표시. 검색 결과가 있을 때는 스크롤로 접근.

**대안 고려**: 별도 탭 → 탭이 6개가 되어 과밀. 기각.

### D3. DB 테이블: search_logs
```sql
CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT,
  query TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```
- `child_id`: NULL 허용 (아이 미선택 상태 대응)
- `query`, `answer`: 전문 텍스트 저장 (구조화 불필요)
- `sourceRecords`는 저장하지 않음 — DB 조인 복잡도 증가 대비 가치 낮음

### D4. DAO 분리
`src/db/searchLogsDao.ts` 신규 생성. 기존 recordsDao 패턴 동일:
- `createSearchLog(childId, query, answer)` → id
- `getSearchLogs(childId)` → SearchLog[] (최신순)
- `deleteSearchLog(id)`

### D5. DB 마이그레이션
`database.ts`의 초기화 로직에 테이블 생성 추가. expo-sqlite는 `CREATE TABLE IF NOT EXISTS`로 기존 앱 DB에 무중단 추가 가능.

## Risks / Trade-offs

- [답변이 길면 카드가 길어짐] → 카드에서 답변 텍스트 numberOfLines=4 truncate, 전체 내용은 펼치기 없이 현행 유지. 저장 전에 이미 전체 답변을 읽었으므로 충분.
- [항해일지가 쌓이면 화면이 길어짐] → 현재 스크롤 구조 내에서 자연스럽게 처리. 페이지네이션은 이후 필요 시 추가.

## Migration Plan

1. `schema.ts`에 `CREATE_SEARCH_LOGS_TABLE` 추가
2. `database.ts` 초기화 시 테이블 생성 포함
3. `searchLogsDao.ts` 신규 생성
4. `SearchScreen.tsx` UI 수정 (저장 버튼, 항해일지 섹션)

기존 테이블 변경 없음. 롤백 시 테이블 미사용 상태로 방치 가능 (데이터 손실 없음).

## Open Questions

없음.
