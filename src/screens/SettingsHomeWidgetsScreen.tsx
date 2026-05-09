import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS, type AppColors } from '../constants/theme';
import { HOME_WIDGETS, type HomeWidgetKey } from '../constants/homeWidgets';
import { useHomeWidgetSettings } from '../hooks/useHomeWidgetSettings';
import { getSetting, setSetting } from '../db/appSettingsDao';
import { SettingsSection } from '../components/settings';

const HOME_SUBTITLE_KEY = 'home_subtitle';
const HOME_SUBTITLE_DEFAULT = '말하는 순간, 기억이 됩니다.';

export default function SettingsHomeWidgetsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings: widgetSettings, toggle: toggleWidget } = useHomeWidgetSettings();
  const [subtitle, setSubtitle] = useState(HOME_SUBTITLE_DEFAULT);

  useEffect(() => {
    getSetting(HOME_SUBTITLE_KEY).then(val => setSubtitle(val ?? HOME_SUBTITLE_DEFAULT));
  }, []);

  const widgets: { key: HomeWidgetKey; label: string }[] = [
    { key: HOME_WIDGETS.VOICE_INPUT,    label: '음성 입력' },
    { key: HOME_WIDGETS.TEXT_INPUT,     label: '텍스트 입력' },
    { key: HOME_WIDGETS.EVENT_TRACKER,  label: '증상 추적' },
    { key: HOME_WIDGETS.RECENT_RECORDS, label: '오늘 기록' },
    { key: HOME_WIDGETS.TODAY_ISSUE,    label: '오늘의 이슈' },
    { key: HOME_WIDGETS.AI_INPUT_MODE,  label: 'AI 입력 모드 (길게 눌러 말하기)' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SettingsSection title="홈화면 구성">
          <View style={styles.card}>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitleLabel}>홈 문구</Text>
              <TextInput
                style={styles.subtitleInput}
                value={subtitle}
                onChangeText={setSubtitle}
                onBlur={() => setSetting(HOME_SUBTITLE_KEY, subtitle.trim() || HOME_SUBTITLE_DEFAULT)}
                placeholder={HOME_SUBTITLE_DEFAULT}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
              />
            </View>
            {widgets.map(({ key, label }, index, arr) => (
              <View key={key} style={index === arr.length - 1 ? styles.widgetRowLast : styles.widgetRow}>
                <Text style={styles.widgetLabel}>{label}</Text>
                <Switch
                  value={widgetSettings[key]}
                  onValueChange={() => toggleWidget(key)}
                  trackColor={{ false: colors.divider, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
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
    widgetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
    widgetRowLast: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
    widgetLabel: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary },
    subtitleRow: { paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
    subtitleLabel: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginBottom: SPACING.xs },
    subtitleInput: { fontSize: FONT_SIZE.md, color: colors.textPrimary, paddingVertical: SPACING.xs },
  });
}
