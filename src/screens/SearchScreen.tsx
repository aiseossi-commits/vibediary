import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import RecordCard from '../components/RecordCard';
import TagChip from '../components/TagChip';
import { searchRecords } from '../services/searchPipeline';
import { getAllTags, isDatabaseReady } from '../db';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '../constants/theme';
import type { SearchResult, Tag } from '../types/record';

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // 태그 로드
  const loadTags = useCallback(async () => {
    if (!isDatabaseReady()) return;
    try {
      const tags = await getAllTags();
      setAllTags(tags);
    } catch {
      // 무시
    }
  }, []);

  // 검색 실행
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResult(null);

    try {
      // 임베딩 없이 검색 (v1에서는 키워드+태그 기반)
      const searchResult = await searchRecords(
        query.trim(),
        null, // queryEmbedding: v2에서 온디바이스 임베딩 추가
        selectedTags.length > 0 ? selectedTags : undefined
      );
      setResult(searchResult);
    } catch (error) {
      setResult({
        answer: '검색 중 오류가 발생했어요. 다시 시도해 주세요.',
        sourceRecords: [],
      });
    } finally {
      setIsSearching(false);
    }
  }, [query, selectedTags]);

  const handleTagToggle = useCallback((tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  }, []);

  const handleRecordPress = useCallback(
    (recordId: string) => {
      navigation.navigate('RecordDetail', { recordId });
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>검색</Text>
        </View>

        {/* 검색 입력 */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="기록에 대해 물어보세요..."
              placeholderTextColor={COLORS.textTertiary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              multiline={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchActions}>
            <TouchableOpacity
              onPress={() => {
                setShowTagFilter(!showTagFilter);
                if (!showTagFilter) loadTags();
              }}
              style={[styles.filterButton, showTagFilter && styles.filterButtonActive]}
            >
              <Text
                style={[styles.filterText, showTagFilter && styles.filterTextActive]}
              >
                태그 필터 {selectedTags.length > 0 ? `(${selectedTags.length})` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSearch}
              style={[styles.searchButton, !query.trim() && styles.searchButtonDisabled]}
              disabled={!query.trim() || isSearching}
            >
              <Text style={styles.searchButtonText}>
                {isSearching ? '검색 중...' : '검색'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 태그 필터 */}
          {showTagFilter && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagFilter}
              contentContainerStyle={styles.tagFilterContent}
            >
              {allTags.map((tag) => (
                <TagChip
                  key={tag.id}
                  name={tag.name}
                  tag={tag}
                  selected={selectedTags.includes(tag.name)}
                  onPress={() => handleTagToggle(tag.name)}
                  size="md"
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* 검색 결과 */}
        <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>기록을 찾고 있어요...</Text>
            </View>
          )}

          {result && !isSearching && (
            <>
              {/* AI 답변 */}
              <View style={styles.answerCard}>
                <Text style={styles.answerLabel}>💬 답변</Text>
                <Text style={styles.answerText}>{result.answer}</Text>
              </View>

              {/* 근거 기록 */}
              {result.sourceRecords.length > 0 && (
                <>
                  <Text style={styles.sourcesLabel}>
                    📋 근거 기록 ({result.sourceRecords.length}건)
                  </Text>
                  {result.sourceRecords.map((record) => (
                    <RecordCard
                      key={record.id}
                      record={record}
                      onPress={() => handleRecordPress(record.id)}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {/* 빈 상태 */}
          {!result && !isSearching && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💡</Text>
              <Text style={styles.emptyTitle}>기록에 대해 물어보세요</Text>
              <Text style={styles.emptyDescription}>
                예: "지난번 열이 얼마나 올랐었지?"{'\n'}
                "이번 달에 약은 잘 먹었어?"{'\n'}
                "최근 행동 변화가 있었어?"
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  searchSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    ...SHADOW.sm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  clearText: {
    fontSize: 16,
    color: COLORS.textTertiary,
  },
  searchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  filterText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  filterTextActive: {
    color: COLORS.primaryDark,
  },
  searchButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  searchButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  tagFilter: {
    marginTop: SPACING.sm,
    maxHeight: 40,
  },
  tagFilterContent: {
    gap: SPACING.xs,
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  answerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    ...SHADOW.sm,
  },
  answerLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING.sm,
  },
  answerText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  sourcesLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyDescription: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
