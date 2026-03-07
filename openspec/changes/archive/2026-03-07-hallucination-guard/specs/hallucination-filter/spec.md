## ADDED Requirements

### Requirement: Whisper 환각 텍스트 필터링

STT 결과가 10자 미만이거나 알려진 환각 패턴과 일치하면 빈 문자열을 반환해야 한다(MUST).

#### Scenario: 환각 패턴 텍스트 반환 시 필터링

- **WHEN** Whisper가 "시청해주셔서 감사합니다" 등 환각 패턴 텍스트를 반환한다
- **THEN** STT 결과를 빈 문자열로 처리한다
- **AND** 무음 녹음과 동일하게 재녹음 Alert가 표시된다

#### Scenario: 정상 텍스트는 통과

- **WHEN** Whisper가 10자 이상의 일반 텍스트를 반환한다
- **THEN** 해당 텍스트를 그대로 사용한다
