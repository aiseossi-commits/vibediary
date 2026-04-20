import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, RefreshControl,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import TagChip from '../components/TagChip';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';

interface FeedRecord {
  id: string;
  created_at: number;
  summary: string;
  tags: string | null;
  photo_url: string | null;
  author_name: string | null;
}

async function loadFamilyFeed(): Promise<{ records: FeedRecord[]; noFamily: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { records: [], noFamily: true };

  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { records: [], noFamily: true };

  const { data, error } = await supabase
    .from('records')
    .select('id, created_at, summary, tags, photo_url, author_name')
    .eq('family_id', membership.family_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return { records: [], noFamily: false };
  return { records: data as FeedRecord[], noFamily: false };
}

function FeedCard({ record }: { record: FeedRecord }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  let tags: string[] = [];
  try { tags = JSON.parse(record.tags ?? '[]'); } catch { tags = []; }

  const dateStr = new Date(record.created_at).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.authorName}>{record.author_name ?? '가족'}</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>
      {record.photo_url ? (
        <Image
          source={{ uri: record.photo_url }}
          style={styles.thumbnail}
          contentFit="cover"
        />
      ) : null}
      {record.summary ? (
        <Text style={styles.summary} numberOfLines={4}>{record.summary}</Text>
      ) : null}
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.slice(0, 5).map((tag, i) => (
            <TagChip key={i} name={tag} size="sm" />
          ))}
        </View>
      )}
    </View>
  );
}

export default function FamilyFeedScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noFamily, setNoFamily] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const result = await loadFamilyFeed();
      setNoFamily(result.noFamily);
      setRecords(result.records);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (noFamily) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>가족방에 참여하면{'\n'}함께 기록을 볼 수 있어요</Text>
        <Text style={styles.emptySubtitle}>설정 → 가족 공유에서 가족방에 참여해 보세요</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <FeedCard record={item} />}
      contentContainerStyle={records.length === 0 ? styles.centerContainer : styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>아직 가족 기록이 없어요</Text>
          <Text style={styles.emptySubtitle}>가족방 멤버가 기록을 남기면 여기에 표시됩니다</Text>
        </View>
      }
    />
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    centerContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: SPACING.md, gap: SPACING.sm },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      gap: SPACING.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    authorName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },
    dateText: { fontSize: FONT_SIZE.xs, color: colors.textSecondary },
    thumbnail: { width: '100%', height: 160, borderRadius: BORDER_RADIUS.sm },
    summary: { fontSize: FONT_SIZE.md, color: colors.textPrimary, lineHeight: 22 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
    emptyTitle: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: SPACING.sm,
      lineHeight: 28,
    },
    emptySubtitle: {
      fontSize: FONT_SIZE.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
