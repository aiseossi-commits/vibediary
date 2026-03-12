import React, { useState, useMemo } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import { createChild } from '../db/childrenDao';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  type AppColors,
} from '../constants/theme';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: SPACING.xl * 2,
    },
    title: {
      fontSize: 26, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary,
      textAlign: 'center', marginBottom: SPACING.sm,
    },
    subtitle: {
      fontSize: FONT_SIZE.md, color: colors.textSecondary,
      textAlign: 'center', lineHeight: FONT_SIZE.md * 1.6, marginBottom: SPACING.xxl,
    },
    input: {
      width: '100%', fontSize: FONT_SIZE.lg, color: colors.textPrimary,
      borderBottomWidth: 2, borderBottomColor: colors.secondary,
      paddingVertical: SPACING.md, textAlign: 'center',
      marginBottom: SPACING.xl,
    },
    button: {
      width: '100%', backgroundColor: colors.primary,
      paddingVertical: SPACING.md + 2, borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.4 },
    buttonText: {
      fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold,
      color: colors.textOnPrimary,
    },
    hint: {
      fontSize: FONT_SIZE.xs, color: colors.textTertiary,
      textAlign: 'center', marginTop: SPACING.md,
    },
  });
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { setActiveChild, refreshChildren } = useChild();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    try {
      const child = await createChild(trimmed);
      await refreshChildren();
      setActiveChild(child.id);
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Text style={styles.title}>{"바다의 이름을\n지어주세요"}</Text>
        <Text style={styles.subtitle}>
          누구의 이야기를 기록할까요?{'\n'}
          아이 이름, 나의 별명 등{'\n'}
          자유롭게 지어주세요
        </Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="예: 지원이, 나의 바다"
          placeholderTextColor={colors.textTertiary}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />
        <TouchableOpacity
          style={[styles.button, (!name.trim() || isSaving) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || isSaving}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{isSaving ? '만드는 중...' : '시작하기'}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>설정에서 언제든 추가하거나 변경할 수 있어요</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
