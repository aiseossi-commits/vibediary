## ADDED Requirements

### Requirement: 녹음 완료 후 자동 저장

녹음이 완료되면 별도 확인 화면 없이 STT 변환 결과를 자동으로 저장해야 한다(MUST). 저장 완료 후 홈 화면으로 즉시 복귀해야 한다(SHALL).

#### Scenario: 녹음 성공 후 자동 저장

- **WHEN** 사용자가 녹음을 완료한다
- **THEN** STT 변환이 자동으로 실행된다
- **AND** AI 처리 후 홈 화면으로 즉시 복귀한다

#### Scenario: 무음 녹음 감지

- **WHEN** STT 변환 결과가 비어 있다
- **THEN** "음성 입력이 되지 않았습니다" Alert를 표시한다
- **AND** 저장하지 않고 녹음 화면에 머문다
