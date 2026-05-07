import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useTheme } from '../context/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';
import { SettingsSection } from '../components/settings';

export default function SettingsAboutScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SettingsSection title="후원">
          <View style={styles.card}>
            <Text style={styles.donationBanner}>
              이 앱은 여러분의 후원으로 운영됩니다.{'\n'}
              한 달에 커피 한 잔 값이면 서버가 유지됩니다.
            </Text>
            <View style={styles.accountRow}>
              <Text style={styles.accountText}>농협 351-0788-9998-53 서현석</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={async () => {
                  await Clipboard.setStringAsync('농협 351-0788-9998-53 서현석');
                  Alert.alert('복사됨', '계좌번호가 복사되었습니다.');
                }}
              >
                <Text style={styles.copyButtonText}>복사</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="앱 정보">
          <View style={styles.card}>
            <Text style={styles.appName}>바다 vibediary</Text>
            <Text style={styles.slogan}>기록에 치이지 말고, 그냥 말하세요</Text>
            <Text style={styles.version}>
              v{Constants.expoConfig?.version ?? '1.0.0'} (build {Application.nativeBuildVersion ?? '?'})
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://aiseossi-commits.github.io/vibediary/privacy-policy.html')}
              style={{ marginTop: SPACING.md }}
            >
              <Text style={[styles.version, { color: colors.primary }]}>개인정보 처리방침</Text>
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
    donationBanner: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    accountText: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium },
    copyButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: colors.surfaceSecondary, borderRadius: BORDER_RADIUS.sm },
    copyButtonText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
    appName: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.xs },
    slogan: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontStyle: 'italic', marginBottom: SPACING.xs },
    version: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
  });
}
