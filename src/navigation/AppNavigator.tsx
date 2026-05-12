import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Alert, View, Linking, Platform, AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsHubScreen from '../screens/SettingsHubScreen';
import SettingsAlarmScreen from '../screens/SettingsAlarmScreen';
import SettingsBackupScreen from '../screens/SettingsBackupScreen';
import SettingsSyncDiagnosticsScreen from '../screens/SettingsSyncDiagnosticsScreen';
import SettingsChildrenScreen from '../screens/SettingsChildrenScreen';
import SettingsAiTagScreen from '../screens/SettingsAiTagScreen';
import SettingsHomeWidgetsScreen from '../screens/SettingsHomeWidgetsScreen';
import SettingsPrivacyScreen from '../screens/SettingsPrivacyScreen';
import RecordingScreen from '../screens/RecordingScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import TagsScreen from '../screens/TagsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import FamilyShareScreen from '../screens/FamilyShareScreen';
import { runSTTOnly, processFromText } from '../services/recordPipeline';
import { deleteAudioFile } from '../services/audioRecorder';
import { runInitialMigration, wakeSync } from '../services/syncService';
import * as Notifications from 'expo-notifications';
import {
  registerNotificationCategory,
  scheduleAlarms,
  handleNotificationResponse,
} from '../services/notificationService';
import { warmDeno } from '../services/aiProcessor';
import { parseBackupFromUri, restoreOverwrite, restoreMerge } from '../services/backupService';
import Constants from 'expo-constants';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { useAuth } from '../context/AuthContext';

