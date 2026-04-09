## Context

현재 absorb 시스템은 3개 아티클 타입(`weekly_overview`, `developmental_domain`, `milestone_timeline`)을 별도 AI 호출로 개별 생성한다. 타입은 하드코딩되어 있고, 음식 반응·행동·치료 같은 토픽별 entity page가 없다. LLM이 쿼리 시 모든 synthesis 아티클을 통째로 받아서 답변한다.

목표: Karpathy LLM Wiki 철학(LLM이 소유하는 동적 지식 베이스)을 수용하되 기록당 즉시 업데이트(토큰 레드라인)는 배제.

현재 DB: v11. 관련 파일: `synthesisDao.ts`, `absorbService.ts`, `searchPipeline.ts`, `backupService.ts`, `SearchScreen.tsx`.

---

## Goals / Non-Goals

**Goals:**
- `synthesis_articles`(고정 6종) → `wiki_pages`(slug 기반 동적 페이지)로 교체
- 1회 AI 호출로 entity pages + overview + wiki index 동시 생성
- 검색 시 wiki index + 관련 페이지 선택적 로드로 컨텍스트 품질 향상
- Lint: wiki 건강 체크(stale, orphan, gap)

**Non-Goals:**
- 기록별 즉시 absorb (토큰 레드라인)
- Obsidian/파일시스템 연동
- 위키 브라우저 UI (별도 이슈)
- query filing back의 wiki_pages 통합 (voyage-log 스펙 유지)

---

## Decisions

### Decision 1: wiki_pages 테이블 스키마

`synthesis_articles`의 `type` enum을 `slug` 문자열로 교체. `slug`는 child 내 unique 식별자.

```sql
CREATE TABLE wiki_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,              -- 예: "overview/weekly", "entity/food/돼지고기"
  title TEXT NOT NULL,
  type TEXT NOT NULL,              -- "overview" | "timeline" | "entity" | "wiki-index"
  body TEXT NOT NULL,
  source_record_ids TEXT,          -- JSON 배열
  cross_refs TEXT,                 -- JSON 배열, 참조하는 slug 목록
  visual_data TEXT,                -- JSON (패턴 시각화용, 기존 유지)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(child_id, slug)
);
```

**Slug 체계:**
| slug | 설명 |
|---|---|
| `wiki-index` | 전체 페이지 목차 (singleton) |
| `overview/weekly` | 주간 요약 (singleton) |
| `timeline/milestones` | 이정표 타임라인 (singleton) |
| `entity/food/{이름}` | 음식 반응 페이지 |
| `entity/behavior/{이름}` | 행동 패턴 페이지 |
| `entity/therapy/{이름}` | 치료·처방 페이지 |

엔티티명은 한국어 그대로 사용 (DB 저장 가능, LLM 일관성을 위해 프롬프트에 명시).

**왜 slug 도입?** 기존 `type` enum은 새 카테고리 추가 시 코드 수정 필요. slug는 LLM이 런타임에 자유롭게 생성·참조 가능.

---

### Decision 2: Absorb — 1회 호출 JSON 멀티페이지 출력

기존: 아티클 타입별 N회 AI 호출 → 각 아티클 저장

신규: **1회 AI 호출** → JSON 배열로 여러 wiki pages 동시 출력

```json
{
  "pages": [
    {
      "slug": "overview/weekly",
      "title": "주간 요약 (2026-04-09)",
      "type": "overview",
      "body": "...",
      "visual_data": "{\"patterns\":[...]}",
      "cross_refs": ["entity/food/돼지고기", "entity/behavior/자해행동"]
    },
    {
      "slug": "entity/food/돼지고기",
      "title": "돼지고기 반응",
      "type": "entity",
      "body": "..."
    }
  ],
  "index": "## Wiki Index\n- [주간 요약](overview/weekly)\n- [돼지고기 반응](entity/food/돼지고기)\n..."
}
```

**Absorb 프롬프트 인풋:**
- 새 기록 목록 (since last absorb)
- 현재 wiki pages 전체 (기존 페이지 패치를 위해)
- wiki 스키마 설명 (slug 체계, 타입, 규칙)

**왜 1회 호출?** 기존 3회 호출 대비 레이턴시·비용 동일하거나 절감. JSON 구조로 파싱 단순화. LLM이 cross-refs를 한 번에 일관되게 설정 가능.

**토큰 예산:**
- Input: 기록 10-20개 (~2k) + 기존 wiki pages (~5-10k) + 프롬프트 (~1k) = ~8-13k tokens
- Output: 페이지 3-10개 (~3-5k tokens), `maxOutputTokens: 4000`

---

### Decision 3: Absorb 스키마 문서 (wiki_schema)

Karpathy가 강조한 **Schema** — LLM의 wiki 관리 행동 규칙 — 을 코드 내 상수로 관리.

