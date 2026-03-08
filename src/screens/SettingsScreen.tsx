import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPendingQueueCount, processOfflineQueue } from '../services/offlineQueue';
import { isDatabaseReady, createChild, updateChild, deleteChild } from '../db';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOW, type AppColors } from '../constants/theme';

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
    // 테마 선택
    themeRow: { flexDirection: 'row', gap: SPACING.sm },
    themeOption: { flex: 1, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    themeOptionActive: { borderColor: colors.primary },
    themePreview: { width: 48, height: 48, borderRadius: 24, marginBottom: SPACING.sm, alignItems: 'center', justifyContent: 'center' },
    themeLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
    themeSub: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, marginTop: 2 },
  });
}

export default function SettingsScreen() {
  const { colors, isDark, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children: childList, activeChild, setActiveChild, refreshChildren } = useChild();
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // 이름 입력 모달 상태
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameModalTitle, setNameModalTitle] = useState('');
  const [nameInputValue, setNameInputValue] = useState('');
  const [nameModalOnConfirm, setNameModalOnConfirm] = useState<(name: string) => void>(() => () => {});

  useEffect(() => { loadPendingCount(); }, []);

  const loadPendingCount = async () => {
    if (!isDatabaseReady()) return;
    try { const count = await getPendingQueueCount(); setPendingCount(count); }
    catch {}
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
          Alert.alert('바다 삭제', `${child.name}의 바다를 삭제할까요?\n기록은 삭제되지 않습니다.`, [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제', style: 'destructive', onPress: async () => {
                await deleteChild(child.id);
                if (activeChild?.id === child.id) setActiveChild(null);
                await refreshChildren();
              },
            },
          ]);
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
      loadPendingCount();
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

        {/* 테마 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>화면 모드</Text>
          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[styles.themeOption, { backgroundColor: '#F0F7FF' }, !isDark && styles.themeOptionActive]}
              onPress={() => setTheme('light')}
              activeOpacity={0.7}
            >
              <View style={[styles.themePreview, { backgroundColor: '#1A4A6B' }]}>
                <Text style={{ fontSize: 20 }}>🌊</Text>
              </View>
              <Text style={[styles.themeLabel, { color: '#1A2A3A' }]}>바다</Text>
              <Text style={[styles.themeSub, { color: '#4A6A8A' }]}>일반 모드</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeOption, { backgroundColor: '#0A2337' }, isDark && styles.themeOptionActive]}
              onPress={() => setTheme('dark')}
              activeOpacity={0.7}
            >
              <View style={[styles.themePreview, { backgroundColor: '#EAEAEA' }]}>
                <Text style={{ fontSize: 20 }}>🌙</Text>
              </View>
              <Text style={[styles.themeLabel, { color: '#EAEAEA' }]}>밤바다</Text>
              <Text style={[styles.themeSub, { color: '#5A8AA8' }]}>다크 모드</Text>
            </TouchableOpacity>
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
