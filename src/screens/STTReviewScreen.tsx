import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/theme';

interface Props {
  text: string;
  onConfirm: (editedText: string) => void;
  onReRecord: () => void;
}

export default function STTReviewScreen({ text, onConfirm, onReRecord }: Props) {
  const [editedText, setEditedText] = useState(text);
  const canConfirm = editedText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onReRecord} style={styles.backButton}>
            <Text style={styles.backText}>{'< 다시 녹음'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>녹음 확인</Text>
          <View style={styles.headerRight} />
        </View>

        {/* 텍스트 입력 영역 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={editedText}
            onChangeText={setEditedText}
            multiline
            autoFocus
            placeholder="음성이 인식되지 않았습니다. 직접 입력해 주세요."
            placeholderTextColor={COLORS.textTertiary}
            textAlignVertical="top"
          />
        </View>

        {/* 확인 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
            onPress={() => canConfirm && onConfirm(editedText.trim())}
            disabled={!canConfirm}
          >
            <Text style={[styles.confirmButtonText, !canConfirm && styles.confirmButtonTextDisabled]}>
              확인
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    flex: 1,
  },
  backText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  title: {
    flex: 2,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  headerRight: { flex: 1 },
  inputContainer: {
    flex: 1,
    margin: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  footer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  confirmButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textOnPrimary,
  },
  confirmButtonTextDisabled: {
    color: COLORS.textTertiary,
  },
});
