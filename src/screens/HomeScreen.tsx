import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
  TOUCH_TARGET,
} from '../constants/theme';
import type { RecordWithTags } from '../types/record';
import { getAllRecords, isDatabaseReady } from '../db';
import { processTextRecord } from '../services/recordPipeline';
import { processOfflineQueue } from '../services/offlineQueue';
import RecordCard from '../components/RecordCard';

interface HomeScreenProps {
  navigation: any;
}

const PAGE_SIZE = 20;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [records, setRecords] = useState<RecordWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // 로딩 완료 후 진짜 빈 상태임이 확인됐을 때만 슬로건 표시
  const [showEmptyState, setShowEmptyState] = useState(false);

  const loadRecords = useCallback(async (reset = false) => {
    try {
      if (!isDatabaseReady()) {
        setRecords([]);
        setHasMore(false);
        return;
      }

      const offset = reset ? 0 : records.length;

      // 웹에서 DB 호출이 행(hang)할 수 있으므로 타임아웃 적용
      const timeout = new Promise<RecordWithTags[]>((_, reject) =>
        setTimeout(() => reject(new Error('DB query timeout')), 5000)
      );
      const data = await Promise.race([
        getAllRecords(PAGE_SIZE, offset),
        timeout,
      ]);

      if (reset) {
        setRecords(data);
        setShowEmptyState(data.length === 0); // 로딩 완료 후에만 빈 상태 표시
      } else {
        setRecords((prev) => [...prev, ...data]);
      }

      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.warn('Failed to load records:', error);
      if (reset) {
        setRecords([]);
        setShowEmptyState(true);
      }
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [records.length]);

  // Reload records when screen gains focus + AI 대기 항목 자동 처리
  useFocusEffect(
    useCallback(() => {
      setShowEmptyState(false); // 포커스 시 슬로건 숨기고 로딩 상태로
      setIsLoading(true);
      loadRecords(true);

      // 오프라인 큐 자동 처리 (AI 처리 중인 항목)
      processOfflineQueue()
        .then((count) => {
          if (count > 0) loadRecords(true); // AI 처리 완료 시 리스트 새로고침
        })
        .catch(() => {}); // 실패 시 무시 (오프라인 등)
    }, [])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadRecords(true);
  }, [loadRecords]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadRecords(false);
    }
  }, [isLoading, hasMore, loadRecords]);

  const handleRecordPress = useCallback(
    (record: RecordWithTags) => {
      navigation.navigate('RecordDetail', { recordId: record.id });
    },
    [navigation],
  );

  const handleNewRecord = useCallback(() => {
    navigation.navigate('Recording');
  }, [navigation]);

  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim();
    if (!text || isSaving) return;

    setIsSaving(true);
    setTextInput('');
    try {
      await processTextRecord(text);
      loadRecords(true);
    } catch (error) {
      console.warn('텍스트 기록 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  }, [textInput, isSaving, loadRecords]);

  const renderItem = useCallback(
    ({ item }: { item: RecordWithTags }) => (
      <RecordCard record={item} onPress={() => handleRecordPress(item)} />
    ),
    [handleRecordPress],
  );

  const renderFooter = useCallback(() => {
    if (!hasMore || records.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.textTertiary} />
      </View>
    );
  }, [hasMore, records.length]);

  const renderEmpty = useCallback(() => {
    // 로딩 중이거나 아직 빈 상태 확인 전 → 로딩 인디케이터
    if (!showEmptyState) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    // 로딩 완료 후 진짜 빈 상태 → 슬로건
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <Text style={styles.emptyIcon}>{'{ }'}</Text>
        </View>
        <Text style={styles.emptySlogan}>
          기록에 치이지 말고,{'\n'}그냥 말하세요
        </Text>
        <Text style={styles.emptySubtext}>
          첫 번째 음성 기록을 시작해보세요
        </Text>
        <TouchableOpacity
          onPress={handleNewRecord}
          style={[styles.emptyButton, SHADOW.md]}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyButtonText}>녹음 시작하기</Text>
        </TouchableOpacity>
      </View>
    );
  }, [showEmptyState, handleNewRecord]);

  const keyExtractor = useCallback((item: RecordWithTags) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>바다</Text>
        <Text style={styles.subtitle}>나의 기록</Text>
      </View>

      {/* 텍스트 입력바 */}
      <View style={styles.inputBar}>
        <View style={[styles.inputContainer, SHADOW.sm]}>
          <TextInput
            style={styles.textInput}
            placeholder="기록을 입력하세요..."
            placeholderTextColor={COLORS.textTertiary}
            value={textInput}
            onChangeText={setTextInput}
            onSubmitEditing={handleTextSubmit}
            returnKeyType="send"
            multiline={false}
            editable={!isSaving}
          />
          {textInput.trim().length > 0 ? (
            <TouchableOpacity
              onPress={handleTextSubmit}
              style={styles.sendButton}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
              ) : (
                <Text style={styles.sendButtonText}>전송</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleNewRecord}
              style={styles.micButton}
              activeOpacity={0.7}
            >
              <Text style={styles.micIcon}>🎤</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={records}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          records.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />

      {/* FAB - new recording button (only when records exist) */}
      {records.length > 0 && (
        <TouchableOpacity
          onPress={handleNewRecord}
          style={[styles.fab, SHADOW.lg]}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs - 2,
  },
  // 텍스트 입력바
  inputBar: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    marginLeft: SPACING.xs,
  },
  sendButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textOnPrimary,
  },
  micButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  micIcon: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl + TOUCH_TARGET.fab,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  footer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyIcon: {
    fontSize: FONT_SIZE.xxl,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  emptySlogan: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: FONT_SIZE.xl * 1.6,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md - 2,
    borderRadius: BORDER_RADIUS.xl,
  },
  emptyButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textOnPrimary,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    width: TOUCH_TARGET.fab,
    height: TOUCH_TARGET.fab,
    borderRadius: TOUCH_TARGET.fab / 2,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: FONT_SIZE.xxl + 4,
    color: COLORS.textOnPrimary,
    lineHeight: FONT_SIZE.xxl + 6,
    fontWeight: FONT_WEIGHT.regular,
  },
});
