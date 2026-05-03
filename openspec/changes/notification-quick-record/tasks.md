## 1. 패키지 설치 및 설정

- [x] 1.1 `expo-notifications` 설치 (`npx expo install expo-notifications`)
- [x] 1.2 `app.json`에 expo-notifications 플러그인 등록 + iOS NSUserNotificationUsageDescription 추가
- [x] 1.3 Android `app.json`에 notification 아이콘/색상 설정

## 2. DB 마이그레이션 (v25)

- [x] 2.1 `src/db/schema.ts`에 `CREATE_ALARM_PRESETS_TABLE` 추가
- [x] 2.2 `src/db/database.ts`에 v25 마이그레이션 — `alarm_presets` 테이블 생성

## 3. DAO

- [x] 3.1 `src/db/alarmPresetsDao.ts` 생성 — `getAlarmPresets`, `addAlarmPreset`, `deleteAlarmPreset`, `toggleAlarmPreset`
- [x] 3.2 `src/db/appSettingsDao.ts`에 `last_active_child_id` 키 사용 확인 (getSetting/setSetting 재사용)

## 4. 활성 아이 ID 영속화

- [x] 4.1 `src/context/ChildContext.tsx`의 `setActiveChild` — 호출 시 `setSetting('last_active_child_id', id)` 추가
- [x] 4.2 ChildContext 초기화 시 `last_active_child_id`와 `activeChildId` 동기화 확인

## 5. 알림 서비스

- [x] 5.1 `src/services/notificationService.ts` 생성
- [x] 5.2 `requestPermissionsAsync()` — 퍼미션 요청, 결과 반환
- [x] 5.3 `registerNotificationCategory()` — `QUICK_RECORD_CATEGORY` + `QUICK_RECORD_ACTION` (텍스트 입력 액션) 등록
- [x] 5.4 `scheduleAlarms(alarms)` — 전체 알림 취소 후 enabled 알람 재스케줄 (매일 반복, `categoryIdentifier` 지정)
- [x] 5.5 `handleNotificationResponse(response)` — 액션 ID 확인 → userText 추출 → `getSetting('last_active_child_id')` → `processTextRecord(text, childId)`

## 6. AppNavigator 연동

- [x] 6.1 `src/navigation/AppNavigator.tsx` 앱 시작 시 `registerNotificationCategory()` 호출
- [x] 6.2 앱 시작 시 DB 로딩 완료 후 `scheduleAlarms()` 호출
- [x] 6.3 `addNotificationResponseReceivedListener` 등록 → `handleNotificationResponse` 연결
- [x] 6.4 컴포넌트 언마운트 시 리스너 구독 해제

## 7. 설정 UI

- [x] 7.1 `src/screens/SettingsScreen.tsx`에 알람 섹션 추가 — 알람 목록, 추가 버튼
- [x] 7.2 시간 선택 UI — `DateTimePicker` (`@react-native-community/datetimepicker`) 또는 커스텀 시/분 피커
- [x] 7.3 알람 추가 시 퍼미션 확인 → 없으면 요청 → 거부 시 안내 메시지
- [x] 7.4 알람 추가/삭제/토글 후 `scheduleAlarms()` 즉시 재호출

## 8. 검증

- [x] 8.1 `npx tsc --noEmit` 타입 체크 통과
- [ ] 8.2 실기기에서 알람 추가 → 지정 시간에 알림 수신 확인
- [ ] 8.3 알림에서 인라인 답장 → 홈 화면에서 `ai_pending` 기록 생성 확인
- [ ] 8.4 앱 포그라운드 진입 시 AI 처리 완료 확인
- [ ] 8.5 알람 토글 끔 → 해당 시간에 알림 미발송 확인
