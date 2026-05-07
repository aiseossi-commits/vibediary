import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { SPACING, BORDER_RADIUS, type AppColors } from '../constants/theme';
import {
  wakeSync, clearAllDownloadWatermarks, markAllLocalDirty,
  getSyncDiagnostics, type SyncDiagnostics,
} from '../services/syncService';
import { SettingsSection, SettingsRow, SettingsCard } from '../components/settings';

export default function SettingsSyncDiagnosticsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { refreshChildren } = useChild();

  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics | null>(null);

  const loadDiagnostics = useCallback(async () => {
    try {
      const d = await getSyncDiagnostics();
      setDiagnostics(d);
    } catch (e) {
      console.error('[SyncDiagnostics] load error:', e);
    }
  }, []);

  useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  const handleResync = useCallback(async () => {
    await markAllLocalDirty();
    await clearAllDownloadWatermarks();
    await wakeSync('manual_retry');
    await refreshChildren();
    await loadDiagnostics();
    Alert.alert('', '재동기화가 완료됐습니다');
  }, [loadDiagnostics, refreshChildren]);

  const handleCopy = useCallback(async () => {
    if (!diagnostics) return;
    const text = JSON.stringify(diagnostics, null, 2);
    await Clipboard.setStringAsync(text);
    Alert.alert('', '진단 정보 복사됨');
  }, [diagnostics]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SettingsSection title="작업">
          <SettingsCard>
            <SettingsRow label="새로고침" onPress={loadDiagnostics} />
            <SettingsRow label="전체 재동기화" onPress={handleResync} />
            {diagnostics ? (
              <SettingsRow label="진단 정보 복사" onPress={handleCopy} />
            ) : null}
          </SettingsCard>
        </SettingsSection>

        {diagnostics ? (
          <SettingsSection title="현재 상태">
            <View style={styles.diagBox}>
              <Text style={styles.code}>
                readiness: {diagnostics.currentReadiness.status}
                {diagnostics.currentReadiness.status === 'ready'
                  ? `\nuser_id: ${diagnostics.currentReadiness.userId}\nfamily_id: ${diagnostics.currentReadiness.familyId}`
                  : ''}
              </Text>
              <Text style={styles.code}>
                last_sync_family_id: {diagnostics.lastSyncFamilyId ?? '(null)'}
              </Text>

              <Text style={styles.codeHeading}>Pending (is_synced=0):</Text>
              {Object.entries(diagnostics.pendingCounts).map(([t, c]) => (
                <Text key={t} style={[styles.code, c > 0 ? { color: colors.error } : null]}>
                  {`  ${t}: ${c}`}
                </Text>
              ))}

              {Object.keys(diagnostics.failedRowsByTable).length > 0 ? (
                <>
                  <Text style={[styles.codeHeading, { color: colors.error }]}>Failed rows:</Text>
                  {Object.entries(diagnostics.failedRowsByTable).map(([t, rows]) => (
                    <View key={t}>
                      <Text style={styles.codeStrong}>{t}:</Text>
                      {rows.map(r => (
                        <Text key={r.id} style={[styles.codeSmall, { color: colors.error }]}>
                          {`  ${r.id.slice(0, 8)}: ${r.sync_error}`}
                        </Text>
                      ))}
                    </View>
                  ))}
                </>
              ) : null}

              <Text style={styles.codeHeading}>Recent attempts:</Text>
              {diagnostics.recentAttempts.slice(0, 5).map(a => (
                <Text key={a.id} style={styles.codeSmall}>
                  {`#${a.id} ${a.reason} ${a.readiness_status} up=${a.uploaded_count}/fail=${a.failed_count}/dl=${a.download_count}${a.last_error_message ? '\n     err: ' + a.last_error_message : ''}`}
                </Text>
              ))}
            </View>
          </SettingsSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  const monoFamily = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    diagBox: {
      marginHorizontal: SPACING.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      gap: SPACING.xs,
    },
    code: {
      fontFamily: monoFamily,
      fontSize: 11,
      color: colors.textSecondary,
    },
    codeHeading: {
      fontFamily: monoFamily,
      fontSize: 11,
      color: colors.textPrimary,
      marginTop: 4,
    },
    codeStrong: {
      fontFamily: monoFamily,
      fontSize: 11,
      color: colors.textPrimary,
    },
    codeSmall: {
      fontFamily: monoFamily,
      fontSize: 10,
      color: colors.textSecondary,
    },
  });
}
