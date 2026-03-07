# home-bottom-layout Specification

## Purpose
TBD - created by archiving change home-layout. Update Purpose after archive.
## Requirements
### Requirement: 홈 화면 하단 레이아웃

홈 화면 하단 영역은 진주 버튼이 위, 텍스트 입력창이 아래에 위치해야 한다(MUST). 보내기 버튼은 항상 표시되어야 한다(SHALL).

#### Scenario: 하단 레이아웃 순서

- **WHEN** 홈 화면이 표시된다
- **THEN** 진주 버튼이 텍스트 입력창보다 위에 위치한다

#### Scenario: 보내기 버튼 비활성 상태

- **WHEN** 텍스트 입력창이 비어 있다
- **THEN** 보내기 버튼이 반투명(35%)으로 표시되며 비활성화된다

#### Scenario: 보내기 버튼 활성 상태

- **WHEN** 텍스트 입력창에 내용이 입력된다
- **THEN** 보내기 버튼이 완전 불투명으로 활성화된다

