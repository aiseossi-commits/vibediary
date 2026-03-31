import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  type AppColors,
} from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { RecordWithTags } from '../types/record';
import TagChip from './TagChip';

interface RecordCardProps {
  record: RecordWithTags;
  onPress: () => void;
  showAgeOverlay?: boolean;
  timeOnly?: boolean;
  customLabel?: string;
}

// 회색 오버레이 불투명도: dark/light 양쪽에서 명확히 보이는 "바랜" 효과
// 캘린더 날짜 기준(자정 경계)으로 오늘/어제 명확히 구분
function getAgeOverlayOpacity(timestamp: number): number {
  const now = new Date();
  const then = new Date(timestamp);
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const thenMidnight = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const ageDays = Math.round((nowMidnight - thenMidnight) / (1000 * 60 * 60 * 24));
  if (ageDays === 0) return 0;       // 오늘
  if (ageDays === 1) return 0.18;    // 어제 (명확히 구분)
  if (ageDays <= 3) return 0.28;     // 2-3일
  if (ageDays <= 7) return 0.38;     // 4-7일
  if (ageDays <= 14) return 0.48;    // 8-14일
  return 0.58;                       // 15일+
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
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.15)',
      borderLeftColor: colors.border,
      borderRightColor: colors.border,
      borderBottomColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 1,
      elevation: 2,
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
    calendarTextBadge: {
      backgroundColor: colors.textSecondary + '22',
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.full,
    },
    calendarTextBadgeText: {
      fontSize: FONT_SIZE.xs,
      color: colors.textSecondary,
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

function RecordCard({ record, onPress, showAgeOverlay = true, timeOnly = false, customLabel }: RecordCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const overlayOpacity = showAgeOverlay ? getAgeOverlayOpacity(record.createdAt) : 0;
  const dateLabel = customLabel
    ?? (timeOnly
      ? new Date(record.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
      : formatDateTime(record.createdAt));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        {record.source === 'calendar_text' && !record.aiPending && (
          <View style={styles.calendarTextBadge}>
            <Text style={styles.calendarTextBadgeText}>추가 기록</Text>
          </View>
        )}
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

      {overlayOpacity > 0 && (
        <View style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `rgba(128,128,128,${overlayOpacity})`, borderRadius: 20 },
        ]} pointerEvents="none" />
      )}
    </TouchableOpacity>
  );
}

export default React.memo(RecordCard);
