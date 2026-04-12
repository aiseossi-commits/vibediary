## ADDED Requirements

### Requirement: wiki_pages를 검색 컨텍스트로 우선 활용
`searchPipeline`은 `getSynthesisArticles` 대신 `getWikiPages`를 사용해야 한다. wiki_pages가 존재하면 wiki-index + 모든 wiki pages + 최근 30개 raw records를 컨텍스트로 구성해야 한다.

#### Scenario: wiki pages 존재 시 컨텍스트 구성
- **WHEN** childId에 wiki_pages가 1개 이상 존재하면
- **THEN** 컨텍스트는 `<wiki>` 섹션(wiki-index + 모든 페이지 body)과 `<records>` 섹션(최근 30개 raw records)으로 구성된다

#### Scenario: wiki pages 없을 때 fallback
- **WHEN** childId에 wiki_pages가 존재하지 않으면
- **THEN** 기존 방식(전체 raw records)으로 fallback하여 컨텍스트를 구성한다

---

### Requirement: 시스템 프롬프트의 wiki 안내 문구
wiki pages가 존재할 때 시스템 프롬프트는 LLM에게 wiki 섹션을 먼저 활용하고 구체적 날짜·사례는 records에서 인용하도록 안내해야 한다.

#### Scenario: wiki 존재 시 시스템 프롬프트
- **WHEN** wiki pages가 존재하는 상태로 generateAnswer가 호출되면
- **THEN** 시스템 프롬프트에 "wiki의 인사이트를 먼저 활용하고, 구체적 날짜/사례는 records에서 인용하세요" 안내가 포함된다

#### Scenario: wiki 없을 때 시스템 프롬프트
- **WHEN** wiki pages가 없는 상태로 generateAnswer가 호출되면
- **THEN** 시스템 프롬프트는 기존 records 전용 안내를 사용한다

---

### Requirement: wiki-index 페이지 컨텍스트 우선 배치
컨텍스트 내 wiki 섹션에서 wiki-index 페이지는 다른 페이지보다 먼저 위치해야 한다.

#### Scenario: wiki-index 선두 배치
- **WHEN** wiki 컨텍스트가 포맷되면
- **THEN** slug가 `wiki-index`인 페이지의 body가 다른 wiki pages보다 앞에 배치된다

---

### Requirement: wiki page 포맷
`formatWikiPage` 함수는 각 wiki page를 `[{title}]\n{body}` 형식으로 직렬화해야 한다.

#### Scenario: wiki page 직렬화
- **WHEN** WikiPage 객체를 formatWikiPage로 변환하면
- **THEN** `[페이지 제목]\n페이지 본문` 형식의 문자열을 반환한다
