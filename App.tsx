import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ChildProvider } from './src/context/ChildContext';
import { AuthProvider } from './src/context/AuthContext';
import { initializeDatabase } from './src/db';
import SplashOverlay from './src/components/SplashOverlay';

SplashScreen.preventAutoHideAsync().catch(() => {});

const MIN_SPLASH_MS = 1200;

function AppContent() {
  const { isDark } = useTheme();
  const [dbReady, setDbReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [overlayHidden, setOverlayHidden] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setDbReady(true))
      .catch(() => setDbReady(true));
    const t = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const showOverlay = !(dbReady && minTimePassed);

  return (
    <View style={{ flex: 1, backgroundColor: '#070D1A' }}>
      {dbReady && (
        <>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AppNavigator />
        </>
      )}
      {!overlayHidden && (
        <SplashOverlay visible={showOverlay} onFadeOutEnd={() => setOverlayHidden(true)} />
      )}
    </View>
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
      <AuthProvider>
        <ThemeProvider>
          <ChildProvider>
            <AppContent />
          </ChildProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
