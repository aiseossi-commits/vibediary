import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform,
  Animated, ActivityIndicator, Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getPendingQueueCount, processOfflineQueue } from '../services/offlineQueue';
import { generateEmbedding, buildEmbeddingText } from '../services/aiProcessor';
import { getAllRecordsForReindex, updateRecord } from '../db/recordsDao';
import {
  isDatabaseReady, createChild, updateChild, deleteChild,
  getOrphanedRecordsCount, reassignOrphanedRecords, reassignChildRecords,
} from '../db';
import { exportBackup, pickAndParseBackup, restoreOverwrite, restoreMerge } from '../services/backupService';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOW, PALETTES, type AppColors, type PaletteKey } from '../constants/theme';

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
    // 후원
    donationBanner: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    accountText: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium },
    copyButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: colors.surfaceSecondary, borderRadius: BORDER_RADIUS.sm },
    copyButtonText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
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
    // 팔레트 선택
    paletteCard: {
      backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md, marginTop: SPACING.sm, ...SHADOW.sm,
    },
    paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
    paletteItem: { alignItems: 'center', gap: 4 },
    paletteCircle: { width: 36, height: 36, borderRadius: 18 },
    paletteCircleSelected: { width: 36, height: 36, borderRadius: 18, borderWidth: 2.5, borderColor: colors.textPrimary },
    paletteName: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, textAlign: 'center', maxWidth: 56 },
    paletteNameSelected: { fontSize: FONT_SIZE.xs, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium, textAlign: 'center', maxWidth: 56 },
  });
}

export default function SettingsScreen() {
  const { colors, isDark, palette, setTheme, setPalette } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children: childList, activeChild, setActiveChild, refreshChildren } = useChild();
  const navigation = useNavigation();
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);

  // 백업/복원 상태
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);

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
    } catch {
      // 카운트 조회 실패 — UI에 0 표시 유지
    }
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

  const handleReindex = useCallback(() => {
    Alert.alert(
      '검색 재색인',
      '모든 기록의 검색 데이터를 새로 생성합니다.\nAI 서버 호출이 기록 수만큼 발생합니다. 계속할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '재색인',
          onPress: async () => {
            setIsReindexing(true);
            try {
              const records = await getAllRecordsForReindex();
              let success = 0;
              for (const record of records) {
                try {
                  const text = buildEmbeddingText(record.raw_text, record.summary);
                  const embedding = await generateEmbedding(text);
                  await updateRecord(record.id, { embedding });
                  success++;
                } catch {
                  // 개별 실패 시 계속 진행
                }
              }
              Alert.alert('완료', `${success}/${records.length}건 재색인 완료`);
            } catch {
              Alert.alert('오류', '재색인 중 문제가 발생했습니다.');
            } finally {
              setIsReindexing(false);
            }
          },
        },
      ]
    );
  }, []);

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

        {/* 데이터 백업/복원 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 백업/복원</Text>
          <View style={styles.card}>
            <Text style={styles.cardDescription}>
              폰 교체 시: 내보내기 → 카카오톡 "나에게 보내기" 전송{'\n'}
              새 폰에서: 카카오톡 파일 탭 → "다른 앱으로 열기" → 바다
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
            <TouchableOpacity
              style={[styles.processButton, { marginTop: SPACING.sm }]}
              onPress={handleReindex}
              disabled={isReindexing}
            >
              <Text style={styles.processButtonText}>
                {isReindexing ? '재색인 중...' : '검색 재색인'}
              </Text>
            </TouchableOpacity>
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
          <View style={styles.paletteCard}>
            <Text style={styles.cardTitle}>색상 테마</Text>
            <View style={styles.paletteRow}>
              {(Object.keys(PALETTES) as PaletteKey[]).map((key) => {
                const entry = PALETTES[key];
                const primaryColor = isDark ? entry.dark.primary : entry.light.primary;
                const isSelected = palette === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.paletteItem}
                    onPress={() => setPalette(key)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${entry.name} 테마 선택`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[
                      isSelected ? styles.paletteCircleSelected : styles.paletteCircle,
                      { backgroundColor: primaryColor },
                    ]} />
                    <Text style={isSelected ? styles.paletteNameSelected : styles.paletteName}>
                      {entry.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
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


        {/* 후원 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>후원</Text>
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

        {/* 앱 정보 */}
        <View style={[styles.section, { marginBottom: SPACING.xxl }]}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
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
