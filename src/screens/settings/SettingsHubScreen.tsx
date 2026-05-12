import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Animated, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { getPendingQueueCount, processOfflineQueue } from '../../services/offlineQueue';
import { isDatabaseReady } from '../../db';
import { useTheme } from '../../context/ThemeContext';
import { useChild } from '../../context/ChildContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../../constants/theme';
import { getAlarmPresets, type AlarmPreset } from '../../db/alarmPresetsDao';
import { SettingsRow, SettingsCard } from '../../components/settings';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    section: { marginTop: SPACING.md, paddingHorizontal: SPACING.md },
    card: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
    cardDescription: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 22 },
    processButton: { marginTop: SPACING.md, backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.sm, paddingVertical: SPACING.sm, alignItems: 'center' },
    // 인라인 테마 토글 — SettingsRow와 같은 패딩/최소 높이 맞춤
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
      minHeight: 48,
    },
    themeLabel: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary },
    toggleTrack: { width: 51, height: 31, borderRadius: 16, justifyContent: 'center', paddingHorizontal: 2 },
    toggleThumb: {
      width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFFFFF',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
    },
    // 후원
    donationBanner: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    accountText: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium },
    copyButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: colors.surfaceSecondary, borderRadius: BORDER_RADIUS.sm },
    copyButtonText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
    // 앱 정보
    appName: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.xs },
    slogan: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontStyle: 'italic', marginBottom: SPACING.xs },
    version: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    processButtonText: { color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium, fontSize: FONT_SIZE.sm },
    devSectionLabel: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.xs, paddingHorizontal: SPACING.xs },
  });
}

export default function SettingsHubScreen() {
  const { colors, isDark, setTheme } = useTheme();
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

  // 테마 토글 애니메이션
  const toggleAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(toggleAnim, { toValue: isDark ? 1 : 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [isDark, toggleAnim]);

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

        {/* 그룹 1 — 기록 */}
        <View style={styles.section}>
          <SettingsCard>
            <SettingsRow
              label="알람"
              hint={alarms.length > 0 ? `${alarms.filter(a => a.enabled).length}개 활성` : '없음'}
              onPress={() => (navigation as any).navigate('SettingsAlarm')}
            />
            <SettingsRow
              label="바다 관리"
              hint={activeChild ? `${activeChild.name} · ${childList.length}명` : `${childList.length}명`}
              onPress={() => (navigation as any).navigate('SettingsChildren')}
            />
            <SettingsRow
              label="가족 공유"
              onPress={() => (navigation as any).navigate('FamilyShare')}
            />
          </SettingsCard>
        </View>

        {/* 그룹 2 — 데이터 */}
        <View style={styles.section}>
          <SettingsCard>
            <SettingsRow
              label="백업 / 복원"
              onPress={() => (navigation as any).navigate('SettingsBackup')}
            />
            <SettingsRow
              label="프라이버시"
              onPress={() => (navigation as any).navigate('SettingsPrivacy')}
            />
          </SettingsCard>
        </View>

        {/* 그룹 3 — 화면 */}
        <View style={styles.section}>
          <SettingsCard>
            <View>
              <TouchableOpacity
                style={styles.themeRow}
                onPress={() => setTheme(isDark ? 'light' : 'dark')}
                activeOpacity={0.7}
              >
                <Text style={styles.themeLabel}>{isDark ? '밤바다' : '바다'}</Text>
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
            <SettingsRow
              label="홈화면 구성"
              onPress={() => (navigation as any).navigate('SettingsHomeWidgets')}
            />
          </SettingsCard>
        </View>

        {/* 오프라인 큐 (조건부 인라인 카드) */}
        {pendingCount > 0 && (
          <View style={styles.section}>
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


        {/* 후원 (인라인) */}
        <View style={styles.section}>
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
        </View>

        {/* 개발자 모드 */}
        <View style={styles.section}>
          <Text style={styles.devSectionLabel}>개발자 모드</Text>
          <SettingsCard>
            <SettingsRow
              label="동기화 진단"
              onPress={() => (navigation as any).navigate('SettingsSyncDiagnostics')}
            />
            <SettingsRow
              label="AI 태그 재분석"
              onPress={() => (navigation as any).navigate('SettingsAiTag')}
            />
          </SettingsCard>
        </View>

        {/* 앱 정보 (인라인) */}
        <View style={[styles.section, { marginBottom: SPACING.xxl }]}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
