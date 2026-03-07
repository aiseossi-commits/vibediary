## Context

현재 앱은 단일 사용자 단일 아이를 가정한다. `records` 테이블에 `child_id`가 없어 여러 아이의 기록이 섞인다. `ThemeContext` 패턴이 이미 전역 상태 관리에 사용되고 있으므로 동일 패턴으로 `ChildContext`를 추가한다.

## Goals / Non-Goals

**Goals:**
- 아이 프로필 CRUD (SQLite `children` 테이블)
- 활성 아이 전역 상태 (`ChildContext`)
- 기록 생성/조회 시 `child_id` 연동
- 기존 데이터 무손실 호환

**Non-Goals:**
- 아이별 태그 분리 (태그는 공유)
- 클라우드 동기화
- 아이별 설정(테마 등) 분리

## Decisions

### Decision 1: `children` 테이블 신규 추가, `records`에 `child_id` 컬럼 추가

```sql
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
-- records에 컬럼 추가 (ALTER TABLE, 기존 행은 NULL 유지)
ALTER TABLE records ADD COLUMN child_id TEXT REFERENCES children(id) ON DELETE SET NULL;
```

`ON DELETE SET NULL` 로 아이 삭제 시 기록은 보존, child_id만 NULL로 변경.

### Decision 2: `ChildContext`로 활성 아이 전역 관리

`ThemeContext`와 동일 패턴. 활성 아이 ID를 `app_settings.json`에 `activeChildId`로 저장. 앱 시작 시 로드.

```ts
interface ChildContextValue {
  children: Child[];
  activeChild: Child | null;
  setActiveChild: (id: string | null) => void;
  refreshChildren: () => Promise<void>;
}
```

### Decision 3: `getAllRecords`에 `childId` 파라미터 추가

```ts
getAllRecords(limit, offset, childId?: string | null)
// childId가 string: WHERE child_id = ?
// childId가 null: WHERE child_id IS NULL
// childId가 undefined: 필터 없음 (기존 동작)
```

HomeScreen은 `activeChild?.id ?? undefined`를 넘긴다 — 아이 없으면 필터 없이 전체 표시.

실제로는: 아이가 있으면 `activeChild.id`, 아이가 없으면 `undefined` (전체).

### Decision 4: DB 마이그레이션 전략

`database.ts`에 `user_version` pragma로 버전 관리. 현재 버전이 0이면:
1. `children` 테이블 생성
2. `ALTER TABLE records ADD COLUMN child_id TEXT`
3. `PRAGMA user_version = 1` 설정

### Decision 5: 홈 화면 아이 전환 UI

- 아이가 1명 이하: 헤더에 전환 버튼 없음
- 아이가 2명 이상: 제목 옆에 `⌄` 또는 전환 아이콘 표시, 누르면 ActionSheet/Alert로 선택
- 아이 관리(추가/수정/삭제)는 설정 화면에서만

## Risks / Trade-offs

- `ALTER TABLE` 실패 시 기존 DB가 손상될 수 있음 → try/catch로 이미 컬럼이 있는 경우 무시
- 마이그레이션 중 앱 종료 시 불완전한 상태 → 버전 업데이트를 마이그레이션 완료 후 마지막에 수행

## Migration Plan

1. `database.ts` 초기화 시 `PRAGMA user_version` 확인
2. 버전 < 1이면 마이그레이션 실행
3. 마이그레이션 완료 후 `PRAGMA user_version = 1`
