import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import WaveLoader from '../components/WaveLoader';
import { searchRecords } from '../services/searchPipeline';
import { shouldAbsorb, runAbsorb, generateVoyageReport, getAbsorbProgress, VOYAGE_REPORT_OPTIONS, type VoyageReportType } from '../services/absorbService';
import { runLint } from '../services/wikiLintService';
import { createSearchLog, getSearchLogs, deleteSearchLog } from '../db/searchLogsDao';
import { getWikiPages, deleteWikiPage } from '../db/wikiDao';
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
import type { ChatMessage, SearchLog, WikiPage, LintResult } from '../types/record';

type ActiveTab = 'chat' | 'log';

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
    absorbBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.accentLight, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.sm },
    absorbBannerText: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.accent, fontWeight: FONT_WEIGHT.medium },
    lintBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.surfaceSecondary, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.sm },
    lintBannerText: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    lintResultCard: { backgroundColor: colors.surface, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.sm, ...SHADOW.sm },
    lintResultTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.xs },
    lintIssueText: { fontSize: FONT_SIZE.xs, color: colors.textSecondary, lineHeight: 18, marginBottom: 2 },
    lintSuggestionText: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, lineHeight: 18, marginBottom: 2 },
    logScroll: { flex: 1 },
    logContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
    sectionHeader: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm, marginTop: SPACING.md },
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
    qaCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
    qaQuery: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.xs },
    qaAnswer: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20 },
    qaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xs },
    qaDate: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    qaDeleteBtn: { padding: SPACING.xs },
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2, gap: SPACING.lg },
    emptyDescription: { fontSize: FONT_SIZE.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },
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
    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: colors.primary, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.sm },
    generateBtnText: { fontSize: FONT_SIZE.sm, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.semibold },
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

function UserBubble({ message, styles }: { message: ChatMessage; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.userBubbleRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{message.text}</Text>
      </View>
    </View>
  );
}

