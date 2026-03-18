import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import RecordCard from '../components/RecordCard';
import WaveLoader from '../components/WaveLoader';
import { searchRecords } from '../services/searchPipeline';
import { generateEmbedding } from '../services/aiProcessor';
import { createSearchLog, getSearchLogs, deleteSearchLog } from '../db/searchLogsDao';
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
import type { SearchResult, SearchLog } from '../types/record';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    headerLeft: { flex: 1 },
    title: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, fontFamily: 'Pretendard-Bold', color: colors.textPrimary, letterSpacing: -0.6, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZE.md, color: colors.textSecondary, lineHeight: 26, letterSpacing: 0.2 },
    logToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      marginTop: 6,
    },
    logToggleButtonActive: {
      backgroundColor: colors.primary + '22',
    },
    logToggleText: {
      fontSize: FONT_SIZE.xs,
      color: colors.textTertiary,
      fontWeight: FONT_WEIGHT.semibold,
    },
    logToggleTextActive: {
      color: colors.primary,
    },
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
    answerCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    answerLabel: {
      fontSize: FONT_SIZE.xs,
      color: colors.textTertiary,
      fontWeight: FONT_WEIGHT.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: colors.primary,
    },
    saveButtonSaved: {
      backgroundColor: colors.border,
    },
    saveButtonText: {
      fontSize: FONT_SIZE.xs,
      color: colors.textOnPrimary,
      fontWeight: FONT_WEIGHT.semibold,
    },
    saveButtonTextSaved: {
      color: colors.textTertiary,
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
    // 항해일지
    logCard: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.xs,
    },
    logQuery: {
      flex: 1,
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.textPrimary,
      marginRight: SPACING.sm,
    },
    logDate: {
      fontSize: FONT_SIZE.xs,
      color: colors.textTertiary,
    },
    logAnswer: {
      fontSize: FONT_SIZE.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    logDeleteButton: {
      padding: 4,
    },
    logsEmptyText: {
      fontSize: FONT_SIZE.sm,
      color: colors.textTertiary,
      lineHeight: 22,
    },
  });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { activeChild } = useChild();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const data = await getSearchLogs(activeChild?.id ?? null);
      setLogs(data);
    } catch {}
  }, [activeChild?.id]);

  useFocusEffect(useCallback(() => { loadLogs(); }, [loadLogs]));

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResult(null);
    setIsSaved(false);
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

  const handleSave = useCallback(async () => {
    if (!result || isSaved || isSaving) return;
    setIsSaving(true);
    try {
      await createSearchLog(activeChild?.id ?? null, query.trim(), result.answer);
      setIsSaved(true);
      await loadLogs();
    } catch {
      Alert.alert('저장 실패', '항해일지 저장에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }, [result, isSaved, isSaving, activeChild?.id, query, loadLogs]);

  const handleDeleteLog = useCallback((log: SearchLog) => {
    Alert.alert('항해일지 삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSearchLog(log.id);
            await loadLogs();
          } catch {}
        },
      },
    ]);
  }, [loadLogs]);

  const handleRecordPress = useCallback((recordId: string) => {
    navigation.navigate('RecordDetail', { recordId });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>AI 등대</Text>
            <Text style={styles.subtitle}>무엇이든 물어보세요.{'\n'}바다가 기억하고 있습니다.</Text>
          </View>
          <TouchableOpacity
            style={[styles.logToggleButton, showLogs && styles.logToggleButtonActive]}
            onPress={() => setShowLogs((v) => !v)}
          >
            <Ionicons name="journal-outline" size={14} color={showLogs ? colors.primary : colors.textTertiary} />
            <Text style={[styles.logToggleText, showLogs && styles.logToggleTextActive]}>항해일지</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {showLogs ? (
            <>
              {logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="journal-outline" size={48} color={colors.textTertiary} />
                  <Text style={styles.emptyDescription}>
                    아직 저장된 항해일지가 없어요.{'\n'}검색 후 저장 버튼을 눌러보세요.
                  </Text>
                </View>
              ) : (
                logs.map((log) => (
                  <View key={log.id} style={styles.logCard}>
                    <View style={styles.logCardHeader}>
                      <Text style={styles.logQuery} numberOfLines={2}>{log.query}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                        <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
                        <TouchableOpacity style={styles.logDeleteButton} onPress={() => handleDeleteLog(log)}>
                          <Ionicons name="close" size={16} color={colors.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.logAnswer} numberOfLines={4}>{log.answer}</Text>
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              {isSearching && (
                <View style={styles.loadingContainer}>
                  <WaveLoader color={colors.primary} />
                  <Text style={styles.loadingText}>바다가 기억을 찾고 있어요...</Text>
                </View>
              )}

              {result && !isSearching && (
                <>
                  <View style={styles.answerCard}>
                    <View style={styles.answerCardHeader}>
                      <Text style={styles.answerLabel}>답변</Text>
                      <TouchableOpacity
                        onPress={handleSave}
                        style={[styles.saveButton, isSaved && styles.saveButtonSaved]}
                        disabled={isSaved || isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color={colors.textOnPrimary} />
                        ) : (
                          <>
                            <Ionicons
                              name={isSaved ? 'bookmark' : 'bookmark-outline'}
                              size={12}
                              color={isSaved ? colors.textTertiary : colors.textOnPrimary}
                            />
                            <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextSaved]}>
                              {isSaved ? '저장됨' : '저장'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
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
            </>
          )}
        </ScrollView>

        {!showLogs && <View style={styles.inputArea}>
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
        </View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
