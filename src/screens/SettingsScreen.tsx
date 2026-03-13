import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform,
  Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getPendingQueueCount, processOfflineQueue } from '../services/offlineQueue';
import {
  isDatabaseReady, createChild, updateChild, deleteChild,
  getOrphanedRecordsCount, reassignOrphanedRecords, reassignChildRecords,
} from '../db';
import { seedDemoData } from '../db/seedData';
import {
  loadAlarms, toggleAlarm, updateAlarm, addAlarm, deleteAlarm,
  requestNotificationPermission, type AlarmSetting,
} from '../services/alarmService';
import { exportBackup, pickAndParseBackup, restoreOverwrite, restoreMerge } from '../services/backupService';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOW, type AppColors } from '../constants/theme';

function AlarmToggle({ enabled, onToggle, colors, styles }: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const anim = useRef(new Animated.Value(enabled ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: enabled ? 1 : 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [enabled, anim]);
  return (
    <TouchableOpacity onPress={() => onToggle(!enabled)} activeOpacity={0.8}>
      <Animated.View style={[styles.toggleTrack, {
        backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#CBD5E1', colors.primary] }),
      }]}>
        <Animated.View style={[styles.toggleThumb, {
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
        }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    section: { marginTop: SPACING.md, paddingHorizontal: SPACING.md },
    sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.sm },
    card: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
    cardTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.xs },
    cardDescription: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 22 },
    processButton: { marginTop: SPACING.md, backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.sm, paddingVertical: SPACING.sm, alignItems: 'center' },
    processButtonText: { color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium, fontSize: FONT_SIZE.sm },
    appName: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.primary, marginBottom: SPACING.xs },
    slogan: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontStyle: 'italic', marginBottom: SPACING.xs },
    version: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    // 아이 관리
    childRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
    childName: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary },
    childActive: { fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium, marginRight: SPACING.sm },
    addChildButton: { marginTop: SPACING.sm, paddingVertical: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.sm, borderStyle: 'dashed' },
    addChildText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    // 이름 입력 모달
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, width: '80%' },
    modalTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.md },
    modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONT_SIZE.md, color: colors.textPrimary, marginBottom: SPACING.md },
    modalButtons: { flexDirection: 'row', gap: SPACING.sm },
    modalCancel: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary },
    modalConfirm: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primary },
    modalCancelText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    modalConfirmText: { fontSize: FONT_SIZE.sm, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium },
    // 알람
    alarmRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    alarmInfo: { flex: 1 },
    alarmLabel: { fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium },
    alarmTime: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginTop: 2 },
    alarmMessage: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, marginTop: 2 },
    alarmActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    alarmEditBtn: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
    alarmEditText: { fontSize: FONT_SIZE.sm, color: colors.primary },
    alarmDeleteBtn: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
    alarmDeleteText: { fontSize: FONT_SIZE.sm, color: colors.error ?? '#EF4444' },
    addAlarmButton: { marginTop: SPACING.sm, paddingVertical: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.sm, borderStyle: 'dashed' },
    addAlarmText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    // 백업/복원
    backupRow: { flexDirection: 'row', gap: SPACING.sm },
    backupButton: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary },
    backupButtonPrimary: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primary },
    backupButtonText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
    backupButtonTextPrimary: { fontSize: FONT_SIZE.sm, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium },
    // 테마 토글
    themeToggleRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
      ...SHADOW.sm,
    },
    themeToggleLabel: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
    toggleTrack: {
      width: 51, height: 31, borderRadius: 16,
      justifyContent: 'center', paddingHorizontal: 2,
    },
    toggleThumb: {
      width: 27, height: 27, borderRadius: 14,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
    },
  });
}

