# Spec: search-context-enrichment

## Purpose
검색 파이프라인의 `formatRecord` 함수가 구조화 데이터를 검색 컨텍스트에 반영한다. 행동 사건(ABC) 필드를 명시적으로 포맷하여 검색 품질을 높이면서 기존 기록과의 하위 호환을 유지한다.

## Requirements

### Requirement: formatRecord 구조화 데이터 반영
`searchPipeline.ts`의 `formatRecord` 함수는 `event_type`이 존재하면 ABC 필드를 검색 컨텍스트에 명시적으로 포함해야 한다.

#### Scenario: 행동 사건 컨텍스트 포맷
- **WHEN** record.structuredData에 event_type: "behavioral_incident"가 있을 때
- **THEN** 포맷 결과가 `[A:선행사건, B:행동, C:결과]` 형태로 포함되어야 한다

#### Scenario: 기존 기록 호환
- **WHEN** record.structuredData에 event_type이 없을 때
- **THEN** 기존 방식(key:value 나열)으로 포맷하여 하위 호환을 유지한다
