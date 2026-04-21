import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { useAuth } from '../context/AuthContext';
import { uploadPhoto, savePhotoRecord, analyzePhotoTags } from '../services/photoService';
import { setTagsForRecord } from '../db/tagsDao';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';

interface Props {
  visible: boolean;
  photoUri: string;
  photoBase64?: string;
  onClose: () => void;
  onNavigateToRecording: (photoUrl: string) => void;
  onSaved: () => void;
}

export default function PhotoActionModal({
  visible, photoUri, photoBase64, onClose, onNavigateToRecording, onSaved,
}: Props) {
  const { colors } = useTheme();
  const { activeChild } = useChild();
  const { userId } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const handleSpeak = async () => {
    if (!userId) { Alert.alert('오류', '인증이 필요합니다'); return; }
    setLoading(true);
    setLoadingMsg('업로드 중...');
    try {
      const tempId = Math.random().toString(36).slice(2);
      const photoUrl = await uploadPhoto(photoUri, userId, `speak-${tempId}`, photoBase64);
      onClose();
      onNavigateToRecording(photoUrl);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '업로드에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoTag = async () => {
    if (!userId) { Alert.alert('오류', '인증이 필요합니다'); return; }
    if (!photoBase64) {
      Alert.alert('오류', 'AI 태깅을 위해 사진 데이터가 필요합니다');
      return;
    }
    setLoading(true);
    setLoadingMsg('AI 분석 중...');
    try {
      const tempId = Math.random().toString(36).slice(2);
      const [photoUrl, tags] = await Promise.all([
        uploadPhoto(photoUri, userId, `ai-${tempId}`, photoBase64),
        analyzePhotoTags({ base64: photoBase64, childId: activeChild?.id }),
      ]);
      const recordId = await savePhotoRecord({ photoUrl, childId: activeChild?.id ?? null });
      if (tags.length > 0) {
        await setTagsForRecord(recordId, tags, activeChild?.id);
      }
      Alert.alert('저장 완료', tags.length > 0 ? `태그: ${tags.join(' ')}` : '사진이 저장됐어요');
      onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'LIMIT_EXCEEDED') {
        Alert.alert('AI 사용 한도 초과', '이번 달 AI 사용 횟수를 모두 사용했어요.\n그냥 저장으로 대체합니다.');
        handleSaveOnly();
        return;
      }
      Alert.alert('오류', msg || 'AI 태깅에 실패했습니다');
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
      Alert.alert('', '사진이 저장됐어요');
      onSaved();
      onClose();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>{loadingMsg}</Text>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.btn} onPress={handleSpeak}>
                <Text style={styles.btnIcon}>🎙️</Text>
                <Text style={styles.btnText}>말하기</Text>
                <Text style={styles.btnSub}>음성으로 기록 추가</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.btn} onPress={handleAutoTag}>
                <Text style={styles.btnIcon}>✨</Text>
                <Text style={styles.btnText}>AI 자동 태깅</Text>
                <Text style={styles.btnSub}>AI가 태그를 분석해요</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.btn} onPress={handleSaveOnly}>
                <Text style={styles.btnIcon}>💾</Text>
                <Text style={styles.btnText}>그냥 저장</Text>
                <Text style={styles.btnSub}>사진만 저장</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
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
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: SPACING.md, gap: SPACING.md,
    },
    btnIcon: { fontSize: 22, width: 32, textAlign: 'center' },
    btnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, flex: 1 },
    btnSub: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    divider: { height: 1, backgroundColor: colors.divider, marginVertical: SPACING.xs },
    loadingRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
      justifyContent: 'center', paddingVertical: SPACING.xl,
    },
    loadingText: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    cancelBtn: {
      marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
      paddingVertical: SPACING.md, alignItems: 'center',
      borderTopWidth: 1, borderTopColor: colors.divider,
    },
    cancelText: { fontSize: FONT_SIZE.md, color: colors.textTertiary },
  });
}
