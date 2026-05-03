import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSetting } from '../db/appSettingsDao';
import { getAlarmPresets, type AlarmPreset } from '../db/alarmPresetsDao';
import { processTextRecord } from './recordPipeline';

const CATEGORY_ID = 'QUICK_RECORD_CATEGORY';
const ACTION_ID = 'QUICK_RECORD_ACTION';

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerNotificationCategory(): Promise<void> {
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
  await Notifications.cancelAllScheduledNotificationsAsync();

  const list = alarms ?? await getAlarmPresets();
  const enabled = list.filter(a => a.enabled);

  for (const alarm of enabled) {
    await Notifications.scheduleNotificationAsync({
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

  const userText = (response as any).userText as string | undefined;
  if (!userText?.trim()) return;

  const childId = await getSetting('last_active_child_id');
  if (!childId) return;

  try {
    await processTextRecord(userText.trim(), childId);
  } catch {
    // processTextRecord 내부에서 ai_pending=1로 저장되므로 에러 무시
  }
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
