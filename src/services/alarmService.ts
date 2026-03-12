import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';

export interface AlarmSetting {
  id: string;
  label: string;
  enabled: boolean;
  hour: number;
  minute: number;
  message: string;
  notificationIds: string[]; // 예약된 알림 ID 목록
}

const ALARMS_FILE = `${FileSystem.documentDirectory}alarms.json`;

const DEFAULT_ALARMS: AlarmSetting[] = [
  {
    id: 'morning',
    label: '굿모닝',
    enabled: false,
    hour: 9,
    minute: 0,
    message: '간밤에 수면은 어떠셨나요?',
    notificationIds: [],
  },
  {
    id: 'night',
    label: '굿나잇',
    enabled: false,
    hour: 21,
    minute: 0,
    message: '오늘 하루는 어떠셨나요?',
    notificationIds: [],
  },
];

// 알림 핸들러 설정 (앱 포그라운드에서도 알림 표시)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 알람 목록 불러오기
export async function loadAlarms(): Promise<AlarmSetting[]> {
  try {
    const info = await FileSystem.getInfoAsync(ALARMS_FILE);
    if (!info.exists) return DEFAULT_ALARMS;
    const raw = await FileSystem.readAsStringAsync(ALARMS_FILE);
    const saved: AlarmSetting[] = JSON.parse(raw);
    // 기본 알람(morning/night)이 없으면 병합
    const ids = saved.map((a) => a.id);
    const merged = [...saved];
    for (const def of DEFAULT_ALARMS) {
      if (!ids.includes(def.id)) merged.unshift(def);
    }
    return merged;
  } catch {
    return DEFAULT_ALARMS;
  }
}

// 알람 목록 저장
async function saveAlarms(alarms: AlarmSetting[]): Promise<void> {
  await FileSystem.writeAsStringAsync(ALARMS_FILE, JSON.stringify(alarms));
}

// 알림 권한 요청
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 알람 활성화 — 매일 반복 알림 예약
async function scheduleAlarm(alarm: AlarmSetting): Promise<string[]> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `바다 ${alarm.label}`,
      body: alarm.message,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: alarm.hour,
      minute: alarm.minute,
    },
  });
  return [id];
}

// 알람 비활성화 — 예약된 알림 취소
async function cancelAlarm(notificationIds: string[]): Promise<void> {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
}

// 알람 토글 (on/off)
export async function toggleAlarm(alarmId: string, enabled: boolean): Promise<AlarmSetting[]> {
  const alarms = await loadAlarms();
  const updated = await Promise.all(
    alarms.map(async (alarm) => {
      if (alarm.id !== alarmId) return alarm;
      if (enabled) {
        await cancelAlarm(alarm.notificationIds);
        const notificationIds = await scheduleAlarm(alarm);
        return { ...alarm, enabled: true, notificationIds };
      } else {
        await cancelAlarm(alarm.notificationIds);
        return { ...alarm, enabled: false, notificationIds: [] };
      }
    })
  );
  await saveAlarms(updated);
  return updated;
}

// 알람 시간/문구 수정
export async function updateAlarm(alarmId: string, hour: number, minute: number, message: string, label: string): Promise<AlarmSetting[]> {
  const alarms = await loadAlarms();
  const updated = await Promise.all(
    alarms.map(async (alarm) => {
      if (alarm.id !== alarmId) return alarm;
      await cancelAlarm(alarm.notificationIds);
      const newAlarm = { ...alarm, hour, minute, message, label };
      if (alarm.enabled) {
        const notificationIds = await scheduleAlarm(newAlarm);
        return { ...newAlarm, notificationIds };
      }
      return { ...newAlarm, notificationIds: [] };
    })
  );
  await saveAlarms(updated);
  return updated;
}

// 커스텀 알람 추가
export async function addAlarm(hour: number, minute: number, message: string, label: string): Promise<AlarmSetting[]> {
  const alarms = await loadAlarms();
  const newAlarm: AlarmSetting = {
    id: `custom_${Date.now()}`,
    label,
    enabled: false,
    hour,
    minute,
    message,
    notificationIds: [],
  };
  const updated = [...alarms, newAlarm];
  await saveAlarms(updated);
  return updated;
}

// 커스텀 알람 삭제
export async function deleteAlarm(alarmId: string): Promise<AlarmSetting[]> {
  const alarms = await loadAlarms();
  const target = alarms.find((a) => a.id === alarmId);
  if (target) await cancelAlarm(target.notificationIds);
  const updated = alarms.filter((a) => a.id !== alarmId);
  await saveAlarms(updated);
  return updated;
}
