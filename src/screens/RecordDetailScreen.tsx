import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  type AppColors,
} from '../constants/theme';
import type { RecordWithTags, Tag } from '../types/record';
import { getRecordById, updateRecord, deleteRecord } from '../db';
import { deleteAudioFile } from '../services/audioRecorder';
import { processWithAI, createFallbackResult } from '../services/aiProcessor';
import { setTagsForRecord, getAllTags } from '../db/tagsDao';
import { onQueueProcessed } from '../services/offlineQueue';
import { useChild } from '../context/ChildContext';
import TagChip from '../components/TagChip';
import TimePickerModal from '../components/TimePickerModal';

const TAG_CATEGORIES: { label: string; tags: string[] }[] = [
  { label: '치료', tags: ['#치료', '#언어치료', '#작업치료', '#감각통합치료', '#ABA치료', '#놀이치료', '#물리치료', '#뇌파치료', '#한의학'] },
  { label: '투약', tags: ['#투약', '#처방약', '#보충제', '#동종요법', '#패치'] },
  { label: '신체/증상', tags: ['#의료', '#배변', '#수면', '#감각', '#각성', '#건강'] },
  { label: '행동/정서', tags: ['#행동', '#기분', '#상동행동', '#자해', '#공격행동'] },
  { label: '기타', tags: ['#발달', '#검사', '#상담', '#교육기관', '#식단', '#일상'] },
];
const ALL_CATEGORY_TAG_NAMES = new Set(TAG_CATEGORIES.flatMap(c => c.tags));

const PARENT_CHILD_MAP: Record<string, string[]> = {
  '#치료': ['#언어치료', '#작업치료', '#감각통합치료', '#ABA치료', '#놀이치료', '#물리치료', '#뇌파치료', '#한의학'],
  '#투약': ['#처방약', '#보충제', '#동종요법', '#패치'],
  '#행동': ['#기분', '#상동행동', '#자해', '#공격행동'],
};
const CHILD_PARENT_MAP: Record<string, string> = {};
for (const [parent, children] of Object.entries(PARENT_CHILD_MAP)) {
  for (const child of children) CHILD_PARENT_MAP[child] = parent;
}

interface RecordDetailScreenProps {
  route: any;
  navigation: any;
}

const STRUCTURED_DATA_LABELS: Record<string, string> = {
  // 공통
  event_type: '유형',
  // 행동
  antecedent: '선행 상황',
  behavior: '행동',
  consequence: '결과',
  // 발달
  domain: '발달 영역',
  ontology_code: '영역 코드',
  is_milestone: '이정표',
  // 의료
  temperature: '체온',
  medication: '투약',
  dose: '용량',
  frequency: '횟수',
  // ATEC
  ATEC_total: 'ATEC 총점',
  ATEC_language: 'ATEC 언어',
  ATEC_social: 'ATEC 사회성',
  ATEC_sensory: 'ATEC 감각·인지',
  ATEC_motor: 'ATEC 건강·신체',
  // 기타 검사
  CARS_total: 'CARS 총점',
  score: '점수',
  test_name: '검사명',
  assessment_date: '검사일',
  date: '날짜',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  behavioral_incident: '행동 사건',
  medical: '의료',
  developmental: '발달 관찰',
  daily: '일상',
};

function formatStructuredValue(key: string, value: string | number | boolean): string {
  if (key === 'event_type') return EVENT_TYPE_LABELS[String(value)] ?? String(value);
  if (key === 'is_milestone') return value ? '예' : '아니오';
  return String(value);
}

function labelForKey(key: string): string {
  return STRUCTURED_DATA_LABELS[key] ?? key;
}

