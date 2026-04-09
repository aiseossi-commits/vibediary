## ADDED Requirements

### Requirement: 1회 AI 호출로 다중 wiki pages 생성
`runAbsorb`는 단일 AI 호출로 여러 wiki pages(overview, timeline, entity pages, wiki-index 포함)를 생성해야 한다. AI 응답은 JSON 구조(`{ pages: [...], index: string }`)여야 한다.

#### Scenario: 정상 absorb 실행
- **WHEN** 신규 기록이 ABSORB_THRESHOLD(10) 이상 누적된 상태에서 runAbsorb를 호출하면
- **THEN** 단일 AI 호출이 발생하고, 응답의 pages 배열에 있는 각 wiki page가 wikiDao.upsertWikiPage로 저장된다

#### Scenario: wiki-index 페이지 생성
- **WHEN** absorb가 완료되면
- **THEN** slug가 `wiki-index`인 wiki_page가 upsert되어 모든 생성/갱신된 페이지 목록을 포함한다

#### Scenario: entity 페이지 생성 — 3회 이상 등장
- **WHEN** absorb 대상 기록에서 특정 음식이 3회 이상 언급되면
- **THEN** 해당 음식에 대한 `entity/food/{이름}` slug 페이지가 생성 또는 갱신된다

#### Scenario: entity 페이지 미생성 — 2회 이하 등장
- **WHEN** absorb 대상 기록에서 특정 토픽이 2회 이하로 언급되면
- **THEN** 해당 토픽에 대한 entity 페이지를 생성하지 않는다

---

### Requirement: 기존 wiki pages를 absorb 인풋으로 전달
absorb 프롬프트에는 새 기록뿐 아니라 현재 존재하는 모든 wiki pages(slug + body)가 포함되어야 한다. LLM이 기존 slug를 재사용하여 페이지를 패치(merge)하도록 한다.

#### Scenario: 기존 entity 페이지 갱신
- **WHEN** `entity/food/돼지고기` 페이지가 이미 존재하고, 새 기록에 돼지고기가 다시 등장하면
- **THEN** AI가 기존 페이지 내용을 통합하여 업데이트된 body를 반환하고 upsert된다

#### Scenario: 신규 slug 생성
- **WHEN** 기존 wiki pages에 없는 토픽이 새 기록에 3회 이상 등장하면
- **THEN** AI가 새 slug로 페이지를 생성한다

---

### Requirement: JSON 파싱 실패 시 fallback
AI 응답이 유효한 JSON이 아닌 경우, absorb는 오류를 기록하고 이전 방식(overview/weekly, timeline/milestones 단일 생성)으로 fallback해야 한다.

#### Scenario: JSON 파싱 실패
- **WHEN** AI 응답이 유효하지 않은 JSON이면
- **THEN** console.warn으로 오류를 기록하고, 기존 weekly_overview/milestone_timeline 생성 로직으로 fallback하여 최소한의 결과를 반환한다

---

### Requirement: 각 wiki page 독립 저장
pages 배열의 각 페이지는 독립적으로 upsert되어야 한다. 하나의 페이지 저장 실패가 다른 페이지 저장을 막아서는 안 된다.

#### Scenario: 개별 페이지 저장 실패 격리
- **WHEN** pages 배열 중 하나의 페이지 upsert가 실패하면
- **THEN** 해당 페이지만 건너뛰고 나머지 페이지는 계속 저장된다

---

### Requirement: WIKI_SCHEMA 상수
absorb 프롬프트에 사용되는 wiki 구조 규칙은 `WIKI_SCHEMA` 상수로 분리 관리해야 한다. 이 상수는 slug 체계, 타입별 작성 규칙, entity 생성 조건을 포함한다.

#### Scenario: WIKI_SCHEMA 포함 확인
- **WHEN** absorb 프롬프트가 빌드되면
- **THEN** WIKI_SCHEMA 내용이 시스템 인스트럭션 또는 프롬프트 상단에 포함된다

---

### Requirement: absorb 타임아웃 상향
1회 대형 호출이므로 타임아웃은 45초로 설정해야 한다(기존 30초에서 상향).

#### Scenario: 45초 내 응답
- **WHEN** AI 응답이 45초 이내에 도착하면
- **THEN** 정상 처리된다

#### Scenario: 타임아웃 초과
- **WHEN** AI 응답이 45초를 초과하면
- **THEN** AbortController가 요청을 중단하고 AbsorbResult에 오류가 기록된다
