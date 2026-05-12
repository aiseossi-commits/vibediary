import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../../constants/theme';
import { SettingsSection } from '../../components/settings';

export default function SettingsPrivacyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SettingsSection title="데이터 및 프라이버시">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI에 전송되는 데이터</Text>
            <Text style={styles.cardDescription}>
              • 음성 파일은 기기에만 저장되며 서버로 전송되지 않습니다{'\n'}
              • STT 변환된 텍스트만 AI(Google Gemini)에 전송됩니다{'\n'}
              • AI 서버에 데이터가 저장되지 않습니다{'\n'}
              • 모든 기록은 기기 내 로컬 DB에 보관됩니다
            </Text>
          </View>
          <View style={[styles.card, { marginTop: SPACING.sm }]}>
            <Text style={styles.cardTitle}>데이터 저장 위치</Text>
            <Text style={styles.cardDescription}>
              • 음성 파일: 기기 로컬 전용{'\n'}
              • 기록 데이터: 기기 내 SQLite DB{'\n'}
              • 클라우드 백업: 비활성화 (설정에서 활성화 가능)
            </Text>
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
    cardTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.xs },
    cardDescription: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 22 },
  });
}
