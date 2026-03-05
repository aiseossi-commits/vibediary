import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '../constants/theme';
import type { RecordWithTags } from '../types/record';
import TagChip from './TagChip';

interface RecordCardProps {
  record: RecordWithTags;
  onPress: () => void;
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

function RecordCard({ record, onPress }: RecordCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, SHADOW.sm]}
    >
      {/* Header: date + AI pending */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{formatDateTime(record.createdAt)}</Text>
        {record.aiPending && (
          <View style={styles.pendingBadge}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.pendingText}>AI 처리 중</Text>
          </View>
        )}
      </View>

      {/* Summary */}
      <Text style={styles.summary} numberOfLines={3}>
        {record.summary}
      </Text>

      {/* Mood indicator */}
      {record.mood && (
        <Text style={styles.mood}>{record.mood}</Text>
      )}

      {/* Tags */}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm + 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHT.regular,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  pendingText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.accent,
    fontWeight: FONT_WEIGHT.medium,
  },
  summary: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.md * 1.5,
    marginBottom: SPACING.sm,
  },
  mood: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
  },
});

export default React.memo(RecordCard);
