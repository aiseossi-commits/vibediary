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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
  type AppColors,
} from '../constants/theme';
import type { RecordWithTags } from '../types/record';
import { getRecordById, updateRecord, deleteRecord } from '../db';
import { playAudio, deleteAudioFile } from '../services/audioRecorder';
import { processWithAI, createFallbackResult } from '../services/aiProcessor';
import { setTagsForRecord } from '../db/tagsDao';
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
    moodText: { fontSize: FONT_SIZE.lg, color: colors.textPrimary },
    table: { borderRadius: BORDER_RADIUS.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    tableRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2 },
    tableRowEven: { backgroundColor: colors.surfaceSecondary },
    tableKey: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
    tableValue: { flex: 2, fontSize: FONT_SIZE.sm, color: colors.textPrimary, textAlign: 'right' },
    audioButton: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: colors.surfaceSecondary, paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md - 2, borderRadius: BORDER_RADIUS.lg,
    },
    audioButtonActive: { backgroundColor: colors.primaryLight },
    audioIcon: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.primary, width: 24, textAlign: 'center' },
    audioButtonText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
    audioButtonTextActive: { color: colors.primaryDark },
    rawText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: FONT_SIZE.sm * 1.7 },
  });
}

export default function RecordDetailScreen({ route, navigation }: RecordDetailScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { recordId } = route.params as { recordId: string };

  const [record, setRecord] = useState<RecordWithTags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingRawText, setIsEditingRawText] = useState(false);
  const [editedRawText, setEditedRawText] = useState('');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
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

  useEffect(() => {
    loadRecord();
    return () => { if (soundRef.current) { soundRef.current.unloadAsync(); soundRef.current = null; } };
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
      await updateRecord(record.id, { rawText: trimmed, summary: aiResult.summary, structuredData: aiResult.structuredData, mood: aiResult.mood, aiPending: false });
      await setTagsForRecord(record.id, aiResult.tags);
      await loadRecord();
    } catch (error) {
      console.error('Failed to reprocess:', error);
      Alert.alert('오류', '재처리에 실패했습니다');
    } finally {
      setIsReprocessing(false);
    }
  }, [isEditingRawText, record, editedRawText, loadRecord]);

  const handlePlayAudio = useCallback(async () => {
    if (!record?.audioPath) return;
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; setIsPlaying(false); return;
      }
      setIsPlaying(true);
      const sound = await playAudio(record.audioPath);
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) { setIsPlaying(false); sound.unloadAsync(); soundRef.current = null; }
      });
    } catch (error) {
      console.error('Failed to play audio:', error); setIsPlaying(false); Alert.alert('오류', '음성 파일을 재생할 수 없습니다');
    }
  }, [record, isPlaying]);

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
          <Text style={styles.timeText}>{formatTime(record.createdAt)}</Text>
        </View>

        {record.aiPending && (
          <View style={styles.pendingBanner}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.pendingBannerText}>AI가 기록을 분석하고 있습니다...</Text>
          </View>
        )}

        {record.tags.length > 0 && (
          <View style={styles.tagsSection}>
            {record.tags.map((tag) => <TagChip key={tag.id} name={tag.name} size="md" />)}
          </View>
        )}

        <View style={[styles.section, SHADOW.sm]}>
          <Text style={styles.sectionTitle}>요약</Text>
          <Text style={styles.summaryText}>{record.summary}</Text>
        </View>

        {record.mood && (
          <View style={[styles.section, SHADOW.sm]}>
            <Text style={styles.sectionTitle}>기분</Text>
            <Text style={styles.moodText}>{record.mood}</Text>
          </View>
        )}

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

        {record.audioPath && (
          <View style={[styles.section, SHADOW.sm]}>
            <Text style={styles.sectionTitle}>음성 녹음</Text>
            <TouchableOpacity onPress={handlePlayAudio} style={[styles.audioButton, isPlaying && styles.audioButtonActive]} activeOpacity={0.7}>
              <Text style={styles.audioIcon}>{isPlaying ? '||' : '>'}</Text>
              <Text style={[styles.audioButtonText, isPlaying && styles.audioButtonTextActive]}>
                {isPlaying ? '재생 중...' : '음성 재생'}
              </Text>
            </TouchableOpacity>
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
    </SafeAreaView>
  );
}
