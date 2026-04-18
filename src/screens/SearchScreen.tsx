import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import * as Clipboard from 'expo-clipboard';
import Markdown from 'react-native-markdown-display';
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
  Modal,
  Share,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import WaveLoader from '../components/WaveLoader';
import { searchRecords } from '../services/searchPipeline';
import { shouldAbsorb, runAbsorb, generateVoyageReport, extractVisualDataBlock, VOYAGE_REPORT_OPTIONS, type VoyageReportType } from '../services/absorbService';
import { getWikiPages } from '../db/wikiDao';
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
import type { ChatMessage, WikiPage, SearchLog } from '../types/record';

type ActiveTab = 'chat' | 'log';

const SUGGESTED_QUESTIONS = [
  '이번 달 주요 변화를 요약해줘',
  '이번 주 특이사항이 있었어?',
  '병원 진료 전 브리핑해줘',
  '최근 식사·수면 패턴 어때?',
];

function getWikiTypeLabel(page: WikiPage): string {
  if (page.slug === 'wiki-index') return '인덱스';
  if (page.slug.startsWith('voyage/weekly/')) return '주간 일지';
  if (page.slug.startsWith('voyage/monthly/')) return '월간 일지';
  if (page.slug.startsWith('voyage/sleep/')) return '수면 분석';
  if (page.slug.startsWith('voyage/food/')) return '음식 반응';
  if (page.slug.startsWith('voyage/behavior/')) return '행동 패턴';
  if (page.slug === 'overview/weekly') return '주간 요약';
  if (page.slug === 'timeline/milestones') return '이정표';
  if (page.slug.startsWith('entity/food/')) return '음식 반응';
  if (page.slug.startsWith('entity/behavior/')) return '행동 패턴';
  if (page.slug.startsWith('entity/therapy/')) return '치료 기록';
  if (page.slug.startsWith('entity/')) return '토픽';
  if (page.type === 'overview') return '개요';
  if (page.type === 'timeline') return '타임라인';
  return page.type;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
    title: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, fontFamily: 'Pretendard-Bold', color: colors.textPrimary, letterSpacing: -0.6, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZE.md, color: colors.textSecondary, lineHeight: 26, letterSpacing: 0.2 },
    segmentRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary, padding: 3 },
    segmentBtn: { flex: 1, paddingVertical: SPACING.sm - 2, alignItems: 'center', borderRadius: BORDER_RADIUS.sm - 2 },
    segmentBtnActive: { backgroundColor: colors.surface, ...SHADOW.sm },
    segmentBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textTertiary },
    segmentBtnTextActive: { color: colors.textPrimary, fontWeight: FONT_WEIGHT.semibold },
    // 인사이트 섹션
    insightSection: { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
    insightSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
    insightSectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textSecondary },
    insightSectionToggle: { fontSize: FONT_SIZE.xs, color: colors.primary },
    insightCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
    insightCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
    insightTypeLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
    insightDeleteBtn: { padding: SPACING.xs },
    insightTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.xs },
    insightBody: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20 },
    insightDate: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, marginTop: SPACING.xs },
    visualChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
    visualChip: { backgroundColor: colors.primaryLight, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
    visualChipText: { fontSize: FONT_SIZE.xs, color: colors.primary },
    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: colors.surfaceSecondary, marginHorizontal: SPACING.md, marginBottom: SPACING.md, padding: SPACING.sm + 2, borderRadius: BORDER_RADIUS.sm },
    generateBtnText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
    divider: { height: 1, backgroundColor: colors.divider, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
    // 채팅
    messageList: { flex: 1 },
    messageListContent: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, paddingBottom: SPACING.xl },
    userBubbleRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: SPACING.sm },
    userBubble: { maxWidth: '78%', backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, borderBottomRightRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    userBubbleText: { fontSize: FONT_SIZE.md, color: colors.textOnPrimary, lineHeight: 22 },
    assistantBubbleRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: SPACING.sm },
    assistantBubble: { maxWidth: '88%', backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, borderBottomLeftRadius: 4, padding: SPACING.md, ...SHADOW.sm },
    assistantBubbleText: { fontSize: FONT_SIZE.md, color: colors.textPrimary, lineHeight: 24 },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: SPACING.xs, gap: SPACING.sm },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: SPACING.xs },
    actionBtnText: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    actionBtnSaved: { color: colors.primary },
    typingRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: SPACING.sm, paddingHorizontal: SPACING.md },
    typingBubble: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, borderBottomLeftRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, ...SHADOW.sm },
    typingText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    inputArea: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
    input: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, paddingVertical: SPACING.sm },
    searchButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primary },
    searchButtonDisabled: { backgroundColor: colors.border },
    searchButtonText: { fontSize: FONT_SIZE.sm, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.semibold },
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2, gap: SPACING.lg },
    emptyDescription: { fontSize: FONT_SIZE.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },
    suggestedContainer: { width: '100%', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginTop: SPACING.sm },
    suggestedBtn: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SHADOW.sm },
    suggestedBtnText: { fontSize: FONT_SIZE.sm, color: colors.textPrimary, flex: 1 },
    // 모아보기 (인사이트 + 저장된 답변)
    logScroll: { flex: 1 },
    logContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
    logSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
    logSectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textSecondary, marginBottom: SPACING.sm },
    logCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
    logCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
    logQuery: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, flex: 1, marginRight: SPACING.sm },
    logAnswer: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20 },
    logFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xs },
    logDate: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    logDeleteBtn: { padding: SPACING.xs },
    logShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: SPACING.xs },
    logShareBtnText: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    // 모달
    typeModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    typeModalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: SPACING.md, paddingBottom: SPACING.xxl },
    typeModalTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, textAlign: 'center', marginBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
    typeModalOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md },
    typeModalOptionLabel: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
    typeModalOptionDesc: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginTop: 2 },
    typeModalDivider: { height: 1, backgroundColor: colors.divider, marginHorizontal: SPACING.lg },
    typeModalCancel: { alignItems: 'center', paddingTop: SPACING.md },
    typeModalCancelText: { fontSize: FONT_SIZE.md, color: colors.textTertiary },
  });
}

