import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  type AppColors,
} from '../constants/theme';
import type { Tag, RecordWithTags } from '../types/record';
import { getTagsWithCount, createTag, deleteTag, renameTag, getRecordsByTags, isDatabaseReady } from '../db';
import { useChild } from '../context/ChildContext';
import RecordCard from '../components/RecordCard';

interface TagsScreenProps {
  navigation: any;
}

// 한국어 IME 깨짐 방지: 자체 로컬 상태로 관리하는 독립 컴포넌트
function TagCreateInput({ onSubmit, onCancel, onFocus, colors, styles }: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
  onFocus?: () => void;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const [value, setValue] = React.useState('');
  return (
    <View style={[styles.tagItem, styles.createInputContainer]}>
      <TextInput
        style={styles.createInput}
        value={value}
        onChangeText={setValue}
        placeholder="#새 태그"
        placeholderTextColor={colors.textTertiary}
        autoFocus
        onFocus={onFocus}
        onSubmitEditing={() => { const v = value.trim(); if (v) onSubmit(v); else onCancel(); }}
        onBlur={() => { if (!value.trim()) onCancel(); }}
        returnKeyType="done"
      />
      <TouchableOpacity
        onPress={() => { const v = value.trim(); if (v) onSubmit(v); }}
        style={styles.createConfirmButton}
      >
        <Text style={styles.createConfirmText}>추가</Text>
      </TouchableOpacity>
    </View>
  );
}

type TagWithCount = Tag & { count: number; isDefault: boolean };

const TAG_CATEGORIES: { label: string; tags: string[] }[] = [
  { label: '치료', tags: ['#치료', '#언어치료', '#작업치료', '#감각통합치료', '#ABA치료', '#놀이치료', '#물리치료', '#뇌파치료', '#한의학'] },
  { label: '투약', tags: ['#투약', '#처방약', '#보충제', '#동종요법', '#패치'] },
  { label: '신체/증상', tags: ['#의료', '#배변', '#수면', '#감각', '#각성', '#건강'] },
  { label: '행동/정서', tags: ['#행동', '#기분', '#상동행동', '#자해', '#공격행동'] },
  { label: '기타', tags: ['#발달', '#검사', '#상담', '#교육기관', '#식단', '#일상'] },
];
const ALL_CATEGORY_TAG_NAMES = new Set(TAG_CATEGORIES.flatMap(c => c.tags));

const CUSTOM_TAG_COLORS = [
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4',
];

function hashTagColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CUSTOM_TAG_COLORS[h % CUSTOM_TAG_COLORS.length];
}

function getTagColor(name: string, colors: AppColors): string {
  const map: Record<string, string> = {
    '#의료': colors.tagMedical,
    '#투약': colors.tagMedication,
    '#행동': colors.tagBehavior,
    '#일상': colors.tagDaily,
    '#치료': colors.tagTherapy,
  };
  return map[name] ?? hashTagColor(name);
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md },
    title: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    subtitle: { fontSize: FONT_SIZE.sm, color: colors.textTertiary },
    listContent: { paddingBottom: SPACING.xxl },
    tagGrid: { paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.md },
    tagItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.md - 2,
      borderWidth: 1.5, borderColor: 'transparent',
    },
    tagItemLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
    tagDot: { width: 10, height: 10, borderRadius: 5 },
    tagName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
    tagItemRight: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.xs - 1 },
    tagCount: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary },
    tagCountLabel: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    addTagButton: { justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: SPACING.xs, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.border, backgroundColor: 'transparent' },
    addTagIcon: { fontSize: FONT_SIZE.lg, color: colors.textTertiary, fontWeight: FONT_WEIGHT.regular },
    addTagText: { fontSize: FONT_SIZE.md, color: colors.textTertiary },
    createInputContainer: { gap: SPACING.sm },
    createInput: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, padding: 0 },
    createConfirmButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.sm },
    createConfirmText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textOnPrimary },
    tagDeleteBtn: { paddingHorizontal: SPACING.xs, paddingVertical: 2, marginLeft: SPACING.xs },
    tagDeleteBtnText: { fontSize: 18, color: colors.textTertiary, lineHeight: 20 },
    filterBar: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginBottom: SPACING.sm,
      backgroundColor: colors.surfaceSecondary, marginHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.sm,
    },
    filterInfo: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
    filterText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
    filterSubtext: { fontSize: FONT_SIZE.xs, color: colors.textSecondary },
    clearButton: { paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm },
    clearButtonText: { fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
    recordsLoading: { paddingVertical: SPACING.lg, alignItems: 'center' },
    emptyRecords: { paddingVertical: SPACING.xxl, alignItems: 'center' },
    emptyRecordsText: { fontSize: FONT_SIZE.md, color: colors.textTertiary },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.xs,
    },
    sectionHeaderText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textSecondary },
    sectionHeaderLine: { flex: 1, height: 1, backgroundColor: colors.divider },
    // 타임라인
    timelineContainer: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
    timelineYearHeader: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
    timelineMonthGroup: { marginBottom: SPACING.sm },
    timelineMonthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.xs },
    timelineMonthLabel: { width: 32, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textSecondary, paddingTop: 2 },
    timelineEntries: { flex: 1, borderLeftWidth: 1.5, borderLeftColor: colors.divider, paddingLeft: SPACING.sm, gap: SPACING.xs },
    timelineEntry: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.sm },
    timelineEntryDate: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, marginBottom: 2 },
    timelineEntrySummary: { fontSize: FONT_SIZE.sm, color: colors.textPrimary, lineHeight: 20 },
    timelineEntryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    timelineEntryTag: { fontSize: FONT_SIZE.xs, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: BORDER_RADIUS.full },
    timelineBadge: { fontSize: FONT_SIZE.xs, color: colors.primary, fontWeight: FONT_WEIGHT.semibold },
  });
}

