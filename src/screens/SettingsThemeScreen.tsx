import React, { useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';
import { SettingsSection } from '../components/settings';

export default function SettingsThemeScreen() {
  const { colors, isDark, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const toggleAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(toggleAnim, { toValue: isDark ? 1 : 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [isDark, toggleAnim]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SettingsSection title="화면 모드">
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.themeToggleInnerRow}
              onPress={() => setTheme(isDark ? 'light' : 'dark')}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.themeToggleLabel}>{isDark ? '밤바다' : '바다'}</Text>
              </View>
              <Animated.View style={[
                styles.toggleTrack,
                {
                  backgroundColor: toggleAnim.interpolate({
                    inputRange: [0, 1], outputRange: ['#CBD5E1', colors.primary],
                  }),
                },
              ]}>
                <Animated.View style={[
                  styles.toggleThumb,
                  {
                    transform: [{
                      translateX: toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }),
                    }],
                  },
                ]} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    card: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
    themeToggleInnerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs },
    themeToggleLabel: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
    toggleTrack: { width: 51, height: 31, borderRadius: 16, justifyContent: 'center', paddingHorizontal: 2 },
    toggleThumb: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFFFFF' },
  });
}
