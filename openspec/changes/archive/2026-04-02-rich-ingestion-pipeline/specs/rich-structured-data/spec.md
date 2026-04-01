## ADDED Requirements

### Requirement: 기록 유형 분류 및 구조 추출
Gemini는 음성 기록을 처리할 때 `event_type`을 반드시 분류해야 한다: `behavioral_incident`(행동 사건), `medical`(의료), `developmental`(발달 관찰), `daily`(일상). 분류 결과에 따라 해당 구조 필드를 추출한다.

#### Scenario: 행동 사건 기록 처리
- **WHEN** 음성 기록에 아이의 문제 행동(텐트럼, 거부, 자해 등)이 포함될 때
- **THEN** `event_type: "behavioral_incident"`, `antecedent`(선행 사건), `behavior`(행동), `consequence`(결과) 필드가 structured_data에 채워져야 한다

#### Scenario: 발달 관찰 기록 처리
- **WHEN** 음성 기록에 발달 영역 관찰(언어, 사회성, 인지, 운동 등)이 포함될 때
- **THEN** `event_type: "developmental"`, `domain`(영역명) 필드가 structured_data에 채워져야 한다

#### Scenario: 불명확한 기록 처리
- **WHEN** 기록이 짧거나 ABC를 명확히 구분하기 어려울 때
- **THEN** 해당 필드는 빈 문자열이 아닌 키 자체를 생략하여 반환한다

### Requirement: StructuredData 타입 확장
`src/types/record.ts`의 `StructuredData` 인터페이스에 신규 필드를 선택적(optional)으로 추가해야 한다.

#### Scenario: 타입 안전성
- **WHEN** aiProcessor.ts가 structured_data를 반환할 때
- **THEN** TypeScript 컴파일 오류 없이 신규 필드가 허용되어야 한다

### Requirement: maxOutputTokens 상향
`aiProcessor.ts`의 Gemini 호출 maxOutputTokens를 256에서 700으로 상향해야 한다.

#### Scenario: 토큰 충분성
- **WHEN** 행동 사건 기록이 처리될 때
- **THEN** summary + tags + 확장 structured_data가 700 토큰 내에서 완전히 반환되어야 한다
