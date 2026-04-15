## ADDED Requirements

### Requirement: 브랜드 문구 스플래시 표시
앱 시작 시 플랫폼(iOS/Android)에 관계없이 "기록에 치이지 말고, 그냥 말하세요" 문구가 native 스플래시 이미지에 직접 포함되어 SHALL 표시된다. (JS 오버레이 방식이 아닌 native 이미지 임베드 방식으로 구현됨)

#### Scenario: iOS에서 스플래시 표시
- **WHEN** iOS에서 앱을 실행하면
- **THEN** "기록에 치이지 말고, 그냥 말하세요" 텍스트가 포함된 native 스플래시 이미지가 표시된다

#### Scenario: Android에서 스플래시 표시
- **WHEN** Android에서 앱을 실행하면
- **THEN** "기록에 치이지 말고, 그냥 말하세요" 텍스트가 포함된 native 스플래시 이미지가 표시된다

### Requirement: 스플래시 → 앱 전환 시 시각적 연속성
DB 초기화 완료 후 앱 본체가 표시될 때 배경색 점프 없이 SHALL 자연스럽게 전환된다.

#### Scenario: 배경색 연속성
- **WHEN** native 스플래시에서 앱 본체로 전환될 때
- **THEN** 배경색(`#070D1A`)이 동일하여 흰 화면 플래시 또는 색상 점프가 없어야 한다

### Requirement: 플랫폼 간 시각 일관성
스플래시 배경색(`#070D1A`)과 텍스트 스타일이 iOS와 Android에서 SHALL 동일해야 한다. native 이미지는 `scripts/generate-splash.js` (sharp 라이브러리)로 생성한다.
