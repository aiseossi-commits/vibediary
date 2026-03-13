## ADDED Requirements

### Requirement: 기록 생성 시 활성 아이 연결

새 기록 생성 시 현재 활성 아이의 ID가 기록에 자동으로 연결되어야 한다(SHALL). 활성 아이가 없으면 NULL로 저장되어야 한다(MUST).

#### Scenario: 활성 아이 있을 때 기록 생성

- **WHEN** 활성 아이가 설정된 상태에서 음성 또는 텍스트 기록을 저장한다
- **THEN** 기록의 child_id가 활성 아이의 ID로 저장된다

#### Scenario: 활성 아이 없을 때 기록 생성

- **WHEN** 활성 아이가 없는 상태에서 기록을 저장한다
- **THEN** 기록의 child_id가 NULL로 저장된다

### Requirement: 아이별 기록 필터링

홈 화면에서 활성 아이의 기록만 표시되어야 한다(MUST). 아이가 없으면 child_id가 NULL인 기록을 포함한 모든 기록이 표시되어야 한다(SHALL).

#### Scenario: 활성 아이 기준 필터링

- **WHEN** 활성 아이가 설정되어 있다
- **THEN** 해당 아이의 child_id를 가진 기록만 목록에 표시된다

#### Scenario: 아이 없음 상태 전체 표시

- **WHEN** 활성 아이가 없다
- **THEN** 모든 기록(child_id 무관)이 표시된다

### Requirement: 기존 데이터 호환성

앱 업데이트 전 생성된 기존 기록은 child_id = NULL로 유지되어야 하며(MUST), 데이터 손실이 없어야 한다(SHALL).

#### Scenario: 기존 기록 보존

- **WHEN** 앱이 업데이트되어 children 테이블이 추가된다
- **THEN** 기존 records의 child_id는 NULL로 유지된다
- **AND** 기존 기록이 삭제되거나 변경되지 않는다
