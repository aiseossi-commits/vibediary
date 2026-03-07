import React, { useState, useMemo } from 'react';
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
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface Props {
  text: string;
  onConfirm: (editedText: string) => void;
  onReRecord: () => void;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    backButton: { flex: 1 },
    backText: { fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
    title: {
      flex: 2,
      textAlign: 'center',
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.textPrimary,
    },
    headerRight: { flex: 1 },
    inputContainer: {
      flex: 1,
      margin: SPACING.md,
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.md,
    },
    textInput: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, lineHeight: 24 },
    footer: { padding: SPACING.md, paddingBottom: SPACING.lg },
    confirmButton: {
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.lg,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    confirmButtonDisabled: { backgroundColor: colors.border },
    confirmButtonText: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.textOnPrimary,
    },
    confirmButtonTextDisabled: { color: colors.textTertiary },
  });
}

export default function STTReviewScreen({ text, onConfirm, onReRecord }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [editedText, setEditedText] = useState(text);
  const canConfirm = editedText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onReRecord} style={styles.backButton}>
            <Text style={styles.backText}>{'< 다시 녹음'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>녹음 확인</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={editedText}
            onChangeText={setEditedText}
            multiline
            autoFocus
            placeholder="음성이 인식되지 않았습니다. 직접 입력해 주세요."
            placeholderTextColor={colors.textTertiary}
            textAlignVertical="top"
          />
        </View>

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
