## ADDED Requirements

### Requirement: 푸시 알림 스케줄링
활성화된 알람 시간마다 매일 반복되는 로컬 푸시 알림이 발송된다. 알람 변경 시 전체 스케줄이 재등록된다.

#### Scenario: 활성 알람 발송
- **WHEN** 활성화된 알람의 지정 시간이 된다
- **THEN** "기록할 것이 있나요?" 알림이 상단바에 표시된다
- **THEN** 알림에 인라인 텍스트 입력 액션이 제공된다

#### Scenario: 앱 재시작 시 스케줄 복구
- **WHEN** 앱이 시작된다
- **THEN** 활성화된 모든 알람에 대해 알림 스케줄이 재등록된다

#### Scenario: 알림 퍼미션 미허용
- **WHEN** OS 알림 퍼미션이 거부된 상태에서 알람을 추가하려 한다
- **THEN** 퍼미션 요청 다이얼로그를 표시한다
- **THEN** 퍼미션 거부 시 알람 추가가 중단되고 안내 메시지를 표시한다

### Requirement: 인라인 텍스트 답장으로 기록 생성
유저는 알림에서 앱을 열지 않고 텍스트를 입력해 기록을 생성할 수 있다.

#### Scenario: 인라인 답장 성공
- **WHEN** 유저가 알림에서 텍스트를 입력하고 전송한다
- **THEN** 입력 텍스트가 `last_active_child_id`의 아이에게 기록으로 저장된다
- **THEN** 기록은 `ai_pending=1`, `is_synced=0`으로 저장된다
- **THEN** 앱이 다음에 포그라운드가 될 때 AI 파이프라인이 요약을 생성한다

#### Scenario: 빈 텍스트 답장
- **WHEN** 유저가 빈 텍스트를 전송한다
- **THEN** 기록이 생성되지 않는다

#### Scenario: 활성 아이 없음
- **WHEN** 답장 수신 시 `last_active_child_id`가 없거나 유효하지 않다
- **THEN** 기록 저장을 건너뛴다 (데이터 유실 방지보다 안전 우선)

### Requirement: 활성 아이 ID 영속화
앱이 백그라운드 상태일 때도 알림 응답 핸들러가 활성 아이를 알 수 있도록, `setActiveChild` 호출 시 `last_active_child_id`를 app_settings에 저장한다.

#### Scenario: 활성 아이 변경 시 저장
- **WHEN** 유저가 앱 내에서 활성 아이를 변경한다
- **THEN** `app_settings`의 `last_active_child_id`가 즉시 업데이트된다

#### Scenario: 앱 시작 시 복구
- **WHEN** 앱이 시작된다
- **THEN** `last_active_child_id`가 ChildContext의 activeChildId와 동기화된다
