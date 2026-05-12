import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import {
  registerNotificationCategory,
  scheduleAlarms,
  handleNotificationResponse,
} from '../../services/notificationService';

export function useNotificationBootstrap(isLoaded: boolean) {
  useEffect(() => {
    if (!isLoaded) return;
    void registerNotificationCategory();
    void scheduleAlarms();
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    // 앱이 종료 상태에서 알림 응답으로 실행된 경우 처리
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) void handleNotificationResponse(response);
    });
    return () => sub.remove();
  }, [isLoaded]);
}
