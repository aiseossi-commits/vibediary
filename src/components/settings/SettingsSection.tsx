import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, type AppColors } from '../../constants/theme';

interface Props {
  title?: string;       // 섹션 제목 (생략 시 헤더 없음)
  description?: string; // 제목 아래 보조 설명
  children: React.ReactNode;
}

export default function SettingsSection({ title, description, children }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    section: {
      marginTop: SPACING.lg,
      paddingHorizontal: SPACING.md,
    },
    title: {
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.textPrimary,
      marginBottom: SPACING.sm,
    },
    description: {
      fontSize: FONT_SIZE.sm,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: SPACING.sm,
    },
  });
}
