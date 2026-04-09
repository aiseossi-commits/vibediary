## Context

현재 앱은 음성/텍스트 기록과 캘린더 조회를 지원하지만, 특정 상태/증상이 "며칠째 지속되고 있는지"를 한눈에 파악하는 기능이 없다. 돌봄 가족은 감기·변비·상동행동 같은 지속성 이벤트를 기억에 의존해 추적하고 있다.

DB 현재 버전: v10 (synthesis_articles.visual_data 컬럼 추가 완료). 이번 변경으로 v11이 된다.

## Goals / Non-Goals

**Goals:**
- active_events 테이블 추가 (DB v11)
- 홈화면에 활성 이벤트 뱃지 표시 (기간 자동 계산)
- 이벤트 추가/종료 UI (홈화면 내 bottom sheet 모달)
- 캘린더에 이벤트 기간 색상 인디케이터 표시
- 여러 이벤트 동시 활성 가능
- 기본 이벤트 목록 제공 + 커스텀 추가

**Non-Goals:**
- 이벤트 활성화 시 기록 자동 생성 없음
- 푸시 알림 없음 (알림 기능 전체 제거됨)
- 이벤트 간 충돌 검사 없음

## Decisions

### D1. DB 스키마: active_events 테이블
```sql
CREATE TABLE IF NOT EXISTS active_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  started_at INTEGER NOT NULL,   -- Unix timestamp (ms)
  ended_at INTEGER,              -- NULL = 진행 중
  created_at INTEGER NOT NULL
);
```
- `ended_at NULL` = 활성, 값 있음 = 종료
- child_id 기준 분리 (아이별 이벤트 독립)

### D2. 기간 단위 자동변환
```
days < 7  → "X일째"
days < 28 → "X주째"
else      → "X개월째"
```
- 계산 기준: `Math.floor((now - started_at) / 86400000) + 1`

### D3. 기본 이벤트 목록 (상수)
```ts
export const DEFAULT_EVENT_NAMES = [
  '감기', '발열', '변비', '설사', '구토',
  '상동행동', '자해', '공격행동', '수면 문제', '식이 문제',
  '약 복용', '병원 방문'
];
```
커스텀 이벤트는 name을 직접 입력해서 추가.

### D4. 홈화면 뱃지 위치
진주 버튼 위에 수평 스크롤 가능한 뱃지 행으로 배치. 탭하면 이벤트 관리 모달 오픈.
`+ 추가` 버튼도 동일 행에 위치.

### D5. 캘린더 표시
캘린더 날짜 셀 하단에 이벤트별 색 점(dot) 표시. 최대 3개까지 점, 초과시 "..." 처리.
이벤트별 고정 색상은 DEFAULT_EVENT_NAMES 인덱스 기반으로 theme colors에서 순환 할당.

### D6. 이벤트 관리 모달 (홈화면 내)
- 활성 이벤트 목록 (종료 버튼 포함)
- 새 이벤트 추가: 기본 목록 칩 또는 직접 입력, 시작일 선택 (기본 오늘)
- 종료 시: "오늘 종료" 또는 날짜 선택

## Risks / Trade-offs

- [캘린더 성능] 날짜 셀 렌더링 시 활성 이벤트 범위 계산 → 미리 날짜→이벤트 매핑 객체를 useMemo로 캐싱해서 해결
- [장기 이벤트] ended_at이 없는 이벤트가 누적될 수 있음 → 활성 이벤트 목록에서 명시적 종료 유도 UI

## Migration Plan

1. DB v10 → v11: `CREATE TABLE IF NOT EXISTS active_events` + `PRAGMA user_version = 11`
2. 신규 설치: schema.ts의 CREATE 구문에 포함
3. 롤백: 테이블 추가만이므로 앱 구버전 실행 시 테이블 무시됨 (안전)
