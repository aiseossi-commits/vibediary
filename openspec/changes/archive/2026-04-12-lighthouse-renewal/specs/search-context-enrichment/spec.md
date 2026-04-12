## MODIFIED Requirements

### Requirement: formatRecord 구조화 데이터 반영
`searchPipeline.ts`의 `formatRecord` 함수는 `event_type`이 존재하면 ABC 필드를 검색 컨텍스트에 명시적으로 포함해야 한다. 기존 동작은 유지하며, synthesis_articles를 raw records보다 우선 참조하는 컨텍스트 조립 방식으로 변경한다.

#### Scenario: 행동 사건 컨텍스트 포맷
- **WHEN** record.structuredData에 event_type: "behavioral_incident"가 있을 때
- **THEN** 포맷 결과가 `[A:선행사건, B:행동, C:결과]` 형태로 포함되어야 한다

#### Scenario: 기존 기록 호환
- **WHEN** record.structuredData에 event_type이 없을 때
- **THEN** 기존 방식(key:value 나열)으로 포맷하여 하위 호환을 유지한다

#### Scenario: synthesis 우선 컨텍스트 조립
- **WHEN** searchRecords(query, childId)가 호출되면
- **THEN** activeChild의 synthesis_articles(전체)를 먼저 컨텍스트에 포함하고, 최근 30개 raw records를 보조 컨텍스트로 추가해야 한다

#### Scenario: synthesis 없을 때 fallback
- **WHEN** synthesis_articles가 없으면
- **THEN** 기존 방식(전체 raw records)으로 fallback하여 동작해야 한다
