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
  Alert,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import WaveLoader from '../components/WaveLoader';
import { searchRecords } from '../services/searchPipeline';
import { shouldAbsorb, runAbsorb } from '../services/absorbService';
import { createSearchLog, getSearchLogs, deleteSearchLog } from '../db/searchLogsDao';
import { getSynthesisArticles, deleteSynthesisArticle } from '../db/synthesisDao';
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
import type { ChatMessage, SearchLog, SynthesisArticle } from '../types/record';

type ActiveTab = 'chat' | 'log';

const SYNTHESIS_TYPE_LABEL: Record<string, string> = {
  weekly_overview: '주간 요약',
  developmental_domain: '발달 성장',
  milestone_timeline: '이정표',
  behavioral_pattern: '행동 패턴',
  medical_summary: '의료 요약',
  therapy_log: '치료 기록',
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
    title: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, fontFamily: 'Pretendard-Bold', color: colors.textPrimary, letterSpacing: -0.6, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZE.md, color: colors.textSecondary, lineHeight: 26, letterSpacing: 0.2 },
    // 세그먼트 컨트롤
    segmentRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary, padding: 3 },
    segmentBtn: { flex: 1, paddingVertical: SPACING.sm - 2, alignItems: 'center', borderRadius: BORDER_RADIUS.sm - 2 },
    segmentBtnActive: { backgroundColor: colors.surface, ...SHADOW.sm },
    segmentBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textTertiary },
    segmentBtnTextActive: { color: colors.textPrimary, fontWeight: FONT_WEIGHT.semibold },
    // 배너
    absorbBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.accentLight, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.sm },
    absorbBannerText: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.accent, fontWeight: FONT_WEIGHT.medium },
    // 항해일지 피드
    logScroll: { flex: 1 },
    logContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
    sectionHeader: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm, marginTop: SPACING.md },
    // 인사이트 카드
    insightCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
    insightCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
    insightTypeLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
    insightDeleteBtn: { padding: SPACING.xs },
    insightTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.xs },
    insightBody: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20 },
    insightDate: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, marginTop: SPACING.xs },
    // Q&A 카드
    qaCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
    qaQuery: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.xs },
    qaAnswer: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20 },
    qaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xs },
    qaDate: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    qaDeleteBtn: { padding: SPACING.xs },
    // 빈 상태
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2, gap: SPACING.lg },
    emptyDescription: { fontSize: FONT_SIZE.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },
    // 채팅
    messageList: { flex: 1 },
    messageListContent: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, paddingBottom: SPACING.xl },
    userBubbleRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: SPACING.sm },
    userBubble: { maxWidth: '78%', backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, borderBottomRightRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    userBubbleText: { fontSize: FONT_SIZE.md, color: colors.textOnPrimary, lineHeight: 22 },
    assistantBubbleRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: SPACING.sm },
    assistantBubble: { maxWidth: '88%', backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, borderBottomLeftRadius: 4, padding: SPACING.md, ...SHADOW.sm },
    assistantBubbleText: { fontSize: FONT_SIZE.md, color: colors.textPrimary, lineHeight: 24 },
    typingRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: SPACING.sm, paddingHorizontal: SPACING.md },
    typingBubble: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, borderBottomLeftRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, ...SHADOW.sm },
    typingText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    inputArea: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
    input: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, paddingVertical: SPACING.sm },
    searchButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primary },
    searchButtonDisabled: { backgroundColor: colors.border },
    searchButtonText: { fontSize: FONT_SIZE.sm, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.semibold },
  });
}

function UserBubble({ message, styles }: { message: ChatMessage; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.userBubbleRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{message.text}</Text>
      </View>
    </View>
  );
}

function AssistantBubble({ message, styles }: {
  message: ChatMessage; styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Animated.View entering={FadeInDown} style={styles.assistantBubbleRow}>
      <View style={styles.assistantBubble}>
        <Text style={styles.assistantBubbleText}>{message.text}</Text>
      </View>
    </Animated.View>
  );
}

function formatRelativeDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function VoyageLogFeed({ childId, colors, styles, showAbsorbBanner, isAbsorbing, onAbsorb }: {
  childId: string | undefined;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
  showAbsorbBanner: boolean;
  isAbsorbing: boolean;
  onAbsorb: () => void;
}) {
  const [articles, setArticles] = useState<SynthesisArticle[]>([]);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((key: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!childId) { setIsLoading(false); return; }
    try {
      const [a, l] = await Promise.all([getSynthesisArticles(childId), getSearchLogs(childId)]);
      setArticles(a);
      setLogs(l);
    } catch (e) {
      console.error('[VoyageLogFeed] 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [childId]);

  useEffect(() => { loadData(); }, [loadData]);

  // absorb 완료 시 재로드
  useEffect(() => {
    if (!isAbsorbing) loadData();
  }, [isAbsorbing, loadData]);

  const handleDeleteArticle = useCallback((id: number) => {
    Alert.alert('인사이트 삭제', '이 인사이트를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteSynthesisArticle(id);
        setArticles(prev => prev.filter(a => a.id !== id));
      }},
    ]);
  }, []);

  const handleDeleteLog = useCallback((id: number) => {
    Alert.alert('저장된 질문 삭제', '이 질문을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteSearchLog(id);
        setLogs(prev => prev.filter(l => l.id !== id));
      }},
    ]);
  }, []);

  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>;

  const isEmpty = articles.length === 0 && logs.length === 0;

  return (
    <ScrollView style={styles.logScroll} contentContainerStyle={styles.logContent} showsVerticalScrollIndicator={false}>
      {showAbsorbBanner && (
        <TouchableOpacity style={styles.absorbBanner} onPress={onAbsorb} disabled={isAbsorbing} activeOpacity={0.8}>
          {isAbsorbing ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="sparkles-outline" size={16} color={colors.accent} />}
          <Text style={styles.absorbBannerText}>
            {isAbsorbing ? '인사이트를 생성하고 있어요...' : '새 기록이 쌓였어요. 인사이트를 업데이트할 수 있어요.'}
          </Text>
          {!isAbsorbing && <Ionicons name="chevron-forward" size={14} color={colors.accent} />}
        </TouchableOpacity>
      )}

      {isEmpty && !showAbsorbBanner ? (
        <View style={[styles.emptyState, { paddingTop: SPACING.xxl }]}>
          <MaterialCommunityIcons name="lighthouse-on" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyDescription}>기록이 10개 이상 쌓이면{'\n'}인사이트를 생성할 수 있어요.</Text>
        </View>
      ) : (
        <>
          {articles.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>인사이트</Text>
              {articles.map(article => {
                const key = `a-${article.id}`;
                const expanded = expandedIds.has(key);
                return (
                  <TouchableOpacity key={article.id} style={styles.insightCard} onPress={() => toggleExpand(key)} activeOpacity={0.85}>
                    <View style={styles.insightCardHeader}>
                      <Text style={styles.insightTypeLabel}>{SYNTHESIS_TYPE_LABEL[article.type] ?? article.type}</Text>
                      <TouchableOpacity style={styles.insightDeleteBtn} onPress={() => handleDeleteArticle(article.id)}>
                        <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.insightTitle}>{article.title}</Text>
                    <Text style={styles.insightBody} numberOfLines={expanded ? undefined : 4}>{article.body}</Text>
                    <Text style={styles.insightDate}>{formatRelativeDate(article.updatedAt)} 업데이트 · {expanded ? '접기' : '전체 보기'}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {logs.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>저장된 질문</Text>
              {logs.map(log => {
                const key = `l-${log.id}`;
                const expanded = expandedIds.has(key);
                return (
                  <TouchableOpacity key={log.id} style={styles.qaCard} onPress={() => toggleExpand(key)} activeOpacity={0.85}>
                    <Text style={styles.qaQuery}>{log.query}</Text>
                    <Text style={styles.qaAnswer} numberOfLines={expanded ? undefined : 4}>{log.answer}</Text>
                    <View style={styles.qaFooter}>
                      <Text style={styles.qaDate}>{formatRelativeDate(log.createdAt)} · {expanded ? '접기' : '전체 보기'}</Text>
                      <TouchableOpacity style={styles.qaDeleteBtn} onPress={() => handleDeleteLog(log.id)}>
                        <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const { activeChild } = useChild();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAbsorbBanner, setShowAbsorbBanner] = useState(false);
  const [isAbsorbing, setIsAbsorbing] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // activeChild 변경 시 초기화
  useEffect(() => {
    setMessages([]);
    setShowAbsorbBanner(false);
  }, [activeChild?.id]);

  // 항해일지 탭 활성화 시 absorb 체크
  useEffect(() => {
    if (activeTab === 'log' && activeChild?.id) {
      shouldAbsorb(activeChild.id).then(setShowAbsorbBanner).catch(() => {});
    }
  }, [activeTab, activeChild?.id]);

  useFocusEffect(useCallback(() => {
    if (activeTab === 'log' && activeChild?.id) {
      shouldAbsorb(activeChild.id).then(setShowAbsorbBanner).catch(() => {});
    }
  }, [activeTab, activeChild?.id]));

  const handleAbsorb = useCallback(async () => {
    if (!activeChild?.id || isAbsorbing) return;
    setIsAbsorbing(true);
    try {
      await runAbsorb(activeChild.id);
      setShowAbsorbBanner(false);
    } catch (e) {
      Alert.alert('오류', '인사이트 생성에 실패했어요. 네트워크를 확인해주세요.');
    } finally {
      setIsAbsorbing(false);
    }
  }, [activeChild?.id, isAbsorbing]);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed, createdAt: Date.now() };
    const history = messages.slice(-8).map(m => ({ role: m.role, text: m.text }));
    setQuery('');
    setMessages(prev => [...prev, userMsg]);
    setIsSearching(true);
    try {
      const searchResult = await searchRecords(trimmed, activeChild?.id, history, activeChild?.name);
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: searchResult.answer, createdAt: Date.now() }]);
      createSearchLog(activeChild?.id ?? null, trimmed, searchResult.answer).catch(() => {});
    } catch {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: '검색 중 오류가 발생했어요. 다시 시도해 주세요.', createdAt: Date.now() }]);
    } finally {
      setIsSearching(false);
    }
  }, [query, messages, activeChild?.id, activeChild?.name]);


  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length, isSearching]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') return <UserBubble message={item} styles={styles} />;
    return <AssistantBubble message={item} styles={styles} />;
  }, [styles]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>AI 등대</Text>
        {activeTab === 'chat' && <Text style={styles.subtitle}>무엇이든 물어보세요.{'\n'}바다가 기억하고 있습니다.</Text>}
      </View>

      {/* 세그먼트 컨트롤 */}
      <View style={styles.segmentRow}>
        {(['chat', 'log'] as ActiveTab[]).map(tab => (
          <TouchableOpacity key={tab} style={[styles.segmentBtn, activeTab === tab && styles.segmentBtnActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.segmentBtnText, activeTab === tab && styles.segmentBtnTextActive]}>
              {tab === 'chat' ? '등대' : '항해일지'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'log' ? (
        <VoyageLogFeed
          childId={activeChild?.id}
          colors={colors}
          styles={styles}
          showAbsorbBanner={showAbsorbBanner}
          isAbsorbing={isAbsorbing}
          onAbsorb={handleAbsorb}
        />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex} keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}>
          {messages.length === 0 && !isSearching ? (
            <View style={[styles.messageList, styles.emptyState]}>
              <MaterialCommunityIcons name="lighthouse-on" size={64} color={colors.primary} />
              <Text style={styles.emptyDescription}>기록된 내용을 바탕으로 무엇이든 물어보세요.{'\n'}대화 내용은 항해일지에 자동으로 저장됩니다.</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              style={styles.messageList}
              contentContainerStyle={styles.messageListContent}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={isSearching ? (
                <View style={styles.typingRow}>
                  <View style={styles.typingBubble}>
                    <WaveLoader color={colors.primary} />
                    <Text style={styles.typingText}>바다가 기억을 찾고 있어요...</Text>
                  </View>
                </View>
              ) : null}
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
              accessibilityLabel="검색어 입력"
            />
            <TouchableOpacity onPress={handleSearch} style={[styles.searchButton, (!query.trim() || isSearching) && styles.searchButtonDisabled]} disabled={!query.trim() || isSearching} accessibilityLabel="검색" accessibilityRole="button">
              {isSearching ? <ActivityIndicator size="small" color={colors.textOnPrimary} /> : <Text style={styles.searchButtonText}>검색</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
