import React, { useCallback, useState, useEffect } from 'react';
import { Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsHubScreen from '../screens/settings/SettingsHubScreen';
import SettingsAlarmScreen from '../screens/settings/SettingsAlarmScreen';
import SettingsBackupScreen from '../screens/settings/SettingsBackupScreen';
import SettingsSyncDiagnosticsScreen from '../screens/settings/SettingsSyncDiagnosticsScreen';
import SettingsChildrenScreen from '../screens/settings/SettingsChildrenScreen';
import SettingsAiTagScreen from '../screens/settings/SettingsAiTagScreen';
import SettingsHomeWidgetsScreen from '../screens/settings/SettingsHomeWidgetsScreen';
import SettingsPrivacyScreen from '../screens/settings/SettingsPrivacyScreen';
import RecordingScreen from '../screens/RecordingScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import TagsScreen from '../screens/TagsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import FamilyShareScreen from '../screens/FamilyShareScreen';
import { runSTTOnly, processFromText } from '../services/recordPipeline';
import { deleteAudioFile } from '../services/audioRecorder';
import { warmDeno } from '../services/aiProcessor';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { useAuth } from '../context/AuthContext';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import { useBackupFileImport } from './hooks/useBackupFileImport';
import { useNotificationBootstrap } from './hooks/useNotificationBootstrap';
import { useSyncTriggers } from './hooks/useSyncTriggers';

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

  useUpdateCheck();
  useBackupFileImport(isLoaded, refreshChildren);
  useNotificationBootstrap(isLoaded);
  useSyncTriggers(isLoaded, session);

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const hasChildren = childList.length > 0;

  const navTheme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.tabBorder,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
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
