import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
  TAG_COLOR_MAP,
} from '../constants/theme';
import type { Tag, RecordWithTags } from '../types/record';
import { getTagsWithCount, createTag, deleteTag, getRecordsByTags, isDatabaseReady } from '../db';
import TagChip from '../components/TagChip';
import RecordCard from '../components/RecordCard';

interface TagsScreenProps {
  navigation: any;
}

type TagWithCount = Tag & { count: number };

export default function TagsScreen({ navigation }: TagsScreenProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RecordWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const loadTags = useCallback(async () => {
    if (!isDatabaseReady()) {
      setTags([]);
      setIsLoading(false);
      return;
    }
    try {
      const data = await getTagsWithCount();
      setTags(data);
    } catch (error) {
      console.warn('Failed to load tags:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadTags();
    }, [])
  );

  // Load filtered records when selected tags change
  const loadFilteredRecords = useCallback(async (tagIds: number[]) => {
    if (tagIds.length === 0 || !isDatabaseReady()) {
      setFilteredRecords([]);
      return;
    }

    setIsLoadingRecords(true);
    try {
      const records = await getRecordsByTags(tagIds, 50, 0);
      setFilteredRecords(records);
    } catch (error) {
      console.warn('Failed to load filtered records:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  const handleToggleTag = useCallback(
    (tagId: number) => {
      setSelectedTagIds((prev) => {
        const next = prev.includes(tagId)
          ? prev.filter((id) => id !== tagId)
          : [...prev, tagId];

        loadFilteredRecords(next);
        return next;
      });
    },
    [loadFilteredRecords],
  );

  const handleCreateTag = useCallback(async () => {
    const name = newTagName.trim();
    if (!name) {
      setShowCreateInput(false);
      return;
    }

    try {
      await createTag(name);
      setNewTagName('');
      setShowCreateInput(false);
      await loadTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
      Alert.alert('오류', '태그 생성에 실패했습니다');
    }
  }, [newTagName, loadTags]);

  const handleDeleteTag = useCallback(
    (tag: TagWithCount) => {
      Alert.alert(
        '태그 삭제',
        `"${tag.name}" 태그를 삭제하시겠습니까?\n이 태그가 연결된 ${tag.count}개의 기록에서 태그가 제거됩니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTag(tag.id);
                // Remove from selection
                setSelectedTagIds((prev) =>
                  prev.filter((id) => id !== tag.id),
                );
                await loadTags();
                // Refresh filtered records
                setSelectedTagIds((prev) => {
                  loadFilteredRecords(prev);
                  return prev;
                });
              } catch (error) {
                console.error('Failed to delete tag:', error);
                Alert.alert('오류', '태그 삭제에 실패했습니다');
              }
            },
          },
        ],
      );
    },
    [loadTags, loadFilteredRecords],
  );

  const handleRecordPress = useCallback(
    (record: RecordWithTags) => {
      navigation.navigate('RecordDetail', { recordId: record.id });
    },
    [navigation],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedTagIds([]);
    setFilteredRecords([]);
  }, []);

  const renderTagItem = useCallback(
    ({ item }: { item: TagWithCount }) => {
      const isSelected = selectedTagIds.includes(item.id);
      const tagColor = TAG_COLOR_MAP[item.name] ?? COLORS.textSecondary;

      return (
        <TouchableOpacity
          onPress={() => handleToggleTag(item.id)}
          onLongPress={() => handleDeleteTag(item)}
          activeOpacity={0.7}
          style={[
            styles.tagItem,
            SHADOW.sm,
            isSelected && { borderColor: tagColor, borderWidth: 1.5 },
          ]}
        >
          <View style={styles.tagItemLeft}>
            <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
            <Text
              style={[
                styles.tagName,
                isSelected && { color: tagColor, fontWeight: FONT_WEIGHT.semibold },
              ]}
            >
              {item.name}
            </Text>
          </View>
          <View style={styles.tagItemRight}>
            <Text style={styles.tagCount}>{item.count}</Text>
            <Text style={styles.tagCountLabel}>건</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedTagIds, handleToggleTag, handleDeleteTag],
  );

  const renderRecordItem = useCallback(
    ({ item }: { item: RecordWithTags }) => (
      <RecordCard record={item} onPress={() => handleRecordPress(item)} />
    ),
    [handleRecordPress],
  );

  const renderListHeader = useCallback(() => {
    return (
      <>
        {/* Tag Grid */}
        <View style={styles.tagGrid}>
          {tags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            const tagColor = TAG_COLOR_MAP[tag.name] ?? COLORS.textSecondary;

            return (
              <TouchableOpacity
                key={tag.id}
                onPress={() => handleToggleTag(tag.id)}
                onLongPress={() => handleDeleteTag(tag)}
                activeOpacity={0.7}
                style={[
                  styles.tagItem,
                  SHADOW.sm,
                  isSelected && { borderColor: tagColor, borderWidth: 1.5 },
                ]}
              >
                <View style={styles.tagItemLeft}>
                  <View
                    style={[styles.tagDot, { backgroundColor: tagColor }]}
                  />
                  <Text
                    style={[
                      styles.tagName,
                      isSelected && {
                        color: tagColor,
                        fontWeight: FONT_WEIGHT.semibold,
                      },
                    ]}
                  >
                    {tag.name}
                  </Text>
                </View>
                <View style={styles.tagItemRight}>
                  <Text style={styles.tagCount}>{tag.count}</Text>
                  <Text style={styles.tagCountLabel}>건</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Create Tag Button / Input */}
          {showCreateInput ? (
            <View style={[styles.tagItem, styles.createInputContainer]}>
              <TextInput
                style={styles.createInput}
                value={newTagName}
                onChangeText={setNewTagName}
                placeholder="#새 태그"
                placeholderTextColor={COLORS.textTertiary}
                autoFocus
                onSubmitEditing={handleCreateTag}
                onBlur={() => {
                  if (!newTagName.trim()) setShowCreateInput(false);
                }}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleCreateTag}
                style={styles.createConfirmButton}
              >
                <Text style={styles.createConfirmText}>추가</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowCreateInput(true)}
              style={[styles.tagItem, styles.addTagButton]}
              activeOpacity={0.7}
            >
              <Text style={styles.addTagIcon}>+</Text>
              <Text style={styles.addTagText}>태그 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selection info / Clear */}
        {selectedTagIds.length > 0 && (
          <View style={styles.filterBar}>
            <View style={styles.filterInfo}>
              <Text style={styles.filterText}>
                {selectedTagIds.length}개 태그 선택됨
              </Text>
              <Text style={styles.filterSubtext}>
                {filteredRecords.length}개 기록
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClearSelection}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>선택 해제</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading indicator for records */}
        {isLoadingRecords && (
          <View style={styles.recordsLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
      </>
    );
  }, [
    tags,
    selectedTagIds,
    filteredRecords.length,
    showCreateInput,
    newTagName,
    isLoadingRecords,
    handleToggleTag,
    handleDeleteTag,
    handleCreateTag,
    handleClearSelection,
  ]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>태그</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>태그</Text>
        <Text style={styles.subtitle}>{tags.length}개</Text>
      </View>

      <FlatList
        data={selectedTagIds.length > 0 ? filteredRecords : []}
        renderItem={renderRecordItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          selectedTagIds.length > 0 && !isLoadingRecords ? (
            <View style={styles.emptyRecords}>
              <Text style={styles.emptyRecordsText}>
                선택한 태그에 해당하는 기록이 없습니다
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  // Tag Grid
  tagGrid: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tagItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  tagItemRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs - 1,
  },
  tagCount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  tagCountLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
  },
  // Add tag
  addTagButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  addTagIcon: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHT.regular,
  },
  addTagText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textTertiary,
  },
  // Create tag input
  createInputContainer: {
    gap: SPACING.sm,
  },
  createInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    padding: 0,
  },
  createConfirmButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  createConfirmText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textOnPrimary,
  },
  // Filter bar
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  filterText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  filterSubtext: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  clearButton: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  clearButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Records loading
  recordsLoading: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  // Empty records
  emptyRecords: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  emptyRecordsText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textTertiary,
  },
});
