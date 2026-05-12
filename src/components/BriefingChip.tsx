import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';
import type { BriefingPayload } from '../db/briefingDao';
import { getOrCreateBriefing } from '../services/briefingService';

interface Props {
  childId: string | undefined;
}

export default function BriefingChip({ childId }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();

  const [payload, setPayload] = useState<BriefingPayload | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await getOrCreateBriefing(childId);
      setPayload(p);
    } catch {
      setPayload(null);
    }
  }, [childId]);

  useEffect(() => { load(); }, [load]);

  const handleTagNavigate = useCallback((tag: string) => {
    setDetailOpen(false);
    // TagsScreen으로 이동 (해당 태그 필터)
    navigation.navigate('Tags', { tag });
  }, [navigation]);

  if (!payload || !payload.primary) return null;

  return (
    <>
      <View style={styles.chipRow}>
        <TouchableOpacity
          style={styles.chip}
          activeOpacity={0.7}
          onPress={() => setDetailOpen(true)}
        >
          <Text style={styles.chipText} numberOfLines={1}>{payload.primary}</Text>
          {payload.issues.length > 1 && (
            <Text style={styles.chipMore}>더보기 ›</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={detailOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDetailOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>오늘의 이슈</Text>
            <Text style={styles.modalDesc}>최근 21일 기록 기준</Text>
            <ScrollView style={{ marginTop: SPACING.sm }}>
              {payload.issues.map((issue, idx) => (
                <TouchableOpacity
                  key={issue.tag}
                  style={[styles.issueRow, idx === 0 && styles.issueRowPrimary]}
                  onPress={() => handleTagNavigate(issue.tag)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.issueTag}>{issue.tag}</Text>
                  <Text style={styles.issueMeta}>
                    {issue.durationDays >= 3 ? `${issue.durationDays}일째 · ` : ''}
                    {issue.count}회
                  </Text>
                  <Text style={styles.issueArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailOpen(false)}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    chipRow: {
      marginHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.full,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      gap: SPACING.sm,
    },
    chipText: {
      flex: 1,
      fontSize: FONT_SIZE.sm,
      color: colors.textPrimary,
      fontWeight: FONT_WEIGHT.medium,
    },
    chipMore: {
      fontSize: FONT_SIZE.xs,
      color: colors.primary,
      fontWeight: FONT_WEIGHT.medium,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      paddingBottom: SPACING.xxl,
      maxHeight: '70%',
    },
    modalHandle: {
      alignSelf: 'center',
      width: 40, height: 4,
      borderRadius: 2,
      backgroundColor: colors.divider,
      marginBottom: SPACING.md,
    },
    modalTitle: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
    },
    modalDesc: {
      fontSize: FONT_SIZE.xs,
      color: colors.textTertiary,
      marginTop: 2,
    },
    issueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      gap: SPACING.sm,
    },
    issueRowPrimary: {},
    issueTag: {
      flex: 1,
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.textPrimary,
    },
    issueMeta: {
      fontSize: FONT_SIZE.sm,
      color: colors.textSecondary,
    },
    issueArrow: {
      fontSize: FONT_SIZE.lg,
      color: colors.textTertiary,
    },
    closeBtn: {
      marginTop: SPACING.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.md,
    },
    closeBtnText: {
      fontSize: FONT_SIZE.md,
      color: colors.textPrimary,
      fontWeight: FONT_WEIGHT.medium,
    },
  });
}
