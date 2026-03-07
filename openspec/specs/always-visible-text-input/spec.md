# always-visible-text-input Specification

## Purpose
TBD - created by archiving change always-visible-input. Update Purpose after archive.
## Requirements
### Requirement: 텍스트 입력창 항상 표시

홈 화면에서 텍스트 입력창은 별도 토글 없이 항상 표시되어야 한다(MUST). 키보드 토글 버튼은 표시되지 않아야 한다(SHALL).

#### Scenario: 앱 실행 시 입력창 즉시 표시

- **WHEN** 홈 화면이 로드된다
- **THEN** 텍스트 입력창이 즉시 표시된다
- **AND** 키보드 토글 버튼이 없다

#### Scenario: 입력창 탭 시 키보드 표시

- **WHEN** 사용자가 텍스트 입력창을 탭한다
- **THEN** 소프트 키보드가 올라온다

