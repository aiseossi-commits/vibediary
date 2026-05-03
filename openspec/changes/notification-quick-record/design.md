## Context

VibeDiary는 음성/텍스트 기록 → AI 요약 파이프라인을 갖고 있다. `processTextRecord(text, childId?)` 진입점이 있고, AI 실패 시 `ai_pending=1`로 저장한 뒤 `offlineQueue`가 앱 재시작 시 재처리한다. 활성 아이는 `ChildContext`가 `app_settings.json` 파일에 `activeChildId`를 저장해 관리한다.

## Goals / Non-Goals

**Goals:**
- 유저가 N개의 알람 시간을 추가/삭제/켜고끔 가능
- 지정 시간에 로컬 푸시 알림 발송 (매일 반복)
- 알림에서 앱 열지 않고 인라인 텍스트 입력 가능
- 입력 텍스트 → 활성 아이에게 `ai_pending=1`로 즉시 저장
- 앱 포그라운드 진입 시 기존 AI 파이프라인이 일괄 처리

**Non-Goals:**
- 알림에서 아이 선택 (항상 last active child)
- 음성 입력 (텍스트 인라인 답장만)
- 서버 사이드 푸시 (로컬 알림만)
- 알림 전송 실패 재시도 (OS가 관리)

## Decisions

### 1. 알람 저장: `alarm_presets` SQLite 테이블 (app_settings 키-값 대신)

다중 알람은 키-값 구조로 표현하기 어렵다. 별도 테이블이 CRUD에 자연스럽다.

```sql
CREATE TABLE alarm_presets (
  id TEXT PRIMARY KEY,
  hour INTEGER NOT NULL,       -- 0-23
  minute INTEGER NOT NULL,     -- 0-59
  enabled INTEGER DEFAULT 1,   -- 0 | 1
  created_at INTEGER NOT NULL
);
```

### 2. 활성 아이 ID: `app_settings` 키-값에 `last_active_child_id` 추가

ChildContext가 이미 `app_settings.json`에 `activeChildId`를 저장한다. 알림 응답 핸들러는 앱이 백그라운드 상태일 수 있으므로 Context에 접근할 수 없다. `app_settings`(SQLite)에 `last_active_child_id`를 별도로 저장해 핸들러가 직접 읽도록 한다.

ChildContext의 `setActiveChild` 호출 시 `appSettingsDao.setSetting('last_active_child_id', id)`도 함께 호출.

### 3. 알림 인라인 답장: expo-notifications 카테고리 액션

```
iOS:  UNTextInputNotificationAction ("QUICK_RECORD")
Android: RemoteInput via expo-notifications setNotificationCategoryAsync
```

카테고리 ID: `QUICK_RECORD_CATEGORY`
액션 ID: `QUICK_RECORD_ACTION`

앱 시작 시 1회 카테고리 등록. 알람 스케줄링 시 `categoryIdentifier: 'QUICK_RECORD_CATEGORY'` 지정.

### 4. 응답 처리: `addNotificationResponseReceivedListener`

```
답장 텍스트 수신
  → getSetting('last_active_child_id')
  → processTextRecord(text, childId)
    (내부적으로 AI 실패 시 ai_pending=1 저장)
```

리스너는 `AppNavigator`에서 앱 시작 시 1회 등록. 포그라운드/백그라운드 모두 동작하나, 백그라운드에서 AI 호출(네트워크)이 실패하면 `ai_pending=1`로 저장 → 다음 앱 열릴 때 offlineQueue 처리.

### 5. 스케줄링 전략: 알람 변경 시 전체 재스케줄

```
scheduleAlarms():
  1. cancelAllScheduledNotificationsAsync()
  2. enabled 알람마다 scheduleNotificationAsync({ repeats: true, hour, minute })
```

알람 추가/삭제/토글 시마다 호출. 앱 시작 시에도 1회 호출 (OS 재부팅 후 스케줄 소멸 대응).

## Risks / Trade-offs

- **백그라운드 AI 호출 실패** → `ai_pending=1` 저장으로 다음 앱 열릴 때 처리. 수 시간 지연 가능하나 데이터 유실 없음.
- **iOS 알림 퍼미션 거부** → 퍼미션 없으면 알람 설정 UI에서 안내 배너 표시.
- **Android 정확한 반복 알림 제한** → `expo-notifications`의 `repeats: true`가 내부적으로 `setExact` 사용. Android 12+에서 배터리 최적화로 약간의 지연 가능. 돌봄 리마인더 특성상 수 분 오차는 허용 가능.
- **앱 삭제 후 재설치** → 알람 재등록 필요. 앱 시작 시 `scheduleAlarms()` 호출로 자동 복구.

## Migration Plan

1. DB v25 마이그레이션 (`alarm_presets` 테이블 추가)
2. `expo-notifications` 설치 + `app.json` 플러그인 등록
3. 퍼미션 요청 UX: 알람 첫 추가 시점에 요청
4. 롤백: 알람 기능은 기존 기록 파이프라인과 독립적. `notificationService.ts` 제거만으로 롤백 가능.

## Open Questions

- 알람 라벨(이름) 필드가 필요한가? (예: "저녁 기록", "투약 후") — 일단 없이 시작, 추후 추가 가능
- 알림 메시지를 아이 이름으로 개인화? (예: "바다 기록할 것이 있나요?") — v1에서는 고정 문구
