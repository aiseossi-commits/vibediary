import React, { useCallback, useState } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RecordingScreen from '../screens/RecordingScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import TagsScreen from '../screens/TagsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { runSTTOnly, processFromText } from '../services/recordPipeline';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home:     { active: 'home',     inactive: 'home-outline' },
  Calendar: { active: 'calendar', inactive: 'calendar-outline' },
  Search:   { active: 'compass',  inactive: 'compass-outline' },
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
              color={focused ? colors.secondary : colors.textTertiary}
            />
          );
        },
        tabBarLabel: () => null,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textTertiary,
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
  const { children: childList, isLoaded } = useChild();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (childList.length === 0) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen
          name="Recording"
          component={RecordingScreenWrapper}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
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
          component={SettingsScreen}
          options={{
            headerShown: true,
            title: '설정',
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function RecordingScreenWrapper({ navigation, route }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { activeChild } = useChild();

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
      const createdAt = dateStr ? new Date(dateStr + 'T12:00:00').getTime() : undefined;
      await processFromText(uri, text, createdAt, activeChild?.id);
    } catch (error) {
      console.warn('기록 처리 실패:', error);
      Alert.alert('오류', '기록 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      navigation.navigate('Main', { screen: 'Home' });
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