```ts
// absorbService.ts
const WIKI_SCHEMA = `
위키 구조 규칙:
- overview/weekly: 최근 14일 기록 요약. 반복 패턴, 특이사항 포함
- timeline/milestones: is_milestone:true 기록만. 날짜 오름차순 타임라인
- entity/food/{이름}: 해당 음식에 대한 반응/빈도 누적
- entity/behavior/{이름}: 해당 행동의 ABC 패턴, 빈도
- entity/therapy/{이름}: 치료 진행 상황, 효과 관찰
- wiki-index: 모든 페이지의 slug·title·한줄요약 목록
규칙:
- 기존 페이지가 있으면 덮어쓰지 말고 통합(merge)하여 업데이트
- 날짜는 [YYYY-MM-DD] 형식으로 인용
- 추측·진단·조언 금지, 기록된 사실만 서술
- entity 페이지는 3회 이상 등장한 토픽만 생성
`;
```

이 스키마 문서가 Karpathy가 말한 CLAUDE.md 역할을 함. 코드에 embedded하되 상수로 분리해 유지보수 가능.

---

### Decision 4: Search — wiki index + 전체 페이지 로드 (v1)

wiki pages가 수십 개 이내인 현재 규모에서는 "index 읽기 → 관련 페이지 선택 → 2차 로드" 대신 **index + 전체 페이지 로드**가 간단하고 충분.

```
hasSynthesis = true 시:
  context = wiki_index + 모든 wiki pages + 최근 30개 raw records
hasSynthesis = false 시:
  context = 모든 raw records (기존 fallback 유지)
```

wiki pages가 많아지면 index-first 선택적 로드(v2)로 교체. 현재는 구조만 준비.

---

### Decision 5: Migration (synthesis_articles → wiki_pages)

DB v11 → v12:
1. `wiki_pages` 테이블 생성
2. `synthesis_articles` 기존 데이터 → wiki_pages로 변환 INSERT (slug 매핑)
3. `synthesis_articles` 테이블 유지 (backupService 하위호환 위해 v12에서는 drop 보류)
4. v13 (다음 마이너 릴리즈)에서 synthesis_articles drop

**v12 slug 매핑:**
| type | slug |
|---|---|
| weekly_overview | overview/weekly |
| developmental_domain | domain/developmental |
| milestone_timeline | timeline/milestones |
| behavioral_pattern | domain/behavioral |
| medical_summary | domain/medical |
| therapy_log | domain/therapy |

---

## Risks / Trade-offs

**[Risk] JSON 파싱 실패** → LLM이 유효하지 않은 JSON 출력 시 absorb 전체 실패
→ Mitigation: JSON 파싱 실패 시 기존 방식(타입별 개별 호출) fallback. try-catch로 각 페이지 독립 upsert.

**[Risk] Entity 페이지 폭증** → 아이마다 수십~수백 개 entity page 생성 시 DB 비대
→ Mitigation: WIKI_SCHEMA에 "3회 이상 등장한 토픽만 entity 페이지 생성" 규칙 포함. Lint에서 orphan page 감지 후 삭제 권고.

**[Risk] Slug 불일치** → LLM이 `entity/food/돼지고기`와 `entity/food/삼겹살`을 별개로 생성
→ Mitigation: 프롬프트에 기존 wiki pages slug 목록 전달 → LLM이 기존 slug 재사용.

**[Risk] backupService 하위호환** → backup 파일에 synthesis_articles가 있는 기기에서 복원 시
→ Mitigation: v12에서 synthesis_articles 테이블 유지. backupService에 wiki_pages 백업 추가하되 기존 synthesisArticles 복원 로직도 유지 (이중 복원).

**[Trade-off] 1회 대형 호출 vs N회 소형 호출** → 1회 호출이 타임아웃 위험 높음
→ Mitigation: `maxOutputTokens: 4000`, 타임아웃 45초로 상향. 실패 시 기존 3-call fallback.

---

## Migration Plan

1. DB v12 마이그레이션 작성 (`database.ts`)
2. `wikiDao.ts` 신규 작성 (synthesisDao 대체)
3. `absorbService.ts` 프롬프트·파싱 교체 (WIKI_SCHEMA 도입)
4. `searchPipeline.ts` wiki pages 로드 방식 전환
5. `backupService.ts` wiki_pages 백업/복원 추가
6. `SearchScreen.tsx` API 전환 (getSynthesisArticles → getWikiPages)
7. `record.ts` 타입 추가 (WikiPage, WikiPageType)
8. npx tsc --noEmit 통과 확인

**Rollback:** v12 마이그레이션이 실패하면 synthesis_articles는 그대로이므로 이전 코드로 복구 가능. wiki_pages만 drop.

---

## Open Questions

- Lint 실행 시점: 사용자 수동 트리거 only, 아니면 absorb 후 자동?
  → v1은 수동 트리거(SearchScreen 버튼). 자동화는 다음 이슈.
- entity page 최대 개수 제한? (예: child당 최대 50개)
  → 일단 제한 없이 진행, Lint가 orphan 감지 시 정리.
