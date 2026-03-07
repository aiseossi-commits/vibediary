# theme-switching Specification

## Purpose
TBD - created by archiving change dark-light-theme. Update Purpose after archive.
## Requirements
### Requirement: 테마 전환

사용자는 설정 화면에서 라이트 모드(바다)와 다크 모드(밤바다)를 전환할 수 있어야 한다(MUST). 선택한 테마는 앱 재시작 후에도 유지되어야 한다(SHALL).

#### Scenario: 다크 모드 선택

- **WHEN** 사용자가 설정에서 "밤바다"를 선택한다
- **THEN** 전체 앱이 다크 색상 팔레트로 즉시 변경된다
- **AND** 앱을 재시작해도 다크 모드가 유지된다

#### Scenario: 라이트 모드 선택

- **WHEN** 사용자가 설정에서 "바다"를 선택한다
- **THEN** 전체 앱이 라이트 색상 팔레트로 즉시 변경된다
- **AND** 앱을 재시작해도 라이트 모드가 유지된다

