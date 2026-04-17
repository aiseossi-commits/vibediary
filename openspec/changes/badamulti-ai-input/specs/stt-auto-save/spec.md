## ADDED Requirements

### Requirement: AI 입력 모드에서 항목별 childId 분기 저장
AI 입력 모드(롱프레스 인라인 녹음)에서 `parseMultiEntries`가 반환한 각 항목은 `childName` 매칭 결과에 따라 개별 childId로 저장되어야 한다. 단일 `activeChild.id`가 아닌 항목별로 다른 childId를 사용할 수 있다.

#### Scenario: 단일 아이 — 기존 동작 유지
- **WHEN** `parseMultiEntries` 반환 항목들에 `childName`이 없는 경우
- **THEN** 모든 항목이 `activeChild.id`로 저장됨 (기존 동작과 동일)

#### Scenario: 복수 아이 — 항목별 분기
- **WHEN** `parseMultiEntries` 반환 항목 중 일부에 `childName`이 있고 매칭되는 경우
- **THEN** 해당 항목은 매칭된 childId로 저장되고, 나머지는 `activeChild.id`로 저장됨
