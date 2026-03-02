import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RecordingScreen from '../screens/RecordingScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import { processRecording } from '../services/recordPipeline';
import { COLORS, SPACING, TOUCH_TARGET, FONT_SIZE, FONT_WEIGHT, SHADOW } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 탭 아이콘 (이모지 기반, 아이콘 라이브러리 없이)
const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Home: { active: '🏠', inactive: '🏠' },
  Calendar: { active: '📅', inactive: '📅' },
  Search: { active: '🔍', inactive: '🔍' },
  Settings: { active: '⚙️', inactive: '⚙️' },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
              {focused ? icons?.active : icons?.inactive}
            </Text>
          );
        },
        tabBarLabel: () => null,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ tabBarLabel: '캘린더' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: '검색' }}
      />
<Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: '설정' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
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
            headerTintColor: COLORS.primary,
            headerStyle: { backgroundColor: COLORS.surface },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// RecordingScreen 래퍼 (네비게이션 연결)
function RecordingScreenWrapper({ navigation }: any) {
  const handleRecordingComplete = useCallback(
    async (uri: string, duration: number) => {
      try {
        await processRecording(uri);
        navigation.goBack();
      } catch (error) {
        console.warn('기록 처리 실패:', error);
        navigation.goBack();
      }
    },
    [navigation]
  );

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <RecordingScreen
      onRecordingComplete={handleRecordingComplete}
      onCancel={handleCancel}
    />
  );
}
