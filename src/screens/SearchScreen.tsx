import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import WaveLoader from '../components/WaveLoader';
import { searchRecords } from '../services/searchPipeline';
import { getAllTags, isDatabaseReady } from '../db';
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
import type { SearchResult, Tag } from '../types/record';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
    title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZE.md, color: colors.textSecondary, lineHeight: 26, letterSpacing: 0.2 },
    results: { flex: 1 },
    resultsContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
    loadingContainer: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md },
    loadingText: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    answerCard: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      ...SHADOW.sm,
    },
    answerLabel: {
      fontSize: FONT_SIZE.xs,
      color: colors.textTertiary,
      fontWeight: FONT_WEIGHT.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: SPACING.sm,
    },
    answerText: { fontSize: FONT_SIZE.md, color: colors.textPrimary, lineHeight: 24 },
    sourcesLabel: {
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.textPrimary,
      marginBottom: SPACING.sm,
      marginTop: SPACING.sm,
    },
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2, gap: SPACING.lg },
    emptyIcon: { fontSize: 48 },
    emptyDescription: { fontSize: FONT_SIZE.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },
    tagFilter: { maxHeight: 44, borderTopWidth: 1, borderTopColor: colors.border },
    tagFilterContent: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.xs },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
    },
    filterButton: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: colors.surfaceSecondary,
    },
    filterButtonActive: { backgroundColor: colors.primaryLight },
    filterText: { fontSize: FONT_SIZE.xs, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
    filterTextActive: { color: colors.primary },
    input: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, paddingVertical: SPACING.sm },
    searchButton: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: colors.primary,
    },
    searchButtonDisabled: { backgroundColor: colors.border },
    searchButtonText: { fontSize: FONT_SIZE.sm, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.semibold },
  });
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { activeChild } = useChild();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  useEffect(() => {
    if (!isDatabaseReady()) return;
    getAllTags().then(setAllTags).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResult(null);
    try {
      const searchResult = await searchRecords(
        query.trim(),
        null,
        selectedTags.length > 0 ? selectedTags : undefined,
        activeChild?.id
      );
      setResult(searchResult);
    } catch {
      setResult({ answer: '검색 중 오류가 발생했어요. 다시 시도해 주세요.', sourceRecords: [] });
    } finally {
      setIsSearching(false);
    }
  }, [query, selectedTags, activeChild?.id]);

  const handleTagToggle = useCallback((tagName: string) => {
    setSelectedTags((prev) => prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]);
  }, []);

  const handleRecordPress = useCallback((recordId: string) => {
    navigation.navigate('RecordDetail', { recordId });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>AI 등대</Text>
          <Text style={styles.subtitle}>무엇이든 물어보세요.{'\n'}바다가 기억하고 있습니다.</Text>
        </View>

        <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {isSearching && (
            <View style={styles.loadingContainer}>
              <WaveLoader color={colors.primary} />
              <Text style={styles.loadingText}>바다가 기억을 찾고 있어요...</Text>
            </View>
          )}

          {result && !isSearching && (
            <>
              <View style={styles.answerCard}>
                <Text style={styles.answerLabel}>답변</Text>
                <Text style={styles.answerText}>{result.answer}</Text>
              </View>
              {result.sourceRecords.length > 0 && (
                <>
                  <Text style={styles.sourcesLabel}>근거 기록 ({result.sourceRecords.length}건)</Text>
                  {result.sourceRecords.map((record) => (
                    <RecordCard key={record.id} record={record} onPress={() => handleRecordPress(record.id)} />
                  ))}
                </>
              )}
            </>
          )}

          {!result && !isSearching && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔦</Text>
              <Text style={styles.emptyDescription}>
                예: "지난번 열이 얼마나 올랐었지?"{'\n'}
                "이번 달에 약은 잘 먹었어?"{'\n'}
                "최근 행동 변화가 있었어?"
              </Text>
            </View>
          )}
        </ScrollView>

        {showTagFilter && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagFilter} contentContainerStyle={styles.tagFilterContent}>
            {allTags.map((tag) => (
              <TagChip key={tag.id} name={tag.name} tag={tag} selected={selectedTags.includes(tag.name)} onPress={() => handleTagToggle(tag.name)} size="md" />
            ))}
          </ScrollView>
        )}

        <View style={styles.inputArea}>
          <TouchableOpacity onPress={() => setShowTagFilter(!showTagFilter)} style={[styles.filterButton, showTagFilter && styles.filterButtonActive]}>
            <Text style={[styles.filterText, showTagFilter && styles.filterTextActive]}>
              {selectedTags.length > 0 ? `태그 ${selectedTags.length}` : '태그'}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="기록에 대해 물어보세요..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            multiline={false}
          />

          <TouchableOpacity
            onPress={handleSearch}
            style={[styles.searchButton, (!query.trim() || isSearching) && styles.searchButtonDisabled]}
            disabled={!query.trim() || isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.searchButtonText}>검색</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
