## ADDED Requirements

### Requirement: 아이 전환 시 태그 선택 상태 초기화
TagsScreen은 `activeChild`가 변경될 때 `selectedTagIds`와 `filteredRecords`를 즉시 초기화해야 한다.

#### Scenario: 민준 태그 선택 후 서준으로 전환
- **WHEN** 사용자가 민준의 TagsScreen에서 `#행동` 태그를 선택하여 기록 목록이 표시된 상태에서
- **WHEN** 활성 아이를 서준으로 전환하면
- **THEN** `selectedTagIds`가 빈 배열로 초기화되어야 한다
- **THEN** `filteredRecords`가 빈 배열로 초기화되어야 한다
- **THEN** 서준의 태그 목록이 표시되고 아무 기록도 선택 없이 보여야 한다

#### Scenario: 아이 전환 후 이전 아이 기록 미노출
- **WHEN** 이전 아이의 기록이 `filteredRecords`에 있는 상태에서 다른 아이로 전환하면
- **THEN** 화면에 이전 아이의 기록이 표시되어서는 안 된다

### Requirement: 태그 기반 기록 조회 시 childId 필터 적용
`getRecordsByTags` 호출 시 반드시 `activeChild.id`를 전달하여 현재 아이의 기록만 조회해야 한다.

#### Scenario: childId 전달로 교차 노출 차단
- **WHEN** 사용자가 특정 태그를 선택하면
- **THEN** 해당 태그를 가진 기록 중 현재 활성 아이(`activeChild.id`)의 기록만 반환되어야 한다
- **THEN** 다른 아이의 기록이 포함되어서는 안 된다
