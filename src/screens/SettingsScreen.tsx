import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPendingQueueCount, processOfflineQueue } from '../services/offlineQueue';
import { isDatabaseReady } from '../db';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOW } from '../constants/theme';

export default function SettingsScreen() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    if (!isDatabaseReady()) return;
    try {
      const count = await getPendingQueueCount();
      setPendingCount(count);
    } catch {
      // DB 미가용 시 무시
    }
  };

  const handleProcessQueue = async () => {
    setIsProcessing(true);
    try {
      const processed = await processOfflineQueue();
      Alert.alert('완료', `${processed}건의 기록이 AI 처리되었습니다.`);
      loadPendingCount();
    } catch {
      Alert.alert('오류', '처리 중 문제가 발생했습니다.');
    }
    setIsProcessing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
      </View>

      {/* AI 데이터 투명성 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 데이터 및 프라이버시</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI에 전송되는 데이터</Text>
          <Text style={styles.cardDescription}>
            • 음성 파일은 기기에만 저장되며 서버로 전송되지 않습니다{'\n'}
            • STT 변환된 텍스트만 AI(Claude)에 전송됩니다{'\n'}
            • AI 서버에 데이터가 저장되지 않습니다{'\n'}
            • 모든 기록은 기기 내 암호화 DB에 보관됩니다
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>데이터 저장 위치</Text>
          <Text style={styles.cardDescription}>
            • 음성 파일: 기기 로컬 전용{'\n'}
            • 기록 데이터: 기기 내 SQLite DB{'\n'}
            • 클라우드 백업: 비활성화 (설정에서 활성화 가능)
          </Text>
        </View>
      </View>

      {/* 오프라인 큐 */}
      {pendingCount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ 대기 중인 AI 처리</Text>
          <View style={styles.card}>
            <Text style={styles.cardDescription}>
              오프라인에서 저장된 {pendingCount}건의 기록이 AI 처리를 기다리고 있습니다.
            </Text>
            <TouchableOpacity
              onPress={handleProcessQueue}
              style={styles.processButton}
              disabled={isProcessing}
            >
              <Text style={styles.processButtonText}>
                {isProcessing ? '처리 중...' : '지금 처리하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 앱 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ 앱 정보</Text>
        <View style={styles.card}>
          <Text style={styles.appName}>바다 vibediary</Text>
          <Text style={styles.slogan}>기록에 치이지 말고, 그냥 말하세요</Text>
          <Text style={styles.version}>버전 1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  section: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  processButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  processButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHT.medium,
    fontSize: FONT_SIZE.sm,
  },
  appName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  slogan: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
  },
  version: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
  },
});
