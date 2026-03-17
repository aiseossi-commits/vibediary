import React, { useState, useCallback, useMemo } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import RecordCard from '../components/RecordCard';
import WaveLoader from '../components/WaveLoader';
import { searchRecords } from '../services/searchPipeline';
import { generateEmbedding } from '../services/aiProcessor';
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
import type { SearchResult } from '../types/record';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
    title: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, fontFamily: 'Pretendard-Bold', color: colors.textPrimary, letterSpacing: -0.6, marginBottom: SPACING.sm },
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
    emptyDescription: { fontSize: FONT_SIZE.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },
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

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResult(null);
    try {
      const queryEmbedding = await generateEmbedding(query.trim());
      const searchResult = await searchRecords(query.trim(), queryEmbedding, undefined, activeChild?.id);
      setResult(searchResult);
    } catch {
      setResult({ answer: '검색 중 오류가 발생했어요. 다시 시도해 주세요.', sourceRecords: [] });
    } finally {
      setIsSearching(false);
    }
  }, [query, activeChild?.id]);

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
              <MaterialCommunityIcons name="lighthouse-on" size={64} color={colors.primary} />
              <Text style={styles.emptyDescription}>
                기록된 내용을 바탕으로 무엇이든 물어보세요.{'\n'}
                대화 내용은 저장되지 않아요.{'\n'}
                매번 새로운 질문으로 시작됩니다.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
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
