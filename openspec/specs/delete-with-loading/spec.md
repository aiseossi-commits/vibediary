# delete-with-loading Specification

## Purpose
TBD - created by archiving change delete-record-ux. Update Purpose after archive.
## Requirements
### Requirement: 삭제 중 중복 실행 방지

삭제가 진행되는 동안 삭제 버튼은 비활성화되어야 하며(MUST), 동일한 삭제 작업이 중복 실행되지 않아야 한다(SHALL).

#### Scenario: 삭제 버튼 클릭 후 완료 전 재클릭

- **WHEN** 사용자가 삭제 확인 Alert에서 "삭제"를 누른다
- **THEN** 삭제 버튼이 비활성화(disabled)된다
- **AND** 삭제가 완료될 때까지 추가 삭제 요청이 실행되지 않는다

### Requirement: 삭제 완료 후 즉시 이전 화면 복귀

삭제가 성공적으로 완료되면 추가 Alert 없이 이전 화면으로 즉시 복귀해야 한다(MUST).

#### Scenario: 삭제 성공

- **WHEN** 기록 삭제(DB + 오디오 파일)가 성공적으로 완료된다
- **THEN** 추가 Alert 없이 즉시 이전 화면으로 복귀한다

#### Scenario: 삭제 실패

- **WHEN** 기록 삭제 중 오류가 발생한다
- **THEN** 오류 Alert를 표시한다
- **AND** 삭제 버튼이 다시 활성화된다

