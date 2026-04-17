## ADDED Requirements

### Requirement: 이벤트 시작 의도 감지 및 자동 등록
`parseMultiEntries`는 발화에서 이벤트 시작 의도(발열, 발작, 수면 문제 등)를 감지하면 해당 항목에 `eventHint` 필드를 포함하여 반환해야 한다. HomeScreen 처리 로직은 `eventHint`가 있으면 해당 항목의 날짜를 `startedAt`으로 하여 `createEvent`를 호출해야 한다.

#### Scenario: 발열 이벤트 자동 등록
- **WHEN** 발화에 "어제 저녁부터 열이 나기 시작했어"가 포함된 경우
- **THEN** 기록 1개 저장 + `createEvent(childId, "발열", 어제_timestamp)` 호출

#### Scenario: 발작 이벤트 자동 등록
- **WHEN** 발화에 "오늘 오후에 발작 한 번 있었어"가 포함된 경우
- **THEN** 기록 1개 저장 + `createEvent(childId, "발작", 오늘_timestamp)` 호출

#### Scenario: 이벤트 중복 방지
- **WHEN** `eventHint`가 있으나 동일 이름의 이벤트가 이미 활성 상태(`ended_at IS NULL`)인 경우
- **THEN** `createEvent` 호출 건너뜀, 기록은 정상 저장

#### Scenario: 단순 기록은 이벤트 등록 안 함
- **WHEN** 발화에 이벤트 시작 의도가 없는 일반 관찰("오늘 밥 잘 먹었어")인 경우
- **THEN** `eventHint` 없이 기록만 저장됨

### Requirement: 이벤트 자동 등록 가능한 키워드 범주
AI는 다음 범주에 해당하는 발화를 이벤트로 감지해야 한다: 발열/고열, 발작/경련, 수면 문제, 공격 행동 시작, 입원/처치 시작. 단순 치료 방문·약 복용은 이벤트가 아닌 기록으로만 처리한다.

#### Scenario: 치료 방문은 이벤트 등록 안 함
- **WHEN** 발화에 "오늘 언어치료 갔어"가 포함된 경우
- **THEN** 기록만 저장, 이벤트 등록 없음
