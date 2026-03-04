import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
  TAG_COLOR_MAP,
} from '../constants/theme';
import type { RecordWithTags, StructuredData } from '../types/record';
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
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function RecordDetailScreen({
  route,
  navigation,
}: RecordDetailScreenProps) {
  const { recordId } = route.params as { recordId: string };

  const [record, setRecord] = useState<RecordWithTags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingRawText, setIsEditingRawText] = useState(false);
  const [editedRawText, setEditedRawText] = useState('');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const loadRecord = useCallback(async () => {
    try {
      const data = await getRecordById(recordId);
      if (data) {
        setRecord(data);
        setEditedRawText(data.rawText);
      }
    } catch (error) {
      console.error('Failed to load record:', error);
    } finally {
      setIsLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    loadRecord();
    return () => {
      // Clean up audio when leaving screen
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [loadRecord]);


  const handleEditRawText = useCallback(async () => {
    if (!record) return;

    if (!isEditingRawText) {
      setIsEditingRawText(true);
      return;
    }

    // 저장: 변경 없으면 그냥 닫기
    const trimmed = editedRawText.trim();
    if (!trimmed || trimmed === record.rawText) {
      setEditedRawText(record.rawText);
      setIsEditingRawText(false);
      return;
    }

    // AI 재처리
    setIsEditingRawText(false);
    setIsReprocessing(true);
    try {
      let aiResult;
      try {
        aiResult = await processWithAI(trimmed);
      } catch {
        aiResult = createFallbackResult(trimmed);
      }

      await updateRecord(record.id, {
        rawText: trimmed,
        summary: aiResult.summary,
        structuredData: aiResult.structuredData,
        mood: aiResult.mood,
        aiPending: false,
      });
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
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
        return;
      }

      setIsPlaying(true);
      const sound = await playAudio(record.audioPath);
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      Alert.alert('오류', '음성 파일을 재생할 수 없습니다');
    }
  }, [record, isPlaying]);

  const handleDelete = useCallback(() => {
    if (!record) return;

    Alert.alert(
      '기록 삭제',
      '이 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete audio file if exists
              if (record.audioPath) {
                await deleteAudioFile(record.audioPath);
              }
              await deleteRecord(record.id);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete record:', error);
              Alert.alert('오류', '기록 삭제에 실패했습니다');
            }
          },
        },
      ],
    );
  }, [record, navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>기록을 찾을 수 없습니다</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
          <Text style={styles.deleteButtonText}>삭제</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date & Time */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{formatFullDate(record.createdAt)}</Text>
          <Text style={styles.timeText}>{formatTime(record.createdAt)}</Text>
        </View>

        {/* AI Pending Banner */}
        {record.aiPending && (
          <View style={styles.pendingBanner}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.pendingBannerText}>
              AI가 기록을 분석하고 있습니다...
            </Text>
          </View>
        )}

        {/* Tags */}
        {record.tags.length > 0 && (
          <View style={styles.tagsSection}>
            {record.tags.map((tag) => (
              <TagChip key={tag.id} name={tag.name} size="md" />
            ))}
          </View>
        )}

        {/* Summary */}
        <View style={[styles.section, SHADOW.sm]}>
          <Text style={styles.sectionTitle}>요약</Text>
          <Text style={styles.summaryText}>{record.summary}</Text>
        </View>

        {/* Mood */}
        {record.mood && (
          <View style={[styles.section, SHADOW.sm]}>
            <Text style={styles.sectionTitle}>기분</Text>
            <Text style={styles.moodText}>{record.mood}</Text>
          </View>
        )}

        {/* Structured Data Table */}
        {record.structuredData &&
          Object.keys(record.structuredData).length > 0 && (
            <View style={[styles.section, SHADOW.sm]}>
              <Text style={styles.sectionTitle}>상세 데이터</Text>
              <View style={styles.table}>
                {Object.entries(record.structuredData).map(
                  ([key, value], index) => (
                    <View
                      key={key}
                      style={[
                        styles.tableRow,
                        index % 2 === 0 && styles.tableRowEven,
                      ]}
                    >
                      <Text style={styles.tableKey}>{key}</Text>
                      <Text style={styles.tableValue}>{String(value)}</Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          )}

        {/* Audio Player */}
        {record.audioPath && (
          <View style={[styles.section, SHADOW.sm]}>
            <Text style={styles.sectionTitle}>음성 녹음</Text>
            <TouchableOpacity
              onPress={handlePlayAudio}
              style={[styles.audioButton, isPlaying && styles.audioButtonActive]}
              activeOpacity={0.7}
            >
              <Text style={styles.audioIcon}>{isPlaying ? '||' : '>'}</Text>
              <Text
                style={[
                  styles.audioButtonText,
                  isPlaying && styles.audioButtonTextActive,
                ]}
              >
                {isPlaying ? '재생 중...' : '음성 재생'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Raw Text */}
        <View style={[styles.section, SHADOW.sm]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>원본 텍스트</Text>
            {isReprocessing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <TouchableOpacity
                onPress={handleEditRawText}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>
                  {isEditingRawText ? '저장 후 AI 재분석' : '수정'}
                </Text>
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
              placeholderTextColor={COLORS.textTertiary}
            />
          ) : (
            <Text style={styles.rawText}>
              {record.rawText || '원본 텍스트가 없습니다.'}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  backLink: {
    padding: SPACING.sm,
  },
  backLinkText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerButton: {
    padding: SPACING.sm,
  },
  headerButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  deleteButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  // Date
  dateSection: {
    marginBottom: SPACING.md,
  },
  dateText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  timeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs - 2,
  },
  // AI Pending
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accentLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  pendingBannerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.accent,
    fontWeight: FONT_WEIGHT.medium,
    flex: 1,
  },
  // Tags
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  // Sections
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editButton: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
  },
  editButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.primary,
  },
  // Summary
  summaryText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.md * 1.6,
  },
  summaryInput: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.md * 1.6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    minHeight: 80,
  },
  // Mood
  moodText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
  },
  // Structured Data Table
  table: {
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  tableRowEven: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  tableKey: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  tableValue: {
    flex: 2,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  // Audio Player
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    borderRadius: BORDER_RADIUS.lg,
  },
  audioButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  audioIcon: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    width: 24,
    textAlign: 'center',
  },
  audioButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  audioButtonTextActive: {
    color: COLORS.primaryDark,
  },
  // Raw Text
  rawText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZE.sm * 1.7,
  },
});
