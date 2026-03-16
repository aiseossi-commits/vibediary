## ADDED Requirements

### Requirement: 개인정보 처리방침 링크
설정 화면 앱 정보 섹션에 개인정보 처리방침 외부 링크가 표시되어야 한다.

#### Scenario: 링크 표시
- **WHEN** 사용자가 설정 화면의 앱 정보 섹션을 볼 때
- **THEN** "개인정보 처리방침" 항목이 표시되어야 한다

#### Scenario: 링크 탭
- **WHEN** 사용자가 "개인정보 처리방침"을 탭할 때
- **THEN** 외부 브라우저에서 개인정보 처리방침 URL이 열려야 한다

### Requirement: console.log 제거
릴리즈 빌드에서 STT 진단용 console.log가 제거되어야 한다.

#### Scenario: 로그 부재
- **WHEN** 릴리즈 빌드에서 STT 파이프라인이 실행될 때
- **THEN** 소음 판정, 무음 감지, 환각 감지, 온라인 상태 관련 console.log가 출력되지 않아야 한다
