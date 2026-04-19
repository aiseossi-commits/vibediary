## ADDED Requirements

### Requirement: 월별 AI 호출 카운터
앱은 무료 유저의 등대 질문과 AI 인사이트 생성 호출을 월별로 추적해야 한다. 카운터는 `app_settings` DB에 `ai_usage_count`(정수)와 `ai_usage_month`(YYYY-MM 문자열)로 저장한다.

#### Scenario: 첫 호출 시 초기화
- **WHEN** `ai_usage_month`가 현재 월과 다르거나 없으면
- **THEN** `ai_usage_count`를 0으로 초기화하고 `ai_usage_month`를 현재 월로 갱신한다

#### Scenario: 카운터 증가
- **WHEN** 무료 유저가 등대 질문을 전송하거나 AI 인사이트 생성을 요청하면
- **THEN** 호출 성공 후 `ai_usage_count`를 1 증가시킨다

#### Scenario: 한도 내 정상 호출
- **WHEN** `ai_usage_count`가 9 이하이면
- **THEN** AI 호출을 정상 진행하고 남은 횟수를 UI에 표시한다

### Requirement: 무료 한도 초과 차단
무료 유저가 월 10회를 초과하면 AI 호출을 차단하고 업그레이드를 유도해야 한다.

#### Scenario: 한도 초과 시 차단
- **WHEN** `ai_usage_count`가 10 이상이고 유저가 AI 기능을 요청하면
- **THEN** 호출을 차단하고 Alert("이번 달 AI 사용 횟수를 모두 사용했어요\n다음 달에 다시 이용하거나 프리미엄으로 업그레이드하세요")를 표시한다

#### Scenario: 유료 유저 무제한
- **WHEN** `isPremium`이 true이면
- **THEN** 카운터와 무관하게 AI 호출을 허용한다

### Requirement: 남은 횟수 UI 표시
모아보기 탭과 물어보기 탭에 이번 달 남은 AI 호출 횟수를 표시해야 한다.

#### Scenario: 남은 횟수 표시
- **WHEN** 무료 유저가 모아보기 또는 물어보기 탭을 열면
- **THEN** "이번 달 AI N회 남음" 텍스트를 상단에 표시한다

#### Scenario: 소진 시 표시
- **WHEN** `ai_usage_count`가 10 이상이면
- **THEN** "이번 달 AI 사용 완료" 텍스트와 함께 인사이트 생성 버튼·질문 전송 버튼을 비활성화한다
