## ADDED Requirements

### Requirement: 알람 추가
유저는 시간(hour, minute)을 지정해 알람을 추가할 수 있다. 추가된 알람은 기본적으로 활성화 상태이며, SQLite `alarm_presets` 테이블에 저장된다.

#### Scenario: 알람 추가 성공
- **WHEN** 유저가 시간을 선택하고 추가 버튼을 누른다
- **THEN** `alarm_presets`에 새 행이 삽입되고 `enabled=1`로 저장된다
- **THEN** 알림 스케줄이 즉시 재등록된다

### Requirement: 알람 삭제
유저는 기존 알람을 삭제할 수 있다.

#### Scenario: 알람 삭제 성공
- **WHEN** 유저가 알람 목록에서 삭제를 선택한다
- **THEN** 해당 행이 `alarm_presets`에서 제거된다
- **THEN** 알림 스케줄이 즉시 재등록된다

### Requirement: 알람 켜고끔
유저는 알람을 삭제하지 않고 비활성화할 수 있다.

#### Scenario: 알람 비활성화
- **WHEN** 유저가 알람 토글을 끈다
- **THEN** `enabled=0`으로 업데이트된다
- **THEN** 해당 알람의 알림 스케줄이 제거된다 (다른 알람은 유지)

#### Scenario: 알람 재활성화
- **WHEN** 유저가 비활성화된 알람 토글을 켠다
- **THEN** `enabled=1`로 업데이트된다
- **THEN** 해당 알람의 알림 스케줄이 재등록된다

### Requirement: 알람 목록 조회
설정 화면에서 등록된 알람 전체 목록을 확인할 수 있다.

#### Scenario: 알람 목록 표시
- **WHEN** 유저가 설정 > 알람 섹션을 연다
- **THEN** `alarm_presets` 테이블의 모든 행이 시간 순으로 표시된다
- **THEN** 각 알람에 시간과 활성화 토글이 표시된다