export default function TagsScreen({ navigation }: TagsScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activeChild } = useChild();

  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RecordWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [longPressedTagId, setLongPressedTagId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<RecordWithTags>>(null);
  const headerHeightRef = useRef(0);
  const scrollToInput = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: headerHeightRef.current, animated: true }), 150);
  }, []);

  const loadTags = useCallback(async () => {
    if (!isDatabaseReady()) { setTags([]); setIsLoading(false); return; }
    try {
      const data = await getTagsWithCount(activeChild?.id);
      setTags(data);
    } catch (error) {
      console.warn('Failed to load tags:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeChild?.id]);

  // activeChild 전환 시 선택 상태 초기화 (이전 아이 기록 잔류 방지)
  useEffect(() => {
    setSelectedTagIds([]);
    setFilteredRecords([]);
  }, [activeChild?.id]);

  // activeChild 로드 후 / DB 초기화 후 자동 갱신 (마운트된 채로 상태 변경 시)
  useEffect(() => { setIsLoading(true); loadTags(); }, [loadTags]);
  // 화면 포커스 시 갱신 (다른 탭에서 돌아올 때)
  useFocusEffect(useCallback(() => { setIsLoading(true); loadTags(); }, [loadTags]));

  const loadFilteredRecords = useCallback(async (tagIds: string[]) => {
    if (tagIds.length === 0 || !isDatabaseReady()) { setFilteredRecords([]); return; }
    setIsLoadingRecords(true);
    try {
      const records = await getRecordsByTags(tagIds, 50, 0, activeChild?.id);
      setFilteredRecords(records);
    } catch (error) {
      console.warn('Failed to load filtered records:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [activeChild?.id]);

  const handleToggleTag = useCallback((tagId: string) => {
    setLongPressedTagId(null);
    setSelectedTagIds((prev) => {
      const next = prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId];
      loadFilteredRecords(next);
      return next;
    });
  }, [loadFilteredRecords]);

  const handleCreateTag = useCallback(async (name: string) => {
    try {
      await createTag(name, activeChild?.id);
      setShowCreateInput(false);
      await loadTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
      Alert.alert('오류', '태그 생성에 실패했습니다');
    }
  }, [loadTags, activeChild?.id]);

  const handleDeleteTag = useCallback((tag: TagWithCount) => {
    Alert.alert('태그 삭제', `"${tag.name}" 태그를 삭제하시겠습니까?\n이 태그가 연결된 ${tag.count}개의 기록에서 태그가 제거됩니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await deleteTag(tag.id);
          setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id));
          await loadTags();
          setSelectedTagIds((prev) => { loadFilteredRecords(prev); return prev; });
        } catch (error) {
          console.error('Failed to delete tag:', error);
          Alert.alert('오류', '태그 삭제에 실패했습니다');
        }
      }},
    ]);
  }, [loadTags, loadFilteredRecords]);

  const handleStartEdit = useCallback((tag: TagWithCount) => {
    setLongPressedTagId(null);
    setEditingTagId(tag.id);
    setEditValue(tag.name.startsWith('#') ? tag.name.slice(1) : tag.name);
  }, []);

  const handleConfirmEdit = useCallback(async (tag: TagWithCount) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === tag.name.replace('#', '')) {
      setEditingTagId(null);
      return;
    }
    try {
      await renameTag(tag.id, trimmed, activeChild?.id);
      setEditingTagId(null);
      await loadTags();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'DUPLICATE') {
        Alert.alert('중복', '이미 같은 이름의 태그가 있습니다');
      } else {
        Alert.alert('오류', '태그 이름 변경에 실패했습니다');
      }
    }
  }, [editValue, activeChild?.id, loadTags]);

  const handleRecordPress = useCallback((record: RecordWithTags) => {
    navigation.navigate('RecordDetail', { recordId: record.id });
  }, [navigation]);

  const handleClearSelection = useCallback(() => { setSelectedTagIds([]); setFilteredRecords([]); }, []);

  const renderRecordItem = useCallback(({ item }: { item: RecordWithTags }) => (
    <RecordCard record={item} onPress={() => handleRecordPress(item)} />
  ), [handleRecordPress]);

  const tagByName = useMemo(() => {
    const map = new Map<string, TagWithCount>();
    for (const t of tags) map.set(t.name, t);
    return map;
  }, [tags]);

  const customTags = useMemo(() => tags.filter(t => !ALL_CATEGORY_TAG_NAMES.has(t.name)), [tags]);

  const isTimelineMode = useMemo(() => {
    if (selectedTagIds.length !== 1) return false;
    const tag = tags.find(t => t.id === selectedTagIds[0]);
    return tag?.name === '#의료';
  }, [selectedTagIds, tags]);

  type TimelineMonth = { month: number; records: RecordWithTags[] };
  type TimelineYear = { year: number; months: TimelineMonth[] };

  const timelineGroups = useMemo((): TimelineYear[] => {
    if (!isTimelineMode || filteredRecords.length === 0) return [];

    const byKey = new Map<string, { year: number; month: number; records: RecordWithTags[] }>();
    for (const r of filteredRecords) {
      const d = new Date(r.createdAt);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${month}`;
      if (!byKey.has(key)) byKey.set(key, { year, month, records: [] });
      byKey.get(key)!.records.push(r);
    }

    const entries = Array.from(byKey.values()).sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.month - a.month
    );

    const byYear = new Map<number, TimelineMonth[]>();
    for (const e of entries) {
      if (!byYear.has(e.year)) byYear.set(e.year, []);
      byYear.get(e.year)!.push({ month: e.month, records: e.records });
    }

    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({ year, months }));
  }, [isTimelineMode, filteredRecords]);

  const renderTimeline = useCallback(() => {
    if (timelineGroups.length === 0) {
      return (
        <View style={styles.emptyRecords}>
          <Text style={styles.emptyRecordsText}>의료 기록이 없습니다</Text>
        </View>
      );
    }
    return (
      <View style={styles.timelineContainer}>
        {timelineGroups.map(({ year, months }) => (
          <View key={year}>
            <Text style={styles.timelineYearHeader}>{year}</Text>
            {months.map(({ month, records: mRecords }) => (
              <View key={month} style={styles.timelineMonthGroup}>
                <View style={styles.timelineMonthRow}>
                  <Text style={styles.timelineMonthLabel}>{month}월</Text>
                  <View style={styles.timelineEntries}>
                    {mRecords.map((r) => {
                      const d = new Date(r.createdAt);
                      const day = String(d.getDate()).padStart(2, '0');
                      const otherTags = r.tags.filter(t => t.name !== '#의료');
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={styles.timelineEntry}
                          onPress={() => handleRecordPress(r)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.timelineEntryDate}>{month}월 {day}일</Text>
                          <Text style={styles.timelineEntrySummary} numberOfLines={3}>{r.summary}</Text>
                          {otherTags.length > 0 && (
                            <View style={styles.timelineEntryTags}>
                              {otherTags.slice(0, 4).map(t => (
                                <Text key={t.id} style={styles.timelineEntryTag}>{t.name}</Text>
                              ))}
                              {otherTags.length > 4 && (
                                <Text style={styles.timelineBadge}>+{otherTags.length - 4}</Text>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }, [timelineGroups, styles, handleRecordPress]);

  const renderTagItem = useCallback((tag: TagWithCount) => {
    const isSelected = selectedTagIds.includes(tag.id);
    const tagColor = getTagColor(tag.name, colors);
    const isEditing = editingTagId === tag.id;

    if (isEditing) {
      return (
        <View key={tag.id} style={[styles.tagItem, { borderColor: tagColor, borderWidth: 1.5 }]}>
          <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
          <TextInput
            style={[styles.tagName, { flex: 1, marginLeft: SPACING.sm, padding: 0, color: colors.textPrimary }]}
            value={editValue}
            onChangeText={setEditValue}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => handleConfirmEdit(tag)}
            onBlur={() => handleConfirmEdit(tag)}
          />
          <TouchableOpacity onPress={() => handleConfirmEdit(tag)} style={[styles.tagDeleteBtn, { marginLeft: SPACING.xs }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.tagDeleteBtnText, { color: tagColor }]}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditingTagId(null)} style={styles.tagDeleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.tagDeleteBtnText}>×</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const isLongPressed = longPressedTagId === tag.id;
    return (
      <TouchableOpacity
        key={tag.id}
        onPress={() => handleToggleTag(tag.id)}
        onLongPress={() => setLongPressedTagId(tag.id)}
        delayLongPress={400}
        activeOpacity={0.7}
        style={[styles.tagItem, isSelected && { borderColor: tagColor, borderWidth: 1.5 }]}
      >
        <View style={styles.tagItemLeft}>
          <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
          <Text style={[styles.tagName, isSelected && { color: tagColor, fontWeight: FONT_WEIGHT.semibold }]}>{tag.name}</Text>
        </View>
        <View style={styles.tagItemRight}>
          <Text style={styles.tagCount}>{tag.count}</Text>
          <Text style={styles.tagCountLabel}>건</Text>
          {isLongPressed && (
            <>
              <TouchableOpacity onPress={() => handleStartEdit(tag)} style={styles.tagDeleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.tagDeleteBtnText}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteTag(tag)} style={styles.tagDeleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.tagDeleteBtnText}>×</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [selectedTagIds, editingTagId, editValue, longPressedTagId, colors, styles, handleToggleTag, handleStartEdit, handleDeleteTag, handleConfirmEdit]);

  const renderListHeader = useCallback(() => (
    <>
      <View onLayout={(e) => { headerHeightRef.current = e.nativeEvent.layout.height; }}>
        {/* 카테고리 섹션 */}
        {TAG_CATEGORIES.map((category) => {
          const categoryTags = category.tags.map(name => tagByName.get(name)).filter(Boolean) as TagWithCount[];
          if (categoryTags.length === 0) return null;
          return (
            <View key={category.label}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{category.label}</Text>
                <View style={styles.sectionHeaderLine} />
              </View>
              <View style={styles.tagGrid}>
                {categoryTags.map(tag => renderTagItem(tag))}
              </View>
            </View>
          );
        })}

        {/* 내 태그 섹션 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>내 태그</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
        <View style={styles.tagGrid}>
          {customTags.map(tag => renderTagItem(tag))}
          {showCreateInput ? (
            <TagCreateInput onSubmit={handleCreateTag} onCancel={() => setShowCreateInput(false)} onFocus={scrollToInput} colors={colors} styles={styles} />
          ) : (
            <TouchableOpacity onPress={() => setShowCreateInput(true)} style={[styles.tagItem, styles.addTagButton]} activeOpacity={0.7}>
              <Text style={styles.addTagIcon}>+</Text>
              <Text style={styles.addTagText}>태그 추가</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {selectedTagIds.length > 0 && (
        <View style={styles.filterBar}>
          <View style={styles.filterInfo}>
            <Text style={styles.filterText}>{selectedTagIds.length}개 태그 선택됨</Text>
            <Text style={styles.filterSubtext}>{filteredRecords.length}개 기록</Text>
          </View>
          <TouchableOpacity onPress={handleClearSelection} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>선택 해제</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoadingRecords && <View style={styles.recordsLoading}><ActivityIndicator size="small" color={colors.primary} /></View>}

      {isTimelineMode && !isLoadingRecords && renderTimeline()}
    </>
  ), [tagByName, customTags, renderTagItem, selectedTagIds, filteredRecords.length, showCreateInput, isLoadingRecords, isTimelineMode, renderTimeline, handleCreateTag, handleClearSelection, scrollToInput, styles, colors]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}><Text style={styles.title}>태그</Text></View>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>태그</Text>
        <Text style={styles.subtitle}>{tags.length}개</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatListRef}
          data={selectedTagIds.length > 0 && !isTimelineMode ? filteredRecords : []}
          renderItem={renderRecordItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            selectedTagIds.length > 0 && !isLoadingRecords && !isTimelineMode ? (
              <View style={styles.emptyRecords}><Text style={styles.emptyRecordsText}>선택한 태그에 해당하는 기록이 없습니다</Text></View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
