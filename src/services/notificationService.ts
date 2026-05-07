import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSetting } from '../db/appSettingsDao';
import { getAlarmPresets, type AlarmPreset } from '../db/alarmPresetsDao';
import { processTextRecord } from './recordPipeline';

const CATEGORY_ID = 'QUICK_RECORD_CATEGORY';
const ACTION_ID = 'QUICK_RECORD_ACTION';

// 세션 내 중복 처리 방지 (listener + getLastNotificationResponseAsync 양쪽에서 호출 가능)
const handledNotificationIds = new Set<string>();

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerNotificationCategory(): Promise<void> {
  await Notifications.deleteNotificationCategoryAsync(CATEGORY_ID).catch(() => {});
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    {
      identifier: ACTION_ID,
      buttonTitle: '기록하기',
      textInput: {
        submitButtonTitle: '저장',
        placeholder: '오늘 있었던 일을 입력하세요',
      },
      options: { opensAppToForeground: false },
    },
  ]);
}

export async function scheduleAlarms(alarms?: AlarmPreset[]): Promise<void> {
  const list = alarms ?? await getAlarmPresets();
  const enabled = list.filter(a => a.enabled);

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduled.map(n => n.identifier));
  const enabledIds = new Set(enabled.map(a => `alarm-${a.id}`));

  // 알람 prefix만 대상으로 cancel (다른 scheduled notification 보호)
  for (const notif of scheduled) {
    if (!notif.identifier.startsWith('alarm-')) continue;
    if (!enabledIds.has(notif.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  // 아직 스케줄되지 않은 활성 알람만 등록
  for (const alarm of enabled) {
    const identifier = `alarm-${alarm.id}`;
    if (scheduledIds.has(identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: '바다',
        body: '기록할 것이 있나요?',
        categoryIdentifier: CATEGORY_ID,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: alarm.hour,
        minute: alarm.minute,
      },
    });
  }
}

export async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  if (response.actionIdentifier !== ACTION_ID) return;

  const notifId = response.notification.request.identifier;
  if (handledNotificationIds.has(notifId)) return;
  handledNotificationIds.add(notifId);

  await Notifications.dismissNotificationAsync(notifId).catch(() => {});

  const userText = (response as any).userText as string | undefined;
  if (!userText?.trim()) return;

  const childId = await getSetting('last_active_child_id');
  if (!childId) return;

  // fire-and-forget: action handler가 즉시 return해야 Android RemoteInput 스피너가 해제됨
  // AI 호출(5~10초)을 await하면 OS가 스피너를 계속 표시하거나 timeout 처리할 수 있음
  void processTextRecord(userText.trim(), childId).catch(e => {
    console.warn('[notificationService] processTextRecord 실패:', e);
    // processTextRecord 내부에서 ai_pending=1로 저장되므로 사용자 입력 유실 위험은 낮음
  });
}

// Android 포그라운드 알림 동작 설정
if (Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
