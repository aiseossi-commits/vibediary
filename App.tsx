import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ChildProvider } from './src/context/ChildContext';
import { initializeDatabase } from './src/db';

function AppContent() {
  const { isDark } = useTheme();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setDbReady(true))
      .catch(() => setDbReady(true));
  }, []);

  if (!dbReady) return <View style={{ flex: 1, backgroundColor: '#070D1A' }} />;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  useFonts({
    'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ChildProvider>
          <AppContent />
        </ChildProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
