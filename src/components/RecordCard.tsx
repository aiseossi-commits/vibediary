import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { getSignedPhotoUrl } from '../services/photoService';
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
  timeOnly?: boolean;
  customLabel?: string;
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
      borderRadius: BORDER_RADIUS.md,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 8,
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
    thumbnail: {
      width: 60, height: 60,
      borderRadius: BORDER_RADIUS.sm,
      marginBottom: SPACING.xs,
    },
  });
}

function RecordCard({ record, onPress, timeOnly = false, customLabel }: RecordCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  useEffect(() => {
    if (record.photoUrl) {
      getSignedPhotoUrl(record.photoUrl).then(setPhotoUri).catch(() => {});
    }
  }, [record.photoUrl]);
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
        {record.aiPending && (
          <View style={styles.pendingBadge}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.pendingText}>AI 처리 중</Text>
          </View>
        )}
      </View>

      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.thumbnail} contentFit="cover" />
      )}
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
