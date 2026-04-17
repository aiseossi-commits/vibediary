## ADDED Requirements

### Requirement: 발화 내 아이 이름 감지 및 라우팅
`parseMultiEntries`는 발화에서 아이 이름을 감지하면 해당 항목에 `childName` 필드를 포함하여 반환해야 한다. HomeScreen의 처리 로직은 `childName`을 `children` 배열과 매칭해 해당 childId로 저장해야 한다.

#### Scenario: 이름 명시된 항목 라우팅
- **WHEN** 발화에 "수진이는 어제 작업치료, 민준이는 오늘 언어치료"가 포함된 경우
- **THEN** 수진 항목은 수진 childId, 민준 항목은 민준 childId로 각각 저장됨

#### Scenario: 이름 미매칭 시 activeChild fallback
- **WHEN** 발화의 이름이 children 목록에 없는 경우
- **THEN** activeChild.id로 저장되며 Alert 없이 조용히 처리됨

#### Scenario: 이름 없는 항목은 activeChild
- **WHEN** 일부 항목에 이름이 없는 혼합 발화인 경우 ("어제 소아과 갔어, 수진이는 오늘 치료")
- **THEN** 이름 없는 항목은 activeChild, 이름 있는 항목은 매칭된 childId로 저장됨

### Requirement: 저장 결과 피드백에 아이 이름 포함
복수 아이로 저장된 경우 결과 메시지에 아이별 기록 수를 표시해야 한다.

#### Scenario: 복수 아이 저장 피드백
- **WHEN** 2명 이상의 아이에게 기록이 분산 저장된 경우
- **THEN** "수진 2개, 민준 1개 기록 저장됨" 형식의 메시지 3.5초간 표시
