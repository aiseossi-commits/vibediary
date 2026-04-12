## REMOVED Requirements

### Requirement: 유사도 기반 컨텍스트 압축
**Reason:** 유사도 점수 자체가 없어짐. full-context 방식에서는 모든 기록을 동일한 compact 포맷으로 직렬화.
**Migration:** full-context-search spec의 "기록 compact 직렬화" 요구사항을 따름. structured_data 포함 여부는 유사도가 아닌 태그(#의료/#투약)로 결정.

## ADDED Requirements

### Requirement: 기록 수 기반 컨텍스트 크기 관리
기록 수가 일정 상한을 초과할 경우 최근 기록 우선으로 제한하여 컨텍스트 크기를 관리한다.

#### Scenario: 기록 수 상한 이하
- **WHEN** activeChild의 기록이 2000건 이하이면
- **THEN** 모든 기록을 컨텍스트에 포함한다

#### Scenario: 기록 수 상한 초과
- **WHEN** activeChild의 기록이 2000건을 초과하면
- **THEN** created_at DESC 순으로 최근 2000건만 컨텍스트에 포함한다
