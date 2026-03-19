import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import type { ChatMessage, SearchLog } from '../types/record';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md },
    title: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, fontFamily: 'Pretendard-Bold', color: colors.textPrimary, letterSpacing: -0.6, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZE.md, color: colors.textSecondary, lineHeight: 26, letterSpacing: 0.2 },
    logToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      marginTop: SPACING.sm,
      alignSelf: 'flex-start',
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
    messageList: { flex: 1 },
    messageListContent: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, paddingBottom: SPACING.xl },
    // 사용자 버블
    userBubbleRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: SPACING.sm },
    userBubble: {
      maxWidth: '78%',
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      borderBottomRightRadius: 4,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    userBubbleText: { fontSize: FONT_SIZE.md, color: colors.textOnPrimary, lineHeight: 22 },
    // 어시스턴트 버블
    assistantBubbleRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: SPACING.sm },
    assistantBubble: {
      maxWidth: '88%',
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      borderBottomLeftRadius: 4,
      padding: SPACING.md,
      ...SHADOW.sm,
    },
    assistantBubbleText: { fontSize: FONT_SIZE.md, color: colors.textPrimary, lineHeight: 24 },
    assistantBubbleFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: SPACING.sm,
    },
    sourcesToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
    },
    sourcesToggleText: {
      fontSize: FONT_SIZE.xs,
      color: colors.textTertiary,
      fontWeight: FONT_WEIGHT.semibold,
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
    sourceRecordsContainer: { marginTop: SPACING.sm },
    // 로딩
    typingRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: SPACING.sm, paddingHorizontal: SPACING.md },
    typingBubble: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      borderBottomLeftRadius: 4,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      ...SHADOW.sm,
    },
    typingText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    // 빈 상태
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2, gap: SPACING.lg },
    emptyDescription: { fontSize: FONT_SIZE.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },
    // 입력
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
  });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

// 사용자 말풍선
function UserBubble({ message, styles }: { message: ChatMessage; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.userBubbleRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{message.text}</Text>
      </View>
    </View>
  );
}

// 어시스턴트 말풍선
function AssistantBubble({
  message,
  userQuery,
  isSaved,
  onSave,
  onRecordPress,
  styles,
  colors,
}: {
  message: ChatMessage;
  userQuery: string;
  isSaved: boolean;
  onSave: (messageId: string, query: string, answer: string) => Promise<void>;
  onRecordPress: (id: string) => void;
  styles: ReturnType<typeof createStyles>;
  colors: AppColors;
}) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const sourceRecords = message.sourceRecords ?? [];

  const handleSave = useCallback(async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(message.id, userQuery, message.text);
    } catch {
      Alert.alert('저장 실패', '항해일지 저장에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaved, isSaving, onSave, message.id, userQuery, message.text]);

  return (
    <Animated.View entering={FadeInDown} style={styles.assistantBubbleRow}>
      <View style={styles.assistantBubble}>
        <Text style={styles.assistantBubbleText}>{message.text}</Text>
        <View style={styles.assistantBubbleFooter}>
          {sourceRecords.length > 0 ? (
            <TouchableOpacity style={styles.sourcesToggle} onPress={() => setSourcesExpanded((v) => !v)}>
              <Ionicons
                name={sourcesExpanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={colors.textTertiary}
              />
              <Text style={styles.sourcesToggleText}>근거 {sourceRecords.length}건</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity
            style={[styles.saveButton, isSaved && styles.saveButtonSaved]}
            onPress={handleSave}
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
        {sourcesExpanded && sourceRecords.length > 0 && (
          <View style={styles.sourceRecordsContainer}>
            {sourceRecords.map((record) => (
              <RecordCard key={record.id} record={record} onPress={() => onRecordPress(record.id)} />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { activeChild } = useChild();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const loadLogs = useCallback(async () => {
    try {
      const data = await getSearchLogs(activeChild?.id ?? null);
      setLogs(data);
    } catch {}
  }, [activeChild?.id]);

  useFocusEffect(useCallback(() => { loadLogs(); }, [loadLogs]));
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // 사용자 메시지 생성
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };

    // 슬라이딩 윈도우: 최근 4개 메시지를 대화 히스토리로 전달
    const history = messages.slice(-4).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setQuery('');
    setMessages((prev) => [...prev, userMsg]);
    setIsSearching(true);

    try {
      const queryEmbedding = await generateEmbedding(trimmed);
      const searchResult = await searchRecords(trimmed, queryEmbedding, undefined, activeChild?.id, history);

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: searchResult.answer,
        sourceRecords: searchResult.sourceRecords,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: '검색 중 오류가 발생했어요. 다시 시도해 주세요.',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSearching(false);
    }
  }, [query, messages, activeChild?.id]);

  const handleSave = useCallback(async (messageId: string, userQuery: string, answer: string) => {
    if (savedMessageIds.has(messageId)) return;
    await createSearchLog(activeChild?.id ?? null, userQuery, answer);
    setSavedMessageIds((prev) => new Set(prev).add(messageId));
    await loadLogs();
  }, [savedMessageIds, activeChild?.id, loadLogs]);

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

  // 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isSearching]);

  // 메시지별 사용자 쿼리 매핑 (assistant 메시지에 대응하는 user 메시지 텍스트 찾기)
  const getUserQueryForAssistant = useCallback((index: number): string => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].text;
    }
    return '';
  }, [messages]);

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    if (item.role === 'user') {
      return <UserBubble message={item} styles={styles} />;
    }
    return (
      <AssistantBubble
        message={item}
        userQuery={getUserQueryForAssistant(index)}
        isSaved={savedMessageIds.has(item.id)}
        onSave={handleSave}
        onRecordPress={handleRecordPress}
        styles={styles}
        colors={colors}
      />
    );
  }, [styles, colors, savedMessageIds, handleSave, handleRecordPress, getUserQueryForAssistant]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>AI 등대</Text>
          <Text style={styles.subtitle}>무엇이든 물어보세요.{'\n'}바다가 기억하고 있습니다.</Text>
          <TouchableOpacity
            style={[styles.logToggleButton, showLogs && styles.logToggleButtonActive]}
            onPress={() => setShowLogs((v) => !v)}
          >
            <Ionicons name="journal-outline" size={14} color={showLogs ? colors.primary : colors.textTertiary} />
            <Text style={[styles.logToggleText, showLogs && styles.logToggleTextActive]}>항해일지</Text>
          </TouchableOpacity>
        </View>

        {showLogs ? (
          <ScrollView style={styles.messageList} contentContainerStyle={styles.messageListContent} showsVerticalScrollIndicator={false}>
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
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            {messages.length === 0 && !isSearching ? (
              <View style={[styles.messageList, styles.emptyState]}>
                <MaterialCommunityIcons name="lighthouse-on" size={64} color={colors.primary} />
                <Text style={styles.emptyDescription}>
                  기록된 내용을 바탕으로 무엇이든 물어보세요.{'\n'}
                  대화 내용은 저장되지 않아요.{'\n'}
                  매번 새로운 질문으로 시작됩니다.
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListFooterComponent={
                  isSearching ? (
                    <View style={styles.typingRow}>
                      <View style={styles.typingBubble}>
                        <WaveLoader color={colors.primary} />
                        <Text style={styles.typingText}>바다가 기억을 찾고 있어요...</Text>
                      </View>
                    </View>
                  ) : null
                }
              />
            )}

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
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
