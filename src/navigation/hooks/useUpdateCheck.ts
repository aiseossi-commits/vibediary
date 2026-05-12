import { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

function isOlderVersion(current: string, min: string): boolean {
  const c = current.split('.').map(Number);
  const m = min.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] ?? 0) < (m[i] ?? 0)) return true;
    if ((c[i] ?? 0) > (m[i] ?? 0)) return false;
  }
  return false;
}

export function useUpdateCheck() {
  useEffect(() => {
    const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
    const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
    if (!workerUrl || !workerSecret) return;

    const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
    fetch(`${workerUrl}/version`, { headers: { 'X-App-Secret': workerSecret } })
      .then(res => res.json())
      .then((data: { ios: string; android: string; force: boolean }) => {
        const minVersion = Platform.OS === 'ios' ? data.ios : data.android;
        if (!isOlderVersion(currentVersion, minVersion)) return;

        const storeUrl = Platform.OS === 'ios'
          ? 'itms-beta://'
          : `https://play.google.com/store/apps/details?id=com.aiseossi.vibediary`;

        Alert.alert(
          '업데이트 안내',
          `새 버전(${minVersion})이 있습니다.\n최신 버전으로 업데이트해 주세요.`,
          [
            ...(data.force ? [] : [{ text: '나중에', style: 'cancel' as const }]),
            { text: '업데이트', onPress: () => Linking.openURL(storeUrl) },
          ]
        );
      })
      .catch(() => {}); // 버전 체크 실패는 무시
  }, []);
}
