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
  SHADOW,
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

interface RecordDetailScreenProps {
  route: any;
  navigation: any;
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
    tagEditButtonRow: { flexDirection: 'row', gap: SPACING.xs },
    tagEditBtn: { paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary },
    tagEditBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, color: colors.primary },
    tagPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
    tagPickerItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs + 1, borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
    tagPickerItemSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    tagPickerText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    tagPickerTextSelected: { color: colors.primary, fontWeight: FONT_WEIGHT.medium },
    // 시간 수정
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs - 2 },
    timeEditBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary },
    timeEditBtnText: { fontSize: FONT_SIZE.xs, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
    // 시간 picker modal
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    pickerContainer: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, width: '85%' },
    pickerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, textAlign: 'center', marginBottom: SPACING.md },
    pickerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.lg },
    pickerLabel: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginBottom: SPACING.xs, textAlign: 'center' },
    pickerArrowRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    pickerArrow: { fontSize: 24, color: colors.primary, paddingHorizontal: SPACING.sm },
    pickerValueText: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, minWidth: 44, textAlign: 'center' },
    pickerButtonRow: { flexDirection: 'row', gap: SPACING.sm },
    pickerCancelBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, alignItems: 'center', backgroundColor: colors.surfaceSecondary },
    pickerCancelText: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    pickerConfirmBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, alignItems: 'center', backgroundColor: colors.primary },
    pickerConfirmText: { fontSize: FONT_SIZE.md, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.semibold },
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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState(0); // 0-23
  const [pickerMinute, setPickerMinute] = useState(0);
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

  const handleOpenTimePicker = useCallback(() => {
    if (!record) return;
    const d = new Date(record.createdAt);
    setPickerHour(d.getHours());
    setPickerMinute(d.getMinutes());
    setShowTimePicker(true);
  }, [record]);

  const handleConfirmTime = useCallback(async () => {
    if (!record) return;
    setShowTimePicker(false);
    const d = new Date(record.createdAt);
    d.setHours(pickerHour, pickerMinute, 0, 0);
    try {
      await updateRecord(record.id, { createdAt: d.getTime() });
      await loadRecord();
    } catch {
      Alert.alert('오류', '시간 저장에 실패했습니다');
    }
  }, [record, pickerHour, pickerMinute, loadRecord]);

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
      setIsEditingTags(true);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }, [record, activeChild?.id]);

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
        >
          <Text style={styles.deleteButtonText}>{isDeleting ? '삭제 중...' : '삭제'}</Text>
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
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(record.createdAt)}</Text>
            <TouchableOpacity style={styles.timeEditBtn} onPress={handleOpenTimePicker}>
              <Text style={styles.timeEditBtnText}>시간 수정</Text>
            </TouchableOpacity>
          </View>
        </View>

        {record.aiPending && (
          <View style={styles.pendingBanner}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.pendingBannerText}>AI가 기록을 분석하고 있습니다...</Text>
          </View>
        )}

        <View style={styles.tagEditContainer}>
          <View style={styles.tagEditHeader}>
            <Text style={styles.tagEditLabel}>태그</Text>
            {isEditingTags ? (
              <View style={styles.tagEditButtonRow}>
                <TouchableOpacity onPress={() => setIsEditingTags(false)} style={styles.tagEditBtn} disabled={isSavingTags}>
                  <Text style={styles.tagEditBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveTags} style={[styles.tagEditBtn, { backgroundColor: colors.primary }]} disabled={isSavingTags}>
                  {isSavingTags ? <ActivityIndicator size="small" color={colors.textOnPrimary} /> : <Text style={[styles.tagEditBtnText, { color: colors.textOnPrimary }]}>저장</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleStartEditTags} style={styles.tagEditBtn}>
                <Text style={styles.tagEditBtnText}>편집</Text>
              </TouchableOpacity>
            )}
          </View>
          {isEditingTags ? (
            <View style={styles.tagPickerRow}>
              {availableTags.map((tag) => {
                const selected = editingTagIds.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tagPickerItem, selected && styles.tagPickerItemSelected]}
                    onPress={() => setEditingTagIds((prev) => selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tagPickerText, selected && styles.tagPickerTextSelected]}>{tag.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.tagsSection}>
              {record.tags.length > 0
                ? record.tags.map((tag) => <TagChip key={tag.id} name={tag.name} size="md" />)
                : <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textTertiary }}>태그 없음</Text>
              }
            </View>
          )}
        </View>

        <View style={[styles.section, SHADOW.sm]}>
          <Text style={styles.sectionTitle}>요약</Text>
          <Text style={styles.summaryText}>{record.summary}</Text>
        </View>

        {record.structuredData && Object.keys(record.structuredData).length > 0 && (
          <View style={[styles.section, SHADOW.sm]}>
            <Text style={styles.sectionTitle}>상세 데이터</Text>
            <View style={styles.table}>
              {Object.entries(record.structuredData).map(([key, value], index) => (
                <View key={key} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                  <Text style={styles.tableKey}>{key}</Text>
                  <Text style={styles.tableValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.section, SHADOW.sm]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>원본 텍스트</Text>
            {isReprocessing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <TouchableOpacity onPress={handleEditRawText} style={styles.editButton}>
                <Text style={styles.editButtonText}>{isEditingRawText ? '저장 후 AI 재분석' : '수정'}</Text>
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
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showTimePicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>시간 수정</Text>
            <View style={styles.pickerRow}>
              <View style={{ alignItems: 'center', gap: SPACING.sm }}>
                <Text style={styles.pickerLabel}>오전/오후</Text>
                <View style={styles.pickerArrowRow}>
                  <TouchableOpacity onPress={() => setPickerHour(h => h < 12 ? h + 12 : h - 12)}>
                    <Text style={styles.pickerArrow}>‹</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerValueText, { minWidth: 48 }]}>{pickerHour < 12 ? '오전' : '오후'}</Text>
                  <TouchableOpacity onPress={() => setPickerHour(h => h < 12 ? h + 12 : h - 12)}>
                    <Text style={styles.pickerArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ alignItems: 'center', gap: SPACING.sm }}>
                <Text style={styles.pickerLabel}>시간</Text>
                <View style={styles.pickerArrowRow}>
                  <TouchableOpacity onPress={() => setPickerHour(h => {
                    const h12 = h % 12 === 0 ? 12 : h % 12;
                    const n = h12 === 1 ? 12 : h12 - 1;
                    return h < 12 ? (n === 12 ? 0 : n) : (n === 12 ? 12 : n + 12);
                  })}>
                    <Text style={styles.pickerArrow}>‹</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerValueText, { minWidth: 40 }]}>{pickerHour % 12 === 0 ? 12 : pickerHour % 12}</Text>
                  <TouchableOpacity onPress={() => setPickerHour(h => {
                    const h12 = h % 12 === 0 ? 12 : h % 12;
                    const n = h12 === 12 ? 1 : h12 + 1;
                    return h < 12 ? (n === 12 ? 0 : n) : (n === 12 ? 12 : n + 12);
                  })}>
                    <Text style={styles.pickerArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ alignItems: 'center', gap: SPACING.sm }}>
                <Text style={styles.pickerLabel}>분</Text>
                <View style={styles.pickerArrowRow}>
                  <TouchableOpacity onPress={() => setPickerMinute(m => (m - 5 + 60) % 60)}>
                    <Text style={styles.pickerArrow}>‹</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerValueText, { minWidth: 40 }]}>{String(pickerMinute).padStart(2, '0')}</Text>
                  <TouchableOpacity onPress={() => setPickerMinute(m => (m + 5) % 60)}>
                    <Text style={styles.pickerArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.pickerButtonRow}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.pickerCancelBtn}>
                <Text style={styles.pickerCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmTime} style={styles.pickerConfirmBtn}>
                <Text style={styles.pickerConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
