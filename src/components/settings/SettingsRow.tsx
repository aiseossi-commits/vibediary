import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, type AppColors } from '../../constants/theme';

interface Props {
  label: string;
  hint?: string;            // 우측 부가 텍스트 (예: "3개 활성")
  onPress?: () => void;
  showChevron?: boolean;    // 기본 true (탭 가능 행)
  destructive?: boolean;    // 빨간 라벨 (삭제 등)
  rightSlot?: React.ReactNode;  // chevron 대신 Switch 등을 넣고 싶을 때
  disabled?: boolean;
}

export default function SettingsRow({
  label,
  hint,
  onPress,
  showChevron = true,
  destructive = false,
  rightSlot,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const labelColor = destructive ? colors.error : colors.textPrimary;

  const content = (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.right}>
        {hint ? <Text style={styles.hint} numberOfLines={1}>{hint}</Text> : null}
        {rightSlot ?? (showChevron && onPress ? <Text style={styles.chevron}>›</Text> : null)}
      </View>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
      minHeight: 48,
    },
    rowDisabled: { opacity: 0.4 },
    label: {
      flex: 1,
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.regular,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
    },
    hint: {
      fontSize: FONT_SIZE.sm,
      color: colors.textTertiary,
    },
    chevron: {
      fontSize: FONT_SIZE.lg,
      color: colors.textTertiary,
      lineHeight: FONT_SIZE.lg + 2,
    },
  });
}
