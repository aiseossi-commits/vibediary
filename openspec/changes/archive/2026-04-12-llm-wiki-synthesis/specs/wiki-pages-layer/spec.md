## ADDED Requirements

### Requirement: wiki_pages 테이블 존재
시스템은 `wiki_pages` 테이블을 가져야 한다. 컬럼: `id`, `child_id`, `slug`, `title`, `type`, `body`, `source_record_ids`(JSON), `cross_refs`(JSON), `visual_data`, `created_at`, `updated_at`. `(child_id, slug)` 조합은 UNIQUE해야 한다.

#### Scenario: 동일 child_id + slug 중복 삽입 방지
- **WHEN** 동일한 child_id와 slug로 INSERT를 시도하면
- **THEN** UNIQUE 제약 위반 오류가 발생하고 기존 row가 보존된다

#### Scenario: child 삭제 시 wiki_pages 연쇄 삭제
- **WHEN** children 테이블에서 child_id가 삭제되면
- **THEN** 해당 child_id의 wiki_pages rows가 CASCADE DELETE된다

---

### Requirement: slug 주소 체계
slug는 페이지 유형을 반영하는 계층적 문자열이어야 한다. 허용 패턴: `wiki-index`, `overview/{name}`, `timeline/{name}`, `entity/food/{이름}`, `entity/behavior/{이름}`, `entity/therapy/{이름}`.

#### Scenario: wiki-index slug
- **WHEN** child의 wiki 목차 페이지를 조회하면
- **THEN** slug가 정확히 `wiki-index`인 row를 반환한다

#### Scenario: entity 슬러그 형식
- **WHEN** "돼지고기" 음식 반응 페이지가 생성되면
- **THEN** slug는 `entity/food/돼지고기` 형식이어야 한다

---

### Requirement: DB v12 마이그레이션
DB 버전이 11에서 12로 업그레이드될 때 wiki_pages 테이블을 생성하고 기존 synthesis_articles 데이터를 wiki_pages로 변환 삽입해야 한다. synthesis_articles 테이블은 v12에서 유지한다(하위 호환).

#### Scenario: v11 → v12 업그레이드 시 기존 데이터 보존
- **WHEN** DB 버전이 11인 기기에서 앱을 업데이트하면
- **THEN** synthesis_articles의 모든 row가 slug 매핑 규칙에 따라 wiki_pages에 INSERT되어야 한다

#### Scenario: slug 매핑 규칙
- **WHEN** `weekly_overview` 타입의 synthesis_article이 마이그레이션되면
- **THEN** wiki_pages의 slug는 `overview/weekly`, type은 `overview`로 삽입된다

#### Scenario: 빈 synthesis_articles에서 마이그레이션
- **WHEN** synthesis_articles에 데이터가 없는 기기에서 v12로 업그레이드하면
- **THEN** wiki_pages 테이블이 생성되고 마이그레이션은 오류 없이 완료된다

---

### Requirement: wikiDao upsert
`wikiDao.upsertWikiPage`는 동일 child_id + slug가 존재하면 UPDATE, 없으면 INSERT해야 한다.

#### Scenario: 신규 페이지 생성
- **WHEN** 존재하지 않는 slug로 upsertWikiPage를 호출하면
- **THEN** 새 row가 INSERT되고 `'created'`를 반환한다

#### Scenario: 기존 페이지 업데이트
- **WHEN** 이미 존재하는 slug로 upsertWikiPage를 호출하면
- **THEN** body, title, cross_refs, visual_data, updated_at이 UPDATE되고 `'updated'`를 반환한다

---

### Requirement: wikiDao 조회
`wikiDao.getWikiPages(childId)`는 해당 child의 모든 wiki_pages를 updated_at 내림차순으로 반환해야 한다. `wikiDao.getWikiPageBySlug(childId, slug)`는 단건 조회를 지원해야 한다.

#### Scenario: 전체 조회
- **WHEN** childId로 getWikiPages를 호출하면
- **THEN** 해당 child의 모든 wiki_pages를 updated_at 내림차순으로 반환한다

#### Scenario: slug 단건 조회 — 존재함
- **WHEN** 존재하는 slug로 getWikiPageBySlug를 호출하면
- **THEN** 해당 WikiPage 객체를 반환한다

#### Scenario: slug 단건 조회 — 없음
- **WHEN** 존재하지 않는 slug로 getWikiPageBySlug를 호출하면
- **THEN** null을 반환한다