function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: FONT_SIZE.lg, color: colors.textSecondary, marginBottom: SPACING.md },
    backLink: { padding: SPACING.sm },
    backLinkText: { fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    headerButton: { padding: SPACING.sm },
    headerButtonText: { fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
    deleteButtonText: { fontSize: FONT_SIZE.md, color: colors.error, fontWeight: FONT_WEIGHT.medium },
    moreButtonText: { fontSize: 22, color: colors.textSecondary, lineHeight: 26 },
    scrollView: { flex: 1 },
    scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
    dateSection: { marginBottom: SPACING.md },
    dateText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary },
    timeText: { fontSize: FONT_SIZE.sm, color: colors.textTertiary, marginTop: SPACING.xs - 2 },
    pendingBanner: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: colors.accentLight, padding: SPACING.md,
      borderRadius: BORDER_RADIUS.sm, marginBottom: SPACING.md,
    },
    pendingBannerText: { fontSize: FONT_SIZE.sm, color: colors.accent, fontWeight: FONT_WEIGHT.medium, flex: 1 },
    tagsSection: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
    section: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    sectionTitle: {
      fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textSecondary,
      marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    editButton: { paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary },
    editButtonText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, color: colors.primary },
    summaryText: { fontSize: FONT_SIZE.md, color: colors.textPrimary, lineHeight: FONT_SIZE.md * 1.6 },
    summaryInput: {
      fontSize: FONT_SIZE.md, color: colors.textPrimary, lineHeight: FONT_SIZE.md * 1.6,
      borderWidth: 1, borderColor: colors.primary, borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, minHeight: 80,
    },
    table: { borderRadius: BORDER_RADIUS.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    tableRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2 },
    tableRowEven: { backgroundColor: colors.surfaceSecondary },
    tableKey: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
    tableValue: { flex: 2, fontSize: FONT_SIZE.sm, color: colors.textPrimary, textAlign: 'right' },
    rawText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: FONT_SIZE.sm * 1.7 },
    tagEditContainer: { marginBottom: SPACING.md },
    tagEditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    tagEditLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    // 태그 Bottom Sheet
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheetContainer: { backgroundColor: colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, paddingBottom: SPACING.xxl },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.divider, alignSelf: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xs },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
    sheetTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary },
    sheetSaveBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primary },
    sheetSaveBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textOnPrimary },
    categoryTabRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.xs },
    categoryTab: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 1, borderRadius: BORDER_RADIUS.full, backgroundColor: colors.surfaceSecondary },
    categoryTabActive: { backgroundColor: colors.primary },
    categoryTabText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
    categoryTabTextActive: { color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.semibold },
    tagPickerArea: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, minHeight: 120 },
    tagPickerItem: { paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs + 1, borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
    tagPickerItemSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    tagPickerText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    tagPickerTextSelected: { color: colors.primary, fontWeight: FONT_WEIGHT.medium },
    // 시간 picker modal
  });
}

