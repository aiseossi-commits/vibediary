import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
  type AppColors,
} from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { RecordWithTags } from '../types/record';
import TagChip from './TagChip';

interface RecordCardProps {
  record: RecordWithTags;
  onPress: () => void;
}

function getAgeOpacity(timestamp: number): number {
  const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  if (ageDays < 1) return 1;
  if (ageDays < 4) return 0.85;
  if (ageDays < 8) return 0.7;
  if (ageDays < 15) return 0.6;
  return 0.5;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const time = date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `오늘 ${time}`;
  if (isYesterday) return `어제 ${time}`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일 ${time}`;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      marginHorizontal: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    dateText: {
      fontSize: 11,
      color: colors.textTertiary,
      fontWeight: '400' as const,
      letterSpacing: 0.2,
    },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      backgroundColor: colors.accentLight,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.full,
    },
    pendingText: {
      fontSize: FONT_SIZE.xs,
      color: colors.accent,
      fontWeight: FONT_WEIGHT.medium,
    },
    summary: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '400' as const,
      lineHeight: 24,
      marginBottom: 10,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
  });
}

function RecordCard({ record, onPress }: RecordCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, SHADOW.sm, { opacity: getAgeOpacity(record.createdAt) }]}
    >
      <View style={styles.header}>
        <Text style={styles.dateText}>{formatDateTime(record.createdAt)}</Text>
        {record.aiPending && (
          <View style={styles.pendingBadge}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.pendingText}>AI 처리 중</Text>
          </View>
        )}
      </View>

      <Text style={styles.summary} numberOfLines={3}>
        {record.summary}
      </Text>

      {record.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {record.tags.map((tag) => (
            <TagChip key={tag.id} name={tag.name} size="sm" />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default React.memo(RecordCard);