function isOlderVersion(current: string, min: string): boolean {
  const c = current.split('.').map(Number);
  const m = min.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] ?? 0) < (m[i] ?? 0)) return true;
    if ((c[i] ?? 0) > (m[i] ?? 0)) return false;
  }
  return false;
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home:       { active: 'home',            inactive: 'home-outline' },
  Calendar:   { active: 'calendar',        inactive: 'calendar-outline' },
  Search:     { active: 'search',          inactive: 'search-outline' },
};

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons?.active : icons?.inactive}
              size={24}
              color={focused ? colors.primary : colors.tabInactive}
            />
          );
        },
        tabBarLabel: () => null,
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopWidth: 1,
          borderTopColor: colors.tabBorder,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const { children: childList, isLoaded, refreshChildren } = useChild();
  const { session } = useAuth();
  const pendingFileUrl = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const prevConnectedRef = useRef<boolean | null>(null);
  const prevHasSessionRef = useRef<boolean>(false);

  // 인앱 업데이트 체크
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

  const handleIncomingFile = useCallback(async (url: string) => {
    // content:// URI (카카오톡 등)는 파일명 없이 올 수 있으므로 scheme 기준으로도 허용
    const isContentUri = url.startsWith('content://');
    const isJsonUri = url.includes('.json') || url.includes('json');
    if (!isContentUri && !isJsonUri) return;
    try {
      const data = await parseBackupFromUri(url);
      Alert.alert(
        '백업 파일',
        '복원 방식을 선택하세요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '병합 (기존 유지 + 신규 추가)',
            onPress: async () => {
              await restoreMerge(data);
              await refreshChildren();
              Alert.alert('완료', '병합 복원이 완료되었습니다.');
            },
          },
          {
            text: '덮어쓰기 (전체 교체)',
            style: 'destructive',
            onPress: () => {
              Alert.alert('주의', '기존 데이터가 모두 삭제됩니다. 계속하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                {
                  text: '덮어쓰기',
                  style: 'destructive',
                  onPress: async () => {
                    await restoreOverwrite(data);
                    await refreshChildren();
                    Alert.alert('완료', '덮어쓰기 복원이 완료되었습니다.');
                  },
                },
              ]);
            },
          },
        ]
      );
    } catch {
      Alert.alert('오류', '유효하지 않은 백업 파일입니다.');
    }
  }, [refreshChildren]);

  // 앱이 파일로 열렸을 때 처리
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) pendingFileUrl.current = url;
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (isLoaded) {
        handleIncomingFile(url);
      } else {
        pendingFileUrl.current = url;
      }
    });
    return () => sub.remove();
  }, [handleIncomingFile, isLoaded]);

  // DB 준비 완료 후 대기 중인 파일 처리
  useEffect(() => {
    if (isLoaded && pendingFileUrl.current) {
      handleIncomingFile(pendingFileUrl.current);
      pendingFileUrl.current = null;
    }
  }, [isLoaded, handleIncomingFile]);

  // 알림 카테고리 등록 + 알람 스케줄링 + 응답 리스너
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

  // 앱 시작 시 Supabase 동기화 (백그라운드) — session 준비 후에만 실행
  useEffect(() => {
    if (isLoaded && session) {
      void runInitialMigration().catch(() => {});
    }
  }, [isLoaded, session]);

  // AppState active 복귀 시 재동기화
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current !== 'active' && nextState === 'active' && session) {
        void wakeSync('app_foregrounded');
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [session]);

  // 네트워크 오프라인 → 온라인 복구 시 재동기화
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isNowConnected = !!(state.isConnected && state.isInternetReachable);
      if (prevConnectedRef.current === false && isNowConnected && session) {
        void wakeSync('network_reconnected');
      }
      prevConnectedRef.current = isNowConnected;
    });
    return () => unsub();
  }, [session]);

  // 익명 인증 세션 확보 직후 재동기화 (앱 시작 시 auth가 sync보다 늦게 완료될 경우 대비)
  useEffect(() => {
    const hasSession = session !== null;
    if (!prevHasSessionRef.current && hasSession) {
      void wakeSync('session_ready');
    }
    prevHasSessionRef.current = hasSession;
  }, [session]);

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#070D1A' }} />;
  }

  const hasChildren = childList.length > 0;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasChildren ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="Recording"
              component={RecordingScreenWrapper}
              options={{ presentation: 'fullScreenModal', animation: 'none', contentStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="RecordDetail"
              component={RecordDetailScreen}
              options={{
                headerShown: true,
                title: '기록 상세',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="Tags"
              component={TagsScreen}
              options={{
                headerShown: true,
                title: '태그',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsHubScreen}
              options={{
                headerShown: true,
                title: '설정',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="SettingsAlarm"
              component={SettingsAlarmScreen}
              options={{
                headerShown: true,
                title: '알람 설정',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="SettingsBackup"
              component={SettingsBackupScreen}
              options={{
                headerShown: true,
                title: '백업 / 복원',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="SettingsSyncDiagnostics"
              component={SettingsSyncDiagnosticsScreen}
              options={{
                headerShown: true,
                title: '동기화 진단',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="SettingsChildren"
              component={SettingsChildrenScreen}
              options={{
                headerShown: true,
                title: '바다 관리',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="SettingsAiTag"
              component={SettingsAiTagScreen}
              options={{
                headerShown: true,
                title: 'AI 태그 관리',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="SettingsHomeWidgets"
              component={SettingsHomeWidgetsScreen}
              options={{
                headerShown: true,
                title: '홈화면 구성',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="SettingsPrivacy"
              component={SettingsPrivacyScreen}
              options={{
                headerShown: true,
                title: '데이터 / 프라이버시',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="FamilyShare"
              component={FamilyShareScreen}
              options={{
                headerShown: true,
                title: '가족 공유',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function RecordingScreenWrapper({ navigation, route }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { activeChild } = useChild();

  // 녹음 화면 진입 시 Deno warm (녹음 중 깨어나므로 AI 호출이 빠름)
  useEffect(() => { warmDeno(); }, []);

  const handleRecordingComplete = useCallback(async (uri: string, _duration: number) => {
    setIsProcessing(true);
    try {
      const text = await runSTTOnly(uri, activeChild?.name);
      if (!text.trim()) {
        Alert.alert('음성 입력 없음', '음성 입력이 되지 않았습니다. 다시 녹음해 주세요.');
        setIsProcessing(false);
        return;
      }
      const dateStr: string | undefined = route.params?.date;
      const photoUrl: string | undefined = route.params?.photoUrl;
      const createdAt = dateStr ? new Date(dateStr + 'T12:00:00').getTime() : undefined;
      await processFromText(text, createdAt, activeChild?.id, photoUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'NO_SPEECH') {
        Alert.alert('음성 없음', '음성이 인식되지 않았습니다. 조용한 곳에서 다시 녹음해 주세요.');
      } else {
        console.warn('기록 처리 실패:', error);
        Alert.alert('오류', '기록 저장에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      await deleteAudioFile(uri).catch(() => {});
      const returnTab = route.params?.date ? 'Calendar' : 'Home';
      navigation.navigate('Main', { screen: returnTab });
    }
  }, [navigation, route.params?.date, activeChild?.id]);

  const handleCancel = useCallback(() => { navigation.goBack(); }, [navigation]);

  return (
    <RecordingScreen
      onRecordingComplete={handleRecordingComplete}
      onCancel={handleCancel}
      isProcessing={isProcessing}
    />
  );
}
