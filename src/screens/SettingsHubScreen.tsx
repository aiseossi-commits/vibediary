import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getPendingQueueCount, processOfflineQueue } from '../services/offlineQueue';
import { isDatabaseReady } from '../db';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';
import { getAlarmPresets, type AlarmPreset } from '../db/alarmPresetsDao';
import { SettingsRow, SettingsCard } from '../components/settings';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    section: { marginTop: SPACING.md, paddingHorizontal: SPACING.md },
    sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.sm },
    // 오프라인 큐 처리(허브에 남아있는 액션 카드)
    card: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
    cardDescription: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 22 },
    processButton: { marginTop: SPACING.md, backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.sm, paddingVertical: SPACING.sm, alignItems: 'center' },
    processButtonText: { color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium, fontSize: FONT_SIZE.sm },
  });
}

export default function SettingsHubScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children: childList, activeChild } = useChild();
  const navigation = useNavigation();
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // 알람 카운트만 로드 (요약 표시용 — 실제 관리는 SettingsAlarmScreen)
  const [alarms, setAlarms] = useState<AlarmPreset[]>([]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      getAlarmPresets().then(setAlarms).catch(() => {});
    });
    getAlarmPresets().then(setAlarms).catch(() => {});
    return unsub;
  }, [navigation]);

  useEffect(() => { loadCounts(); }, []);

  const loadCounts = async () => {
    if (!isDatabaseReady()) return;
    try {
      const pending = await getPendingQueueCount();
      setPendingCount(pending);
    } catch {
      // 카운트 조회 실패 — UI에 0 표시 유지
    }
  };

  const handleProcessQueue = async () => {
    setIsProcessing(true);
    try {
      const result = await processOfflineQueue(true);
      switch (result.status) {
        case 'ok':
          Alert.alert('완료', `${result.processed}건의 기록이 AI 처리되었습니다.`);
          loadCounts();
          break;
        case 'empty':
          Alert.alert('완료', '처리할 기록이 없어요.');
          break;
        case 'offline':
          Alert.alert('오프라인', '인터넷에 연결되지 않았어요.\n연결 후 다시 시도해주세요.');
          break;
        case 'already_running':
          Alert.alert('처리 중', '이미 AI 처리가 진행 중이에요.');
          break;
        case 'cooldown':
          Alert.alert('완료', '처리할 기록이 없어요.');
          loadCounts();
          break;
      }
    } catch {
      Alert.alert('오류', '처리 중 문제가 발생했습니다.');
    }
    setIsProcessing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>설정</Text>
        </View>

        {/* 알람 (디테일 스크린으로 이동) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기록 알람</Text>
          <SettingsCard>
            <SettingsRow
              label="알람 설정"
              hint={alarms.length > 0 ? `${alarms.filter(a => a.enabled).length}개 활성` : '없음'}
              onPress={() => (navigation as any).navigate('SettingsAlarm')}
            />
          </SettingsCard>
        </View>

        {/* 바다 관리 (디테일 스크린으로 이동) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 바다</Text>
          <SettingsCard>
            <SettingsRow
              label="바다 관리"
              hint={activeChild ? activeChild.name : `${childList.length}개`}
              onPress={() => (navigation as any).navigate('SettingsChildren')}
            />
          </SettingsCard>
        </View>

        {/* 가족 공유 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>가족 공유</Text>
          <SettingsCard>
            <SettingsRow
              label="초대코드로 가족과 공유"
              onPress={() => (navigation as any).navigate('FamilyShare')}
            />
          </SettingsCard>
        </View>

        {/* 동기화 진단 (디테일 스크린으로 이동) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>동기화</Text>
          <SettingsCard>
            <SettingsRow
              label="동기화 진단 / 재동기화"
              onPress={() => (navigation as any).navigate('SettingsSyncDiagnostics')}
            />
          </SettingsCard>
        </View>

        {/* 데이터 백업/복원 (디테일 스크린으로 이동) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 백업/복원</Text>
          <SettingsCard>
            <SettingsRow
              label="백업 / 복원"
              onPress={() => (navigation as any).navigate('SettingsBackup')}
            />
          </SettingsCard>
        </View>

        {/* 화면 모드 (디테일 스크린) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>화면 모드</Text>
          <SettingsCard>
            <SettingsRow
              label="화면 모드"
              hint={isDark ? '밤바다' : '바다'}
              onPress={() => (navigation as any).navigate('SettingsTheme')}
            />
          </SettingsCard>
        </View>

        {/* 홈화면 구성 (디테일 스크린) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>홈화면 구성</Text>
          <SettingsCard>
            <SettingsRow
              label="홈 문구 / 위젯 토글"
              onPress={() => (navigation as any).navigate('SettingsHomeWidgets')}
            />
          </SettingsCard>
        </View>

        {/* AI 태그 (디테일 스크린으로 이동) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI 태그 관리</Text>
          <SettingsCard>
            <SettingsRow
              label="기존 기록 태그 재분석"
              onPress={() => (navigation as any).navigate('SettingsAiTag')}
            />
          </SettingsCard>
        </View>

        {/* 데이터 / 프라이버시 (디테일 스크린) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 / 프라이버시</Text>
          <SettingsCard>
            <SettingsRow
              label="데이터 / 프라이버시"
              onPress={() => (navigation as any).navigate('SettingsPrivacy')}
            />
          </SettingsCard>
        </View>

        {/* 미분류 기록은 SettingsChildrenScreen으로 이동됨 */}

        {/* 오프라인 큐 */}
        {pendingCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>대기 중인 AI 처리</Text>
            <View style={styles.card}>
              <Text style={styles.cardDescription}>
                오프라인에서 저장된 {pendingCount}건의 기록이 AI 처리를 기다리고 있습니다.
              </Text>
              <TouchableOpacity onPress={handleProcessQueue} style={styles.processButton} disabled={isProcessing}>
                <Text style={styles.processButtonText}>{isProcessing ? '처리 중...' : '지금 처리하기'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}


        {/* 후원 + 앱 정보 (디테일 스크린) */}
        <View style={[styles.section, { marginBottom: SPACING.xxl }]}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <SettingsCard>
            <SettingsRow
              label="후원 / 앱 정보"
              onPress={() => (navigation as any).navigate('SettingsAbout')}
            />
          </SettingsCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