export default function SettingsScreen() {
  const { colors, isDark, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children: childList, activeChild, setActiveChild, refreshChildren } = useChild();
  const navigation = useNavigation();
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);

  // 알람 상태
  const [alarms, setAlarms] = useState<AlarmSetting[]>([]);
  const [alarmModalVisible, setAlarmModalVisible] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<AlarmSetting | null>(null);
  const [alarmLabelInput, setAlarmLabelInput] = useState('');
  const [alarmMessageInput, setAlarmMessageInput] = useState('');
  const [alarmHourInput, setAlarmHourInput] = useState('');
  const [alarmMinuteInput, setAlarmMinuteInput] = useState('');

  useEffect(() => { loadAlarms().then(setAlarms); }, []);

  const handleToggleAlarm = useCallback(async (alarmId: string, enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('알림 권한 필요', '설정 앱에서 알림 권한을 허용해주세요.');
        return;
      }
    }
    const updated = await toggleAlarm(alarmId, enabled);
    setAlarms(updated);
  }, []);

  const openAlarmModal = useCallback((alarm?: AlarmSetting) => {
    if (alarm) {
      setEditingAlarm(alarm);
      setAlarmLabelInput(alarm.label);
      setAlarmMessageInput(alarm.message);
      setAlarmHourInput(String(alarm.hour));
      setAlarmMinuteInput(String(alarm.minute).padStart(2, '0'));
    } else {
      setEditingAlarm(null);
      setAlarmLabelInput('');
      setAlarmMessageInput('');
      setAlarmHourInput('9');
      setAlarmMinuteInput('00');
    }
    setAlarmModalVisible(true);
  }, []);

  const handleSaveAlarm = useCallback(async () => {
    const hour = parseInt(alarmHourInput, 10);
    const minute = parseInt(alarmMinuteInput, 10);
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert('올바른 시간을 입력해주세요', '시: 0-23, 분: 0-59');
      return;
    }
    const label = alarmLabelInput.trim() || '알람';
    const message = alarmMessageInput.trim() || '기록할 시간이에요!';
    let updated: AlarmSetting[];
    if (editingAlarm) {
      updated = await updateAlarm(editingAlarm.id, hour, minute, message, label);
    } else {
      updated = await addAlarm(hour, minute, message, label);
    }
    setAlarms(updated);
    setAlarmModalVisible(false);
  }, [editingAlarm, alarmLabelInput, alarmMessageInput, alarmHourInput, alarmMinuteInput]);

  const handleDeleteAlarm = useCallback((alarm: AlarmSetting) => {
    Alert.alert('알람 삭제', `"${alarm.label}" 알람을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const updated = await deleteAlarm(alarm.id);
          setAlarms(updated);
        },
      },
    ]);
  }, []);

  // 백업/복원 상태
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleExport = useCallback(async () => {
    setIsBackingUp(true);
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('오류', '백업 내보내기 중 문제가 발생했습니다.');
    } finally {
      setIsBackingUp(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    let data;
    try {
      data = await pickAndParseBackup();
    } catch (e: any) {
      if (e?.message === 'CANCELED') return;
      Alert.alert('오류', '유효하지 않은 백업 파일입니다.');
      return;
    }

    Alert.alert(
      '복원 방식 선택',
      '기존 데이터를 어떻게 처리할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '병합 (기존 유지 + 신규 추가)',
          onPress: async () => {
            setIsRestoring(true);
            try {
              await restoreMerge(data);
              await refreshChildren();
              await loadCounts();
              Alert.alert('완료', '병합 복원이 완료되었습니다.');
            } catch {
              Alert.alert('오류', '복원 중 문제가 발생했습니다.');
            } finally {
              setIsRestoring(false);
            }
          },
        },
        {
          text: '덮어쓰기 (전체 교체)',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '주의',
              '기존 데이터가 모두 삭제됩니다. 계속하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '덮어쓰기',
                  style: 'destructive',
                  onPress: async () => {
                    setIsRestoring(true);
                    try {
                      await restoreOverwrite(data);
                      await refreshChildren();
                      await loadCounts();
                      Alert.alert('완료', '덮어쓰기 복원이 완료되었습니다.');
                    } catch {
                      Alert.alert('오류', '복원 중 문제가 발생했습니다.');
                    } finally {
                      setIsRestoring(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [refreshChildren]);

  const toggleAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [isDark, toggleAnim]);

  // 이름 입력 모달 상태
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameModalTitle, setNameModalTitle] = useState('');
  const [nameInputValue, setNameInputValue] = useState('');
  const [nameModalOnConfirm, setNameModalOnConfirm] = useState<(name: string) => void>(() => () => {});

  useEffect(() => { loadCounts(); }, []);

  const loadCounts = async () => {
    if (!isDatabaseReady()) return;
    try {
      const [pending, orphaned] = await Promise.all([
        getPendingQueueCount(),
        getOrphanedRecordsCount(),
      ]);
      setPendingCount(pending);
      setOrphanedCount(orphaned);
    } catch {}
  };

  const openNameModal = (title: string, initialValue: string, onConfirm: (name: string) => void) => {
    setNameModalTitle(title);
    setNameInputValue(initialValue);
    setNameModalOnConfirm(() => onConfirm);
    setNameModalVisible(true);
  };

  const handleAddChild = () => {
    openNameModal('바다 등록', '', async (name) => {
      const child = await createChild(name);
      await refreshChildren();
      setActiveChild(child.id);
    });
  };

  const handleChildPress = (child: { id: string; name: string }) => {
    Alert.alert(child.name, '선택하세요', [
      {
        text: '이 바다로 전환',
        onPress: () => setActiveChild(child.id),
      },
      {
        text: '이름 수정',
        onPress: () => openNameModal('이름 수정', child.name, async (name) => {
          await updateChild(child.id, name);
          await refreshChildren();
        }),
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          const otherChildren = childList.filter(c => c.id !== child.id);
          if (otherChildren.length > 0) {
            // 다른 바다가 있으면 기록 이동 옵션 제공
            const moveOptions = otherChildren.map(target => ({
              text: `"${target.name}"으로 기록 이동 후 삭제`,
              onPress: async () => {
                await reassignChildRecords(child.id, target.id);
                await deleteChild(child.id);
                if (activeChild?.id === child.id) setActiveChild(target.id);
                await refreshChildren();
                await loadCounts();
                navigation.goBack();
              },
            }));
            Alert.alert(
              '바다 삭제',
              `${child.name}의 바다를 삭제할까요?\n기록을 다른 바다로 이동하거나, 그냥 삭제할 수 있습니다.`,
              [
                { text: '취소', style: 'cancel' },
                ...moveOptions,
                {
                  text: '기록 유지 없이 삭제',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteChild(child.id);
                    if (activeChild?.id === child.id) setActiveChild(null);
                    await refreshChildren();
                    await loadCounts();
                    navigation.goBack();
                  },
                },
              ]
            );
          } else {
            Alert.alert('바다 삭제', `${child.name}의 바다를 삭제할까요?\n기존 기록은 앱에서 더 이상 볼 수 없게 됩니다.`, [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제', style: 'destructive', onPress: async () => {
                  await deleteChild(child.id);
                  setActiveChild(null);
                  await refreshChildren();
                  await loadCounts();
                  navigation.goBack();
                },
              },
            ]);
          }
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleProcessQueue = async () => {
    setIsProcessing(true);
    try {
      const processed = await processOfflineQueue();
      Alert.alert('완료', `${processed}건의 기록이 AI 처리되었습니다.`);
      loadCounts();
    } catch {
      Alert.alert('오류', '처리 중 문제가 발생했습니다.');
    }
    setIsProcessing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 이름 입력 모달 */}
      <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{nameModalTitle}</Text>
            <TextInput
              style={styles.modalInput}
              value={nameInputValue}
              onChangeText={setNameInputValue}
              placeholder="이름 입력"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setNameModalVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={async () => {
                  const name = nameInputValue.trim();
                  if (!name) return;
                  setNameModalVisible(false);
                  await nameModalOnConfirm(name);
                }}
              >
                <Text style={styles.modalConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 알람 편집 모달 */}
      <Modal visible={alarmModalVisible} transparent animationType="fade" onRequestClose={() => setAlarmModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingAlarm ? '알람 수정' : '알람 추가'}</Text>
            <TextInput
              style={styles.modalInput}
              value={alarmLabelInput}
              onChangeText={setAlarmLabelInput}
              placeholder="알람 이름 (예: 점심 기록)"
              placeholderTextColor={colors.textTertiary}
            />
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                value={alarmHourInput}
                onChangeText={setAlarmHourInput}
                placeholder="시 (0-23)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                value={alarmMinuteInput}
                onChangeText={setAlarmMinuteInput}
                placeholder="분 (0-59)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <TextInput
              style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={alarmMessageInput}
              onChangeText={setAlarmMessageInput}
              placeholder="알림 문구"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAlarmModalVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveAlarm}>
                <Text style={styles.modalConfirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>설정</Text>
        </View>

        {/* 바다 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 바다</Text>
          <View style={styles.card}>
            {childList.map(child => (
              <TouchableOpacity key={child.id} style={styles.childRow} onPress={() => handleChildPress(child)}>
                {activeChild?.id === child.id && (
                  <Text style={styles.childActive}>✓ </Text>
                )}
                <Text style={styles.childName}>{child.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addChildButton} onPress={handleAddChild}>
              <Text style={styles.addChildText}>+ 바다 추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 알림 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <View style={styles.card}>
            {alarms.map((alarm) => (
              <View key={alarm.id} style={styles.alarmRow}>
                <View style={styles.alarmInfo}>
                  <Text style={styles.alarmLabel}>{alarm.label}</Text>
                  <Text style={styles.alarmTime}>
                    {String(alarm.hour).padStart(2, '0')}:{String(alarm.minute).padStart(2, '0')}
                  </Text>
                  <Text style={styles.alarmMessage}>{alarm.message}</Text>
                </View>
                <View style={styles.alarmActions}>
                  <TouchableOpacity style={styles.alarmEditBtn} onPress={() => openAlarmModal(alarm)}>
                    <Text style={styles.alarmEditText}>수정</Text>
                  </TouchableOpacity>
                  {alarm.id !== 'morning' && alarm.id !== 'night' && (
                    <TouchableOpacity style={styles.alarmDeleteBtn} onPress={() => handleDeleteAlarm(alarm)}>
                      <Text style={styles.alarmDeleteText}>삭제</Text>
                    </TouchableOpacity>
                  )}
                  <AlarmToggle enabled={alarm.enabled} onToggle={(v) => handleToggleAlarm(alarm.id, v)} colors={colors} styles={styles} />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addAlarmButton} onPress={() => openAlarmModal()}>
              <Text style={styles.addAlarmText}>+ 알람 추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 데이터 백업/복원 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 백업/복원</Text>
          <View style={styles.card}>
            <Text style={styles.cardDescription}>
              기록 데이터를 JSON 파일로 저장하거나, 파일에서 복원합니다.{'\n'}
              폰 교체 시 데이터 이전에 사용하세요.
            </Text>
            <View style={[styles.backupRow, { marginTop: SPACING.md }]}>
              <TouchableOpacity
                style={styles.backupButtonPrimary}
                onPress={handleExport}
                disabled={isBackingUp}
              >
                {isBackingUp
                  ? <ActivityIndicator size="small" color={colors.textOnPrimary} />
                  : <Text style={styles.backupButtonTextPrimary}>내보내기</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backupButton}
                onPress={handleImport}
                disabled={isRestoring}
              >
                {isRestoring
                  ? <ActivityIndicator size="small" color={colors.textSecondary} />
                  : <Text style={styles.backupButtonText}>가져오기</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 테마 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>화면 모드</Text>
          <TouchableOpacity
            style={styles.themeToggleRow}
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
                  inputRange: [0, 1],
                  outputRange: ['#CBD5E1', colors.primary],
                }),
              },
            ]}>
              <Animated.View style={[
                styles.toggleThumb,
                {
                  transform: [{
                    translateX: toggleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 20],
                    }),
                  }],
                },
              ]} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* AI 데이터 투명성 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 및 프라이버시</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI에 전송되는 데이터</Text>
            <Text style={styles.cardDescription}>
              • 음성 파일은 기기에만 저장되며 서버로 전송되지 않습니다{'\n'}
              • STT 변환된 텍스트만 AI(Google Gemini)에 전송됩니다{'\n'}
              • AI 서버에 데이터가 저장되지 않습니다{'\n'}
              • 모든 기록은 기기 내 로컬 DB에 보관됩니다
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

        {/* 미분류 기록 */}
        {orphanedCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>미분류 기록</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>바다 없는 기록 {orphanedCount}개</Text>
              <Text style={styles.cardDescription}>
                삭제된 바다에 속해 있던 기록입니다.{'\n'}
                아래 버튼을 눌러 현재 바다로 불러올 수 있어요.
              </Text>
              {activeChild && (
                <TouchableOpacity
                  style={styles.processButton}
                  onPress={() => {
                    Alert.alert(
                      '기록 불러오기',
                      `${orphanedCount}개의 기록을 "${activeChild.name}"의 바다로 이동할까요?`,
                      [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '이동',
                          onPress: async () => {
                            await reassignOrphanedRecords(activeChild.id);
                            await loadCounts();
                            Alert.alert('완료', `${orphanedCount}개의 기록을 "${activeChild.name}"로 이동했습니다.`);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.processButtonText}>"{activeChild.name}"으로 불러오기</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

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

        {/* 테스트 데이터 */}
        {activeChild && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>개발자 도구</Text>
            <View style={styles.card}>
              <Text style={styles.cardDescription}>10일치 샘플 데이터를 추가합니다.</Text>
              <TouchableOpacity
                style={styles.processButton}
                onPress={() => {
                  Alert.alert('샘플 데이터 추가', `"${activeChild.name}"에 10일치 데이터를 추가할까요?`, [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '추가',
                      onPress: async () => {
                        await seedDemoData(activeChild.id);
                        Alert.alert('완료', '10일치 샘플 데이터가 추가되었습니다.');
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.processButtonText}>샘플 데이터 추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 앱 정보 */}
        <View style={[styles.section, { marginBottom: SPACING.xxl }]}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.card}>
            <Text style={styles.appName}>바다 vibediary</Text>
            <Text style={styles.slogan}>기록에 치이지 말고, 그냥 말하세요</Text>
            <Text style={styles.version}>버전 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
