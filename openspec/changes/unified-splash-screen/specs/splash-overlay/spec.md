## ADDED Requirements

### Requirement: 브랜드 문구 스플래시 표시
앱 시작 시 플랫폼(iOS/Android)에 관계없이 "기록에 치이지 말고, 그냥 말하세요" 문구가 포함된 JS 스플래시 오버레이를 SHALL 표시한다. 네이티브 스플래시(앱 로고)는 JS 마운트 즉시 SHALL 숨겨야 한다.

#### Scenario: iOS에서 스플래시 표시
- **WHEN** iOS에서 앱을 실행하면
- **THEN** 네이티브 로고 스플래시 대신 "기록에 치이지 말고, 그냥 말하세요" 텍스트 화면이 표시된다

#### Scenario: Android에서 스플래시 표시
- **WHEN** Android에서 앱을 실행하면
- **THEN** 네이티브 로고 스플래시 대신 "기록에 치이지 말고, 그냥 말하세요" 텍스트 화면이 표시된다

### Requirement: 로딩 완료 후 스플래시 해제
폰트 로딩과 DB 초기화가 모두 완료된 시점에 스플래시 오버레이가 SHALL fade-out되고 앱 본체가 SHALL 표시된다.

#### Scenario: 로딩 완료 시 전환
- **WHEN** `fontsLoaded === true` 이고 `dbReady === true` 이면
- **THEN** 스플래시 오버레이가 300ms fade-out 애니메이션과 함께 사라지고 앱 본체가 노출된다

#### Scenario: 로딩 중 스플래시 유지
- **WHEN** 폰트 로딩 또는 DB 초기화 중 하나라도 완료되지 않은 상태라면
- **THEN** 스플래시 오버레이가 계속 표시된다

### Requirement: 플랫폼 간 시각 일관성
스플래시 배경색(`#070D1A`)과 텍스트 스타일이 iOS와 Android에서 SHALL 동일해야 한다.

#### Scenario: 배경색 연속성
- **WHEN** 네이티브 스플래시에서 JS 스플래시로 전환될 때
- **THEN** 배경색이 동일하여 시각적 깜빡임 또는 색상 점프가 없어야 한다