export default function RecordDetailScreen({ route, navigation }: RecordDetailScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { recordId } = route.params as { recordId: string };
  const { activeChild } = useChild();

  const [record, setRecord] = useState<RecordWithTags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingRawText, setIsEditingRawText] = useState(false);
  const [editedRawText, setEditedRawText] = useState('');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [editingTagIds, setEditingTagIds] = useState<number[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadRecord = useCallback(async () => {
    try {
      const data = await getRecordById(recordId);
      if (data) { setRecord(data); setEditedRawText(data.rawText ?? ''); }
    } catch (error) {
      console.error('Failed to load record:', error);
    } finally {
      setIsLoading(false);
    }
  }, [recordId]);

  const handleConfirmTime = useCallback(async (hour: number, minute: number) => {
    if (!record) return;
    setShowTimePicker(false);
    const d = new Date(record.createdAt);
    d.setHours(hour, minute, 0, 0);
    try {
      await updateRecord(record.id, { createdAt: d.getTime() });
      await loadRecord();
    } catch {
      Alert.alert('오류', '시간 저장에 실패했습니다');
    }
  }, [record, loadRecord]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  // offlineQueue 처리 완료 시 자동 갱신 (aiPending 배너 해제)
  useEffect(() => {
    const unsubscribe = onQueueProcessed((count) => {
      if (count > 0) loadRecord();
    });
    return unsubscribe;
  }, [loadRecord]);

  const handleEditRawText = useCallback(async () => {
    if (!record) return;
    if (!isEditingRawText) {
      setIsEditingRawText(true);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
      return;
    }
    const trimmed = editedRawText.trim();
    if (!trimmed || trimmed === record.rawText) { setEditedRawText(record.rawText ?? ''); setIsEditingRawText(false); return; }
    setIsEditingRawText(false);
    setIsReprocessing(true);
    try {
      let aiResult;
      try { aiResult = await processWithAI(trimmed); } catch { aiResult = createFallbackResult(trimmed); }
      await updateRecord(record.id, { rawText: trimmed, summary: aiResult.summary, structuredData: aiResult.structuredData, aiPending: false });
      await setTagsForRecord(record.id, aiResult.tags, record.childId ?? undefined);
      await loadRecord();
    } catch (error) {
      console.error('Failed to reprocess:', error);
      Alert.alert('오류', '재처리에 실패했습니다');
    } finally {
      setIsReprocessing(false);
    }
  }, [isEditingRawText, record, editedRawText, loadRecord]);

  const handleDelete = useCallback(() => {
    if (!record) return;
    Alert.alert('기록 삭제', '이 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        setIsDeleting(true);
        try {
          if (record.audioPath) await deleteAudioFile(record.audioPath);
          await deleteRecord(record.id);
          navigation.goBack();
        } catch {
          Alert.alert('오류', '기록 삭제에 실패했습니다');
          setIsDeleting(false);
        }
      }},
    ]);
  }, [record, navigation]);

  const handleStartEditTags = useCallback(async () => {
    if (!record) return;
    try {
      const all = await getAllTags(activeChild?.id);
      setAvailableTags(all);
      setEditingTagIds(record.tags.map((t) => t.id));
      setActiveCategoryTab(0);
      setIsEditingTags(true);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }, [record, activeChild?.id]);

  // 태그 토글: 자식 선택 시 부모 자동 추가, 부모 해제 시 자식 전체 해제
  const handleToggleTag = useCallback((tag: Tag) => {
    setEditingTagIds(prev => {
      const selected = prev.includes(tag.id);
      if (selected) {
        // 해제: 부모 태그면 자식도 함께 해제
        const children = PARENT_CHILD_MAP[tag.name] ?? [];
        const childIds = availableTags.filter(t => children.includes(t.name)).map(t => t.id);
        return prev.filter(id => id !== tag.id && !childIds.includes(id));
      } else {
        // 선택: 자식 태그면 부모도 함께 선택
        const parentName = CHILD_PARENT_MAP[tag.name];
        const parentTag = parentName ? availableTags.find(t => t.name === parentName) : null;
        const toAdd = parentTag && !prev.includes(parentTag.id)
          ? [tag.id, parentTag.id]
          : [tag.id];
        return [...prev, ...toAdd];
      }
    });
  }, [availableTags]);

  const handleSaveTags = useCallback(async () => {
    if (!record) return;
    setIsSavingTags(true);
    try {
      const selectedNames = availableTags.filter((t) => editingTagIds.includes(t.id)).map((t) => t.name);
      await setTagsForRecord(record.id, selectedNames, activeChild?.id);
      await loadRecord();
      setIsEditingTags(false);
    } catch (error) {
      console.error('Failed to save tags:', error);
      Alert.alert('오류', '태그 저장에 실패했습니다');
    } finally {
      setIsSavingTags(false);
    }
  }, [record, availableTags, editingTagIds, activeChild?.id, loadRecord]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>기록을 찾을 수 없습니다</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backLinkText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.headerButton, isDeleting && { opacity: 0.4 }]}
          disabled={isDeleting}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.moreButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{formatFullDate(record.createdAt)}</Text>
          <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.6}>
            <Text style={styles.timeText}>{formatTime(record.createdAt)}</Text>
          </TouchableOpacity>
        </View>

        {record.aiPending && (
          <View style={styles.pendingBanner}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.pendingBannerText}>AI가 기록을 분석하고 있습니다...</Text>
          </View>
        )}

        {/* 태그 편집 Bottom Sheet */}
        <Modal visible={isEditingTags} transparent animationType="slide" onRequestClose={() => setIsEditingTags(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setIsEditingTags(false)}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <View style={styles.sheetContainer}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>태그 선택</Text>
                  <TouchableOpacity onPress={handleSaveTags} style={styles.sheetSaveBtn} disabled={isSavingTags}>
                    {isSavingTags
                      ? <ActivityIndicator size="small" color={colors.textOnPrimary} />
                      : <Text style={styles.sheetSaveBtnText}>저장</Text>
                    }
                  </TouchableOpacity>
                </View>
                {/* 카테고리 탭 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabRow}>
                  {[...TAG_CATEGORIES.map(c => c.label), '내 태그'].map((label, idx) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.categoryTab, activeCategoryTab === idx && styles.categoryTabActive]}
                      onPress={() => setActiveCategoryTab(idx)}
                    >
                      <Text style={[styles.categoryTabText, activeCategoryTab === idx && styles.categoryTabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* 태그 칩 */}
                <View style={styles.tagPickerArea}>
                  {(() => {
                    const isCustomTab = activeCategoryTab === TAG_CATEGORIES.length;
                    const categoryTagNames = isCustomTab
                      ? null
                      : TAG_CATEGORIES[activeCategoryTab]?.tags;
                    const displayTags = isCustomTab
                      ? availableTags.filter(t => !ALL_CATEGORY_TAG_NAMES.has(t.name))
                      : availableTags.filter(t => categoryTagNames?.includes(t.name));
                    return displayTags.map(tag => {
                      const selected = editingTagIds.includes(tag.id);
                      return (
                        <TouchableOpacity
                          key={tag.id}
                          style={[styles.tagPickerItem, selected && styles.tagPickerItemSelected]}
                          onPress={() => handleToggleTag(tag)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.tagPickerText, selected && styles.tagPickerTextSelected]}>{tag.name}</Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <TouchableOpacity activeOpacity={0.8} onLongPress={handleStartEditTags} delayLongPress={400}>
          <View style={styles.tagEditContainer}>
            <View style={styles.tagEditHeader}>
              <Text style={styles.tagEditLabel}>태그</Text>
            </View>
            <View style={styles.tagsSection}>
              {record.tags.length > 0
                ? record.tags.map((tag) => <TagChip key={tag.id} name={tag.name} size="md" />)
                : <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textTertiary }}>태그 없음</Text>
              }
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>요약</Text>
          <Text style={styles.summaryText}>{record.summary}</Text>
        </View>

        {record.structuredData && Object.keys(record.structuredData).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>상세 데이터</Text>
            <View style={styles.table}>
              {Object.entries(record.structuredData).map(([key, value], index) => (
                <View key={key} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                  <Text style={styles.tableKey}>{labelForKey(key)}</Text>
                  <Text style={styles.tableValue}>{value !== undefined ? formatStructuredValue(key, value) : ''}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={!isEditingRawText ? handleEditRawText : undefined}
          delayLongPress={400}
        >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>원본 텍스트</Text>
            {isReprocessing && <ActivityIndicator size="small" color={colors.primary} />}
            {isEditingRawText && !isReprocessing && (
              <TouchableOpacity onPress={handleEditRawText} style={styles.editButton}>
                <Text style={styles.editButtonText}>저장 후 AI 재분석</Text>
              </TouchableOpacity>
            )}
          </View>
          {isEditingRawText ? (
            <TextInput
              style={styles.summaryInput}
              value={editedRawText}
              onChangeText={setEditedRawText}
              multiline
              autoFocus
              textAlignVertical="top"
              placeholderTextColor={colors.textTertiary}
            />
          ) : (
            <Text style={styles.rawText}>{record.rawText || '원본 텍스트가 없습니다.'}</Text>
          )}
        </View>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      <TimePickerModal
        visible={showTimePicker}
        hour={record ? new Date(record.createdAt).getHours() : 0}
        minute={record ? new Date(record.createdAt).getMinutes() : 0}
        title="시간 수정"
        onConfirm={handleConfirmTime}
        onCancel={() => setShowTimePicker(false)}
      />
    </SafeAreaView>
  );
}
