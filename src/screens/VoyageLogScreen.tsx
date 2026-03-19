import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSearchLogs, deleteSearchLog } from '../db/searchLogsDao';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
  type AppColors,
} from '../constants/theme';
import type { SearchLog } from '../types/record';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
    title: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, fontFamily: 'Pretendard-Bold', color: colors.textPrimary, letterSpacing: -0.6, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZE.md, color: colors.textSecondary, lineHeight: 26, letterSpacing: 0.2 },
    list: { flex: 1 },
    listContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
    logCard: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW.sm,
    },
    logCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.sm,
    },
    logMeta: {
      flex: 1,
      marginRight: SPACING.sm,
    },
    logQuery: {
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.textPrimary,
      lineHeight: 22,
      marginBottom: SPACING.xs,
    },
    logDate: {
      fontSize: FONT_SIZE.xs,
      color: colors.textTertiary,
    },
    logDeleteButton: {
      padding: 4,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: SPACING.sm,
    },
    logAnswer: {
      fontSize: FONT_SIZE.sm,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg, paddingHorizontal: SPACING.xl },
    emptyDescription: { fontSize: FONT_SIZE.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },
  });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function LogCard({
  log,
  onDelete,
  styles,
  colors,
}: {
  log: SearchLog;
  onDelete: (log: SearchLog) => void;
  styles: ReturnType<typeof createStyles>;
  colors: AppColors;
}) {
  return (
    <View style={styles.logCard}>
      <View style={styles.logCardHeader}>
        <View style={styles.logMeta}>
          <Text style={styles.logQuery}>{log.query}</Text>
          <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
        </View>
        <TouchableOpacity style={styles.logDeleteButton} onPress={() => onDelete(log)} accessibilityLabel="항해일지 삭제" accessibilityRole="button">
          <Ionicons name="close" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
      <Text style={styles.logAnswer}>{log.answer}</Text>
    </View>
  );
}

export default function VoyageLogScreen() {
  const { colors } = useTheme();
  const { activeChild } = useChild();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [logs, setLogs] = useState<SearchLog[]>([]);

  const loadLogs = useCallback(async () => {
    try {
      const data = await getSearchLogs(activeChild?.id ?? null);
      setLogs(data);
    } catch {
      Alert.alert('오류', '항해일지를 불러오지 못했습니다.');
    }
  }, [activeChild?.id]);

  useFocusEffect(useCallback(() => { loadLogs(); }, [loadLogs]));

  const handleDelete = useCallback((log: SearchLog) => {
    Alert.alert('항해일지 삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSearchLog(log.id);
            await loadLogs();
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  }, [loadLogs]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>항해일지</Text>
        <Text style={styles.subtitle}>AI 등대에서 저장한{'\n'}탐색 기록입니다.</Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="journal-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyDescription}>
            아직 저장된 항해일지가 없어요.{'\n'}AI 등대에서 검색 후 저장해보세요.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={logs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <LogCard log={item} onDelete={handleDelete} styles={styles} colors={colors} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