function buildMarkdownStyles(colors: AppColors) {
  return {
    body: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 20 },
    heading2: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginTop: SPACING.sm, marginBottom: SPACING.xs },
    heading3: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, marginTop: SPACING.xs, marginBottom: 2 },
    bullet_list_icon: { color: colors.textTertiary, marginTop: 4 },
    strong: { color: colors.textPrimary, fontWeight: FONT_WEIGHT.semibold },
    paragraph: { marginTop: 0, marginBottom: SPACING.xs },
  };
}

function formatRelativeDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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

function AssistantBubble({ message, query, onSave, styles, colors }: {
  message: ChatMessage;
  query?: string;
  onSave?: (query: string, answer: string) => Promise<void>;
  styles: ReturnType<typeof createStyles>;
  colors: AppColors;
}) {
  const [saved, setSaved] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      const result = await Share.share({ message: message.text });
      if (result.action === Share.dismissedAction) return;
    } catch {
      await Clipboard.setStringAsync(message.text);
      Alert.alert('복사됨', '클립보드에 복사했어요.');
    }
  }, [message.text]);

  const handleSave = useCallback(async () => {
    if (!onSave || saved) return;
    await onSave(query ?? '', message.text);
    setSaved(true);
  }, [onSave, query, message.text, saved]);

  return (
    <Animated.View entering={FadeInDown} style={styles.assistantBubbleRow}>
      <View style={styles.assistantBubble}>
        <Text style={styles.assistantBubbleText}>{message.text}</Text>
        <View style={styles.actionRow}>
          {onSave && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleSave} activeOpacity={0.7} disabled={saved}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={14} color={saved ? colors.primary : colors.textTertiary} />
              <Text style={[styles.actionBtnText, saved && styles.actionBtnSaved]}>{saved ? '저장됨' : '저장'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.actionBtnText}>공유</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// 모아보기 탭 — AI 인사이트 + 항해일지 생성 + 저장된 답변 통합
function CollectionFeed({ childId, colors, styles, isAbsorbing }: {
  childId: string | undefined;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
  isAbsorbing: boolean;
}) {
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(new Set());
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const markdownStyles = useMemo(() => buildMarkdownStyles(colors), [colors]);

  const loadAll = useCallback(async () => {
    if (!childId) { setIsLoading(false); return; }
    try {
      const [pages, logsData] = await Promise.all([
        getWikiPages(childId),
        getSearchLogs(childId),
      ]);
      setWikiPages(pages.filter(p => p.slug !== 'wiki-index'));
      setLogs(logsData);
    } catch {}
    finally { setIsLoading(false); }
  }, [childId]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (!isAbsorbing) loadAll(); }, [isAbsorbing, loadAll]);

  const togglePage = useCallback((key: string) => {
    setExpandedPageIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleLog = useCallback((id: number) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleGenerateReport = useCallback(async (type: VoyageReportType) => {
    if (!childId || isGenerating) return;
    setShowTypeModal(false);
    setIsGenerating(true);
    try {
      await generateVoyageReport(childId, type);
      await loadAll();
    } catch (e: any) {
      if (e?.message === 'OFFLINE') Alert.alert('오프라인', '네트워크에 연결되어 있지 않아요.');
      else if (e?.message === 'NO_RECORDS') Alert.alert('기록 없음', '분석할 기록이 없어요.');
      else Alert.alert('오류', '항해일지 생성 중 오류가 발생했어요.');
    } finally {
      setIsGenerating(false);
    }
  }, [childId, isGenerating, loadAll]);

  const handleDeleteLog = useCallback((id: number) => {
    Alert.alert('삭제', '저장된 답변을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteSearchLog(id);
        setLogs(prev => prev.filter(l => l.id !== id));
      }},
    ]);
  }, []);

  const handleShareLog = useCallback(async (log: SearchLog) => {
    const text = `Q. ${log.query}\n\n${log.answer}`;
    try {
      await Share.share({ message: text });
    } catch {
      await Clipboard.setStringAsync(text);
      Alert.alert('복사됨', '클립보드에 복사했어요.');
    }
  }, []);

  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>;

  const hasInsights = wikiPages.length > 0;
  const hasLogs = logs.length > 0;
  const isEmpty = !hasInsights && !hasLogs;

  return (
    <>
      <Modal visible={showTypeModal} transparent animationType="slide" onRequestClose={() => setShowTypeModal(false)}>
        <TouchableOpacity style={styles.typeModalOverlay} activeOpacity={1} onPress={() => setShowTypeModal(false)}>
          <View style={styles.typeModalSheet}>
            <Text style={styles.typeModalTitle}>어떤 항해일지를 만들까요?</Text>
            {VOYAGE_REPORT_OPTIONS.map((opt, i) => (
              <React.Fragment key={opt.type}>
                {i > 0 && <View style={styles.typeModalDivider} />}
                <TouchableOpacity style={styles.typeModalOption} onPress={() => handleGenerateReport(opt.type)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.typeModalOptionLabel}>{opt.label}</Text>
                    <Text style={styles.typeModalOptionDesc}>{opt.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
            <View style={[styles.typeModalDivider, { marginTop: SPACING.sm }]} />
            <TouchableOpacity style={styles.typeModalCancel} onPress={() => setShowTypeModal(false)}>
              <Text style={styles.typeModalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.logScroll} contentContainerStyle={{ paddingBottom: SPACING.xxl, paddingTop: SPACING.sm }} showsVerticalScrollIndicator={false}>
        {hasInsights && (
          <View style={styles.insightSection}>
            <View style={styles.insightSectionHeader}>
              <Text style={styles.insightSectionTitle}>AI 인사이트</Text>
            </View>
            {wikiPages.map(page => {
              const key = `p-${page.id}`;
              const isExpanded = expandedPageIds.has(key);
              // 레거시 데이터 정화: body에 VISUAL_DATA 원문이 남아있으면 파싱해 분리
              const needsCleanup = page.body.trimStart().startsWith('VISUAL_DATA:');
              const cleaned = needsCleanup ? extractVisualDataBlock(page.body) : null;
              const displayBody = cleaned?.body ?? page.body;
              const displayVisualData = cleaned?.visualData ?? page.visualData;
              return (
                <TouchableOpacity key={page.id} style={styles.insightCard} onPress={() => togglePage(key)} activeOpacity={0.85}>
                  <View style={styles.insightCardHeader}>
                    <Text style={styles.insightTypeLabel}>{getWikiTypeLabel(page)}</Text>
                  </View>
                  <Text style={styles.insightTitle}>{page.title}</Text>
                  {displayVisualData && (() => {
                    try {
                      const parsed = JSON.parse(displayVisualData);
                      const rawPatterns = Array.isArray(parsed?.patterns) ? parsed.patterns : null;
                      if (!rawPatterns || rawPatterns.length === 0) return null;
                      const valid = rawPatterns.filter((p: any) =>
                        typeof p?.emoji === 'string' && typeof p?.label === 'string' && typeof p?.count === 'number'
                      ) as { emoji: string; label: string; count: number }[];
                      if (valid.length === 0) return null;
                      return (
                        <View style={styles.visualChipsContainer}>
                          {valid.map((p, i) => (
                            <View key={i} style={styles.visualChip}>
                              <Text style={styles.visualChipText}>{p.emoji} {p.label} {p.count}회</Text>
                            </View>
                          ))}
                        </View>
                      );
                    } catch { return null; }
                  })()}
                  {isExpanded
                    ? <Markdown style={markdownStyles}>{displayBody}</Markdown>
                    : <Text style={styles.insightBody} numberOfLines={3}>{displayBody}</Text>
                  }
                  <Text style={styles.insightDate}>{formatRelativeDate(page.updatedAt)} · {isExpanded ? '접기' : '전체 보기'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[styles.generateBtn, isGenerating && { opacity: 0.7 }]}
          onPress={() => setShowTypeModal(true)}
          disabled={isGenerating}
          activeOpacity={0.85}
        >
          {isGenerating
            ? <ActivityIndicator size="small" color={colors.textSecondary} />
            : <Ionicons name="add-circle-outline" size={16} color={colors.textSecondary} />
          }
          <Text style={styles.generateBtnText}>{isGenerating ? '생성 중...' : '항해일지 생성'}</Text>
        </TouchableOpacity>

        {hasLogs && (
          <>
            <View style={styles.divider} />
            <View style={styles.logSection}>
              <Text style={styles.logSectionTitle}>저장된 답변</Text>
              {logs.map(log => {
                const isExpanded = expandedLogIds.has(log.id);
                return (
                  <TouchableOpacity key={log.id} style={styles.logCard} onPress={() => toggleLog(log.id)} activeOpacity={0.85}>
                    <View style={styles.logCardHeader}>
                      <Text style={styles.logQuery} numberOfLines={isExpanded ? undefined : 1}>{log.query}</Text>
                      <TouchableOpacity style={styles.logDeleteBtn} onPress={() => handleDeleteLog(log.id)}>
                        <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.logAnswer} numberOfLines={isExpanded ? undefined : 4}>{log.answer}</Text>
                    <View style={styles.logFooter}>
                      <Text style={styles.logDate}>{formatRelativeDate(log.createdAt)} · {isExpanded ? '접기' : '전체 보기'}</Text>
                      <TouchableOpacity style={styles.logShareBtn} onPress={() => handleShareLog(log)}>
                        <Ionicons name="share-outline" size={14} color={colors.textTertiary} />
                        <Text style={styles.logShareBtnText}>공유</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {isEmpty && !isGenerating && (
          <View style={[styles.emptyState, { paddingTop: SPACING.xxl }]}>
            <MaterialCommunityIcons name="notebook-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyDescription}>아직 모아둔 것이 없어요.{'\n'}물어보기에서 질문하거나{'\n'}항해일지를 만들어보세요.</Text>
          </View>
        )}
      </ScrollView>
    </>
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
  const [isAbsorbing, setIsAbsorbing] = useState(false);
  // 현재 대화에서 마지막 질문 추적 (저장 시 query 전달용)
  const lastQueryRef = useRef<string>('');

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setMessages([]);
  }, [activeChild?.id]);

  useFocusEffect(useCallback(() => {
    if (activeChild?.id) {
      shouldAbsorb(activeChild.id).then(ready => {
        if (ready) {
          setIsAbsorbing(true);
          runAbsorb(activeChild.id!).catch(() => {}).finally(() => setIsAbsorbing(false));
        }
      }).catch(() => {});
    }
  }, [activeChild?.id]));

  const handleSearch = useCallback(async (overrideText?: string) => {
    const trimmed = (overrideText ?? query).trim();
    if (!trimmed) return;
    lastQueryRef.current = trimmed;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed, createdAt: Date.now() };
    const history = messages.slice(-8).map(m => ({ role: m.role, text: m.text }));
    setQuery('');
    setMessages(prev => [...prev, userMsg]);
    setIsSearching(true);
    try {
      const searchResult = await searchRecords(trimmed, activeChild?.id, history, activeChild?.name);
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: searchResult.answer, createdAt: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: '검색 중 오류가 발생했어요. 다시 시도해 주세요.', createdAt: Date.now() }]);
    } finally {
      setIsSearching(false);
    }
  }, [query, messages, activeChild?.id, activeChild?.name]);

  const handleSaveAnswer = useCallback(async (q: string, answer: string) => {
    await createSearchLog(activeChild?.id ?? null, q, answer);
  }, [activeChild?.id]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length, isSearching]);

  // 메시지 렌더링 — 각 assistant 메시지에 직전 user 질문 연결
  const messagesWithQuery = useMemo(() => {
    return messages.map((msg, idx) => {
      if (msg.role !== 'assistant') return { msg, query: '' };
      const prev = messages[idx - 1];
      return { msg, query: prev?.role === 'user' ? prev.text : '' };
    });
  }, [messages]);

  const renderMessage = useCallback(({ item }: { item: { msg: ChatMessage; query: string } }) => {
    if (item.msg.role === 'user') return <UserBubble message={item.msg} styles={styles} />;
    return (
      <AssistantBubble
        message={item.msg}
        query={item.query}
        onSave={handleSaveAnswer}
        styles={styles}
        colors={colors}
      />
    );
  }, [styles, colors, handleSaveAnswer]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>AI 등대</Text>
        {activeTab === 'chat'
          ? <Text style={styles.subtitle}>무엇이든 물어보세요.{'\n'}바다가 기억하고 있습니다.</Text>
          : <Text style={styles.subtitle}>기록의 패턴과 저장한 답변을{'\n'}한 곳에 모았어요.</Text>
        }
      </View>

      <View style={styles.segmentRow}>
        {(['chat', 'log'] as ActiveTab[]).map(tab => (
          <TouchableOpacity key={tab} style={[styles.segmentBtn, activeTab === tab && styles.segmentBtnActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.segmentBtnText, activeTab === tab && styles.segmentBtnTextActive]}>
              {tab === 'chat' ? '물어보기' : '모아보기'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'log' ? (
        <CollectionFeed childId={activeChild?.id} colors={colors} styles={styles} isAbsorbing={isAbsorbing} />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex} keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}>
          {messages.length === 0 && !isSearching ? (
            <ScrollView style={styles.messageList} contentContainerStyle={{ paddingBottom: SPACING.xl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={[styles.emptyState, { paddingTop: SPACING.xxl }]}>
                <MaterialCommunityIcons name="lighthouse-on" size={64} color={colors.primary} />
                <Text style={styles.emptyDescription}>기록된 내용을 바탕으로{'\n'}무엇이든 물어보세요.</Text>
                <View style={styles.suggestedContainer}>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <TouchableOpacity key={q} style={styles.suggestedBtn} onPress={() => handleSearch(q)} activeOpacity={0.75}>
                      <Text style={styles.suggestedBtnText}>{q}</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              ref={flatListRef}
              style={styles.messageList}
              contentContainerStyle={styles.messageListContent}
              data={messagesWithQuery}
              keyExtractor={item => item.msg.id}
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
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              multiline={false}
              accessibilityLabel="검색어 입력"
            />
            <TouchableOpacity onPress={() => handleSearch()} style={[styles.searchButton, (!query.trim() || isSearching) && styles.searchButtonDisabled]} disabled={!query.trim() || isSearching} accessibilityLabel="검색" accessibilityRole="button">
              {isSearching ? <ActivityIndicator size="small" color={colors.textOnPrimary} /> : <Text style={styles.searchButtonText}>검색</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
