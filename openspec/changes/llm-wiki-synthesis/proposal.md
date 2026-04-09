## Why

현재 synthesis/absorb 시스템은 고정된 6가지 리포트 타입을 배치 생성하는 "리포트 생성기"다. Karpathy의 LLM Wiki 철학—LLM이 소유하는 지속적·복합 지식 베이스—을 수용하되, 기록당 즉시 업데이트(토큰 레드라인)는 배제하고 배치 타이밍을 유지하면서 결과물을 동적 wiki로 전환한다.

## What Changes

- **BREAKING** `synthesis_articles` 테이블을 `wiki_pages` 테이블로 교체: 고정 6종 타입 → slug 기반 동적 페이지
- 신규 absorb 엔진: 1회 AI 호출로 entity pages + overview + wiki index를 동시 생성
- entity pages 도입: 음식 반응, 행동 패턴, 치료 진행 등 토픽별 독립 페이지 자동 생성
- wiki index 페이지 도입: LLM이 쿼리 시 relevant pages를 먼저 식별할 수 있는 목차
- 검색 파이프라인 개선: 전체 기록 대신 wiki index → 관련 페이지 선택 → 최근 원본 기록 보조
- Lint 기능 추가: wiki 건강 체크 (stale, orphan, gap 감지)
- `token-efficient-context`, `search-pattern-analysis` 스펙 obsolete 처리 (벡터 검색 전제)

## Capabilities

### New Capabilities

- `wiki-pages-layer`: wiki_pages 테이블 스키마, slug 주소 체계, entity/overview/index 타입 분류, migration
- `wiki-absorb-engine`: 배치 absorb가 동적 wiki pages (entity + overview + index)를 1회 AI 호출로 생성
- `wiki-aware-search`: searchPipeline이 wiki index를 먼저 읽고 관련 페이지만 선택적으로 로드
- `wiki-lint`: wiki 건강 체크 — stale claims, orphan pages, 누락 cross-ref 감지

### Modified Capabilities

- `voyage-log`: search_logs 저장 행동은 유지하되, wiki_pages 테이블 도입으로 DB 참조 업데이트 필요

## Impact

**코드:**
- `src/db/synthesisDao.ts` → `src/db/wikiDao.ts`로 전면 교체
- `src/db/schema.ts` — synthesis_articles 제거, wiki_pages 추가, DB 버전 업
- `src/services/absorbService.ts` — 프롬프트 및 파싱 로직 전면 교체
- `src/services/searchPipeline.ts` — wiki index 로드 + 관련 페이지 선택 로직 추가
- `src/screens/CalendarScreen.tsx` 및 synthesis 관련 UI — wiki_pages API로 전환

**DB:**
- 마이그레이션: synthesis_articles → wiki_pages (기존 데이터 변환)
- 신규 테이블: wiki_pages (id, child_id, slug, title, type, body, source_record_ids, cross_refs, visual_data, created_at, updated_at)

**토큰:**
- 현재 대비 absorb 호출 횟수 동일, 출력 구조만 변경 (JSON multi-page)
- 검색은 전체 synthesis 로드 → 선택적 페이지 로드로 토큰 절감 가능
