import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useChild } from '../../context/ChildContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../../constants/theme';
import {
  isDatabaseReady, createChild, updateChild, deleteChild,
  getOrphanedRecordsCount, reassignOrphanedRecords, reassignChildRecords,
} from '../../db';
import { SettingsSection } from '../../components/settings';

export default function SettingsChildrenScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children: childList, activeChild, setActiveChild, refreshChildren } = useChild();
  const navigation = useNavigation();

  const [orphanedCount, setOrphanedCount] = useState(0);

  // 이름 입력 모달 상태
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameModalTitle, setNameModalTitle] = useState('');
  const [nameInputValue, setNameInputValue] = useState('');
  const [nameModalOnConfirm, setNameModalOnConfirm] = useState<(name: string) => void>(() => () => {});

  // 삭제 모달 상태
  const [deleteModalChild, setDeleteModalChild] = useState<{ id: string; name: string } | null>(null);
  const [deleteModalOthers, setDeleteModalOthers] = useState<{ id: string; name: string }[]>([]);

  const loadCounts = useCallback(async () => {
    if (!isDatabaseReady()) return;
    try {
      setOrphanedCount(await getOrphanedRecordsCount());
    } catch {}
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);

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
      { text: '이 바다로 전환', onPress: () => setActiveChild(child.id) },
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
          setDeleteModalChild(child);
          setDeleteModalOthers(childList.filter(c => c.id !== child.id));
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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

      {/* 바다 삭제 모달 */}
      <Modal
        visible={deleteModalChild !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalChild(null)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalTitle}>{deleteModalChild?.name} 삭제</Text>
            <Text style={styles.deleteModalDesc}>
              {deleteModalOthers.length > 0
                ? '기록을 다른 바다로 이동하거나, 기록을 포함하여 삭제할 수 있습니다.'
                : '기존 기록은 앱에서 더 이상 볼 수 없게 됩니다.'}
            </Text>
            {deleteModalOthers.map(target => (
              <TouchableOpacity
                key={target.id}
                style={styles.deleteModalBtn}
                onPress={async () => {
                  if (!deleteModalChild) return;
                  setDeleteModalChild(null);
                  await reassignChildRecords(deleteModalChild.id, target.id);
                  await deleteChild(deleteModalChild.id);
                  if (activeChild?.id === deleteModalChild.id) setActiveChild(target.id);
                  await refreshChildren();
                  await loadCounts();
                  navigation.goBack();
                }}
              >
                <Text style={styles.deleteModalBtnText}>"{target.name}"으로 기록 이동 후 삭제</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.deleteModalBtnDestructive}
              onPress={async () => {
                if (!deleteModalChild) return;
                setDeleteModalChild(null);
                await deleteChild(deleteModalChild.id);
                if (activeChild?.id === deleteModalChild.id) setActiveChild(deleteModalOthers[0]?.id ?? null);
                await refreshChildren();
                await loadCounts();
                navigation.goBack();
              }}
            >
              <Text style={styles.deleteModalBtnTextDestructive}>기록 포함 삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteModalBtnCancel} onPress={() => setDeleteModalChild(null)}>
              <Text style={styles.deleteModalBtnTextCancel}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SettingsSection title="나의 바다">
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
        </SettingsSection>

        {orphanedCount > 0 && (
          <SettingsSection title="정리">
            <View style={styles.card}>
              <Text style={styles.cardTitle}>바다 없는 기록 {orphanedCount}개</Text>
              <Text style={styles.cardDescription}>
                특정 바다에 속하지 않은 기록입니다. 활성 바다("{activeChild?.name ?? '없음'}")로 이동시킬 수 있어요.
              </Text>
              <TouchableOpacity
                style={styles.processButton}
                disabled={!activeChild}
                onPress={() => {
                  if (!activeChild) return;
                  Alert.alert(
                    '바다 없는 기록 이동',
                    `${orphanedCount}개의 기록을 "${activeChild.name}"의 바다로 이동할까요?`,
                    [
                      { text: '취소', style: 'cancel' },
                      {
                        text: '이동',
                        onPress: async () => {
                          try {
                            await reassignOrphanedRecords(activeChild.id);
                            await loadCounts();
                            Alert.alert('완료', `${orphanedCount}개의 기록을 "${activeChild.name}"로 이동했습니다.`);
                          } catch {
                            Alert.alert('오류', '이동 중 문제가 발생했습니다.');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.processButtonText}>활성 바다로 이동</Text>
              </TouchableOpacity>
            </View>
          </SettingsSection>
        )}
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
    childRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
    childActive: { fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.semibold },
    childName: { fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium },
    addChildButton: { paddingVertical: SPACING.sm, alignItems: 'center', marginTop: SPACING.xs },
    addChildText: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
    processButton: { marginTop: SPACING.md, backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.sm, paddingVertical: SPACING.sm, alignItems: 'center' },
    processButtonText: { color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium, fontSize: FONT_SIZE.sm },
    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, width: '85%', maxWidth: 400 },
    modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.md },
    modalInput: { backgroundColor: colors.surfaceSecondary, borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, fontSize: FONT_SIZE.md, color: colors.textPrimary, marginBottom: SPACING.lg },
    modalButtons: { flexDirection: 'row', gap: SPACING.sm },
    modalCancel: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary },
    modalConfirm: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primary },
    modalCancelText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    modalConfirmText: { fontSize: FONT_SIZE.sm, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium },
    deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    deleteModalBox: { backgroundColor: colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl },
    deleteModalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.xs },
    deleteModalDesc: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginBottom: SPACING.lg, lineHeight: 20 },
    deleteModalBtn: { paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', marginBottom: SPACING.sm, backgroundColor: colors.surfaceSecondary },
    deleteModalBtnDestructive: { paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', marginBottom: SPACING.sm, backgroundColor: colors.error + '18' },
    deleteModalBtnCancel: { paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', marginTop: SPACING.xs, backgroundColor: colors.surfaceSecondary },
    deleteModalBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
    deleteModalBtnTextDestructive: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.error },
    deleteModalBtnTextCancel: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
  });
}
