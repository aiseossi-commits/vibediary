import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeDatabase } from './src/db';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from './src/constants/theme';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        console.log('DB 초기화 시작...');
        await initializeDatabase();
        console.log('DB 초기화 완료!');
        setIsReady(true);
      } catch (e) {
        console.error('DB 초기화 실패:', e);
        // 웹에서 DB 실패 시에도 앱은 표시 (제한된 기능)
        setIsReady(true);
      }
    }
    initialize();
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>바다를 준비하고 있어요...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.medium,
  },
});