function AssistantBubble({ message, styles }: { message: ChatMessage; styles: ReturnType<typeof createStyles> }) {
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
  const [allWikiPages, setAllWikiPages] = useState<WikiPage[]>([]);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLinting, setIsLinting] = useState(false);
  const [lintResult, setLintResult] = useState<LintResult | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [absorbProgress, setAbsorbProgress] = useState<{ ready: boolean; current: number; needed: number } | null>(null);

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
      const [pages, l, progress] = await Promise.all([
        getWikiPages(childId),
        getSearchLogs(childId),
        getAbsorbProgress(childId),
      ]);
      setAllWikiPages(pages.filter(p => p.slug !== 'wiki-index'));
      setLogs(l);
      setAbsorbProgress(progress);
    } catch (e) {
      console.error('[VoyageLogFeed] 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [childId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!isAbsorbing) loadData();
  }, [isAbsorbing, loadData]);

  // voyage/로 시작하는 수동 생성 항해일지 vs 자동 위키 페이지
  const voyagePages = allWikiPages.filter(p => p.slug.startsWith('voyage/'));
  const wikiPages = allWikiPages.filter(p => !p.slug.startsWith('voyage/'));

  const handleDeleteWikiPage = useCallback((id: number) => {
    Alert.alert('삭제', '이 항목을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteWikiPage(id);
        setAllWikiPages(prev => prev.filter(p => p.id !== id));
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

  const handleLint = useCallback(async () => {
    if (!childId || isLinting) return;
    setIsLinting(true);
    setLintResult(null);
    try {
      const result = await runLint(childId);
      setLintResult(result);
    } catch {
      setLintResult({ issues: [], suggestions: ['건강 체크 중 오류가 발생했어요.'] });
    } finally {
      setIsLinting(false);
    }
  }, [childId, isLinting]);

  const handleGenerateReport = useCallback(async (type: VoyageReportType) => {
    if (!childId || isGenerating) return;
    setShowTypeModal(false);
    setIsGenerating(true);
    try {
      await generateVoyageReport(childId, type);
      await loadData();
    } catch (e: any) {
      if (e?.message === 'OFFLINE') Alert.alert('오프라인', '네트워크에 연결되어 있지 않아요.');
      else if (e?.message === 'NO_RECORDS') Alert.alert('기록 없음', '분석할 기록이 없어요.');
      else Alert.alert('오류', '항해일지 생성 중 오류가 발생했어요.');
    } finally {
      setIsGenerating(false);
    }
  }, [childId, isGenerating, loadData]);

  const markdownStyles = useMemo(() => buildMarkdownStyles(colors), [colors]);

  const renderInsightCard = useCallback((page: WikiPage) => {
    const key = `p-${page.id}`;
    const expanded = expandedIds.has(key);
    return (
      <TouchableOpacity key={page.id} style={styles.insightCard} onPress={() => toggleExpand(key)} activeOpacity={0.85}>
        <View style={styles.insightCardHeader}>
          <Text style={styles.insightTypeLabel}>{getWikiTypeLabel(page)}</Text>
          <TouchableOpacity style={styles.insightDeleteBtn} onPress={() => handleDeleteWikiPage(page.id)}>
            <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.insightTitle}>{page.title}</Text>
        {page.visualData && (() => {
          try {
            const { patterns } = JSON.parse(page.visualData) as { patterns: { emoji: string; label: string; count: number }[] };
            if (!patterns || patterns.length === 0) return null;
            return (
              <View style={styles.visualChipsContainer}>
                {patterns.map((p, i) => (
                  <View key={i} style={styles.visualChip}>
                    <Text style={styles.visualChipText}>{p.emoji} {p.label} {p.count}회</Text>
                  </View>
                ))}
              </View>
            );
          } catch { return null; }
        })()}
        {expanded
          ? <Markdown style={markdownStyles}>{page.body}</Markdown>
          : <Text style={styles.insightBody} numberOfLines={4}>{page.body}</Text>
        }
        <Text style={styles.insightDate}>{formatRelativeDate(page.updatedAt)} · {expanded ? '접기' : '전체 보기'}</Text>
      </TouchableOpacity>
    );
  }, [expandedIds, toggleExpand, handleDeleteWikiPage, styles, colors, markdownStyles]);

  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>;

  const isEmpty = voyagePages.length === 0 && logs.length === 0 && wikiPages.length === 0;

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

      <ScrollView style={styles.logScroll} contentContainerStyle={styles.logContent} showsVerticalScrollIndicator={false}>
        {/* 항해일지 생성 버튼 (항상 표시) */}
        <TouchableOpacity
          style={[styles.generateBtn, isGenerating && { opacity: 0.7 }]}
          onPress={() => setShowTypeModal(true)}
          disabled={isGenerating}
          activeOpacity={0.85}
        >
          {isGenerating
            ? <ActivityIndicator size="small" color={colors.textOnPrimary} />
            : <Ionicons name="add-circle-outline" size={16} color={colors.textOnPrimary} />
          }
          <Text style={styles.generateBtnText}>{isGenerating ? '생성 중...' : '새 항해일지 생성'}</Text>
        </TouchableOpacity>

        {/* 자동 위키 업데이트 배너 */}
        {showAbsorbBanner && (
          <TouchableOpacity style={styles.absorbBanner} onPress={onAbsorb} disabled={isAbsorbing} activeOpacity={0.8}>
            {isAbsorbing ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="sparkles-outline" size={16} color={colors.accent} />}
            <Text style={styles.absorbBannerText}>
              {isAbsorbing ? '위키를 업데이트하고 있어요...' : '새 기록이 쌓였어요. AI 검색 위키를 업데이트할 수 있어요.'}
            </Text>
            {!isAbsorbing && <Ionicons name="chevron-forward" size={14} color={colors.accent} />}
          </TouchableOpacity>
        )}

        {/* 기록 장려 배지 */}
        {!showAbsorbBanner && absorbProgress && !absorbProgress.ready && absorbProgress.current > 0 && (
          <View style={styles.lintBanner}>
            <Ionicons name="document-text-outline" size={16} color={colors.textTertiary} />
            <Text style={styles.lintBannerText}>
              기록이 <Text style={{ fontWeight: '600', color: colors.textSecondary }}>{absorbProgress.needed - absorbProgress.current}개</Text> 더 쌓이면 AI 위키를 업데이트할 수 있어요
            </Text>
          </View>
        )}

        {/* Lint 버튼 */}
        {wikiPages.length > 0 && (
          <TouchableOpacity style={styles.lintBanner} onPress={handleLint} disabled={isLinting} activeOpacity={0.8}>
            {isLinting ? <ActivityIndicator size="small" color={colors.textTertiary} /> : <Ionicons name="checkmark-circle-outline" size={16} color={colors.textTertiary} />}
            <Text style={styles.lintBannerText}>{isLinting ? '위키 건강 체크 중...' : '위키 건강 체크'}</Text>
          </TouchableOpacity>
        )}

        {/* Lint 결과 */}
        {lintResult && (
          <View style={styles.lintResultCard}>
            {lintResult.issues.length > 0 ? (
              <>
                <Text style={styles.lintResultTitle}>발견된 이슈 {lintResult.issues.length}건</Text>
                {lintResult.issues.map((issue, i) => (
                  <Text key={i} style={styles.lintIssueText}>• {issue.slug}: {issue.reason}</Text>
                ))}
              </>
            ) : (
              <Text style={styles.lintResultTitle}>이슈 없음 ✓</Text>
            )}
            {lintResult.suggestions.length > 0 && (
              <>
                <Text style={[styles.lintResultTitle, { marginTop: SPACING.xs }]}>제안</Text>
                {lintResult.suggestions.map((s, i) => (
                  <Text key={i} style={styles.lintSuggestionText}>• {s}</Text>
                ))}
              </>
            )}
          </View>
        )}

        {isEmpty ? (
          <View style={[styles.emptyState, { paddingTop: SPACING.xxl }]}>
            <MaterialCommunityIcons name="lighthouse-on" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyDescription}>아직 항해일지가 없어요.{'\n'}위에서 새 항해일지를 만들어보세요.</Text>
          </View>
        ) : (
          <>
            {/* 수동 생성 항해일지 (voyage/*) - 날짜별로 쌓임 */}
            {voyagePages.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>항해일지</Text>
                {voyagePages.map(page => renderInsightCard(page))}
              </>
            )}

            {/* 자동 위키 인사이트 (overview/*, entity/*, timeline/*) */}
            {wikiPages.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>AI 인사이트</Text>
                {wikiPages.map(page => renderInsightCard(page))}
              </>
            )}

            {/* 저장된 질문 */}
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
  const [showAbsorbBanner, setShowAbsorbBanner] = useState(false);
  const [isAbsorbing, setIsAbsorbing] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setMessages([]);
    setShowAbsorbBanner(false);
  }, [activeChild?.id]);

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
    } catch {
      Alert.alert('오류', '위키 업데이트에 실패했어요. 네트워크를 확인해주세요.');
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
