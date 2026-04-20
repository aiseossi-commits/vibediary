## MODIFIED Requirements

### Requirement: 월별 AI 호출 카운터
앱은 무료 유저의 등대 질문, AI 인사이트 생성, **사진 AI 자동 태깅** 호출을 월별로 추적해야 한다. 카운터는 `app_settings` DB에 `ai_usage_count`(정수)와 `ai_usage_month`(YYYY-MM 문자열) 키로 저장한다.

#### Scenario: 첫 호출 시 초기화
- **WHEN** `ai_usage_month`가 현재 월과 다르거나 없으면
- **THEN** `ai_usage_count`를 0으로 초기화하고 `ai_usage_month`를 현재 월로 갱신한다

#### Scenario: 카운터 증가
- **WHEN** 무료 유저가 등대 질문을 전송하거나 AI 인사이트 생성을 요청하거나 사진 AI 자동 태깅을 요청하면
- **THEN** 호출 성공 후 `ai_usage_count`를 1 증가시킨다

#### Scenario: 한도 내 정상 호출
- **WHEN** `ai_usage_count`가 9 이하이면
- **THEN** AI 호출을 정상 진행하고 남은 횟수를 UI에 표시한다
