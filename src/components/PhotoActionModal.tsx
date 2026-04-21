import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert, Image, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { useAuth } from '../context/AuthContext';
import { uploadPhoto, savePhotoRecord } from '../services/photoService';
import { processTextRecord } from '../services/recordPipeline';
import { updateRecordPhoto } from '../db/recordsDao';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';

interface Props {
  visible: boolean;
  photoUri: string;
  photoBase64?: string;
  onClose: () => void;
  onSaved: () => void;
}

type ModalView = 'menu' | 'text';

export default function PhotoActionModal({
  visible, photoUri, photoBase64, onClose, onSaved,
}: Props) {
  const { colors } = useTheme();
  const { activeChild } = useChild();
  const { userId } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [view, setView] = useState<ModalView>('menu');
  const [inputText, setInputText] = useState('');

  const resetAndClose = () => {
    setView('menu');
    setInputText('');
    onClose();
  };

  const handleTextRecord = async () => {
    if (!userId) { Alert.alert('오류', '인증이 필요합니다'); return; }
    if (!inputText.trim()) { Alert.alert('', '텍스트를 입력해 주세요'); return; }
    setLoading(true);
    setLoadingMsg('저장 중...');
    try {
      const tempId = Math.random().toString(36).slice(2);
      const [photoUrl, recordId] = await Promise.all([
        uploadPhoto(photoUri, userId, `text-${tempId}`, photoBase64),
        processTextRecord(inputText.trim(), activeChild?.id),
      ]);
      await updateRecordPhoto(recordId, photoUrl);
      onSaved();
      resetAndClose();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!userId) { Alert.alert('오류', '인증이 필요합니다'); return; }
    setLoading(true);
    setLoadingMsg('저장 중...');
    try {
      const tempId = Math.random().toString(36).slice(2);
      const photoUrl = await uploadPhoto(photoUri, userId, `save-${tempId}`, photoBase64);
      await savePhotoRecord({ photoUrl, childId: activeChild?.id ?? null });
      onSaved();
      resetAndClose();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>{loadingMsg}</Text>
            </View>
          ) : view === 'menu' ? (
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.btn} onPress={() => setView('text')}>
                <Text style={styles.btnText}>텍스트 기록</Text>
                <Text style={styles.btnSub}>직접 입력 후 AI 분석</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.btn} onPress={handleSaveOnly}>
                <Text style={styles.btnText}>그냥 저장</Text>
                <Text style={styles.btnSub}>태깅 없이 사진만 저장</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.textInputArea}>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.divider }]}
                placeholder="오늘 있었던 일을 적어보세요"
                placeholderTextColor={colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                autoFocus
              />
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleTextRecord}
              >
                <Text style={styles.submitText}>저장</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={view === 'text' ? () => { setView('menu'); setInputText(''); } : resetAndClose}
            disabled={loading}
          >
            <Text style={styles.cancelText}>{view === 'text' ? '뒤로' : '취소'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
      paddingBottom: SPACING.xxl,
    },
    preview: {
      width: '100%', height: 220,
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
    },
    buttonGroup: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
    btn: {
      paddingVertical: SPACING.md,
    },
    btnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary },
    btnSub: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.divider, marginVertical: SPACING.xs },
    loadingRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
      justifyContent: 'center', paddingVertical: SPACING.xl,
    },
    loadingText: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    textInputArea: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.sm },
    textInput: {
      borderWidth: 1, borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md, fontSize: FONT_SIZE.md,
      minHeight: 100, textAlignVertical: 'top',
    },
    submitBtn: {
      borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center',
    },
    submitText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: '#fff' },
    cancelBtn: {
      marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
      paddingVertical: SPACING.md, alignItems: 'center',
      borderTopWidth: 1, borderTopColor: colors.divider,
    },
    cancelText: { fontSize: FONT_SIZE.md, color: colors.textTertiary },
  });
}
