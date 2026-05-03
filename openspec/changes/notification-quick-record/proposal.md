## Why

돌봄 기록을 입력하려는 의도는 있지만 앱을 열기 번거로워 잊는 경우가 많다. 푸시 알림에서 앱을 열지 않고 바로 텍스트를 입력해 기록할 수 있으면, 기록 빈도가 높아진다.

## What Changes

- 유저가 알람 시간을 여러 개 추가/삭제/켜고끔 할 수 있는 설정 UI 추가
- 지정 시간에 "기록할 것이 있나요?" 푸시 알림 발송 (로컬, 매일 반복)
- 알림에서 인라인 텍스트 입력(iOS: UNTextInputNotificationAction, Android: RemoteInput)으로 답장 가능
- 답장 텍스트는 현재 활성 아이(last_active_child_id)에게 `ai_pending=1`로 즉시 저장
- 앱이 포그라운드가 될 때 기존 offlineQueue / AI 파이프라인이 일괄 처리

## Capabilities

### New Capabilities

- `alarm-presets`: 다중 알람 시간 CRUD — 시간(hour/minute), 활성화 여부 관리. DB v25 alarm_presets 테이블.
- `notification-quick-record`: 푸시 알림 스케줄링, 인라인 답장 수신, raw text 즉시 저장 → AI 일괄 처리 파이프라인 연동.

### Modified Capabilities

- `record-pipeline`: 알림 답장 경로에서 `processTextRecord()`를 호출하므로 진입점이 추가됨. 기존 동작 변경 없음.

## Impact

- **새 의존성**: `expo-notifications` 설치 + `app.json` 플러그인 등록
- **DB**: v25 마이그레이션 — `alarm_presets(id, hour, minute, enabled, created_at)` 테이블 추가
- **app_settings**: `last_active_child_id` 키 추가 — ChildContext에서 activeChild 변경 시 저장
- **수정 파일**: `ChildContext.tsx`, `SettingsScreen.tsx`, `AppNavigator.tsx`(리스너 등록), `database.ts`(v25 마이그레이션)
- **새 파일**: `src/services/notificationService.ts`, `src/db/alarmPresetsDao.ts`
