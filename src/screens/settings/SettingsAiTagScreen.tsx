import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useChild } from '../../context/ChildContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../../constants/theme';
import { getAllRecords, setTagsForRecord, getAllTags } from '../../db';
import { getTagsOnly } from '../../services/aiProcessor';
import { wakeSync } from '../../services/syncService';
import { DEFAULT_TAGS } from '../../db/schema';
import { getSetting, setSetting } from '../../db/appSettingsDao';
import { SettingsSection } from '../../components/settings';

const LAST_RETAG_KEY = 'last_retag_at';

export default function SettingsAiTagScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activeChild } = useChild();
  const navigation = useNavigation();

  const [isRetagging, setIsRetagging] = useState(false);
  const [retagProgress, setRetagProgress] = useState<{ current: number; total: number } | null>(null);
  const [retagDoneToday, setRetagDoneToday] = useState(false);

  useEffect(() => {
    getSetting(LAST_RETAG_KEY).then(val => {
      if (val) {
        const today = new Date().toISOString().slice(0, 10);
        setRetagDoneToday(val === today);
      }
    });
  }, []);

  // 진행 중 뒤로가기 보호
  useFocusEffect(
    useCallback(() => {
      const before = (e: any) => {
        if (!isRetagging) return;
        e.preventDefault();
        Alert.alert(
          '재분석 진행 중',
          '진행 중에 나가면 작업이 중단됩니다. 그래도 나가시겠어요?',
          [
            { text: '머무르기', style: 'cancel' },
            { text: '나가기', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          ]
        );
      };
      const sub = navigation.addListener('beforeRemove', before);
      return sub;
    }, [isRetagging, navigation])
  );

  const handleRetagAll = useCallback(() => {
    if (!activeChild) {
      Alert.alert('바다 선택 필요', '먼저 바다를 선택해주세요.');
      return;
    }
    if (retagDoneToday) {
      Alert.alert('오늘 이미 실행했습니다', '태그 재분석은 하루 1회만 가능합니다.');
      return;
    }
    Alert.alert(
      '기존 기록 태그 재분석',
      `"${activeChild.name}"의 모든 기록을 AI로 다시 태깅합니다.\n기록 수만큼 AI 호출이 발생하며, 시간이 걸릴 수 있습니다.\n계속하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '재분석 시작',
          onPress: async () => {
            setIsRetagging(true);
            setRetagProgress(null);
            try {
              const records = await getAllRecords(10000, 0, activeChild.id);
              const withText = records.filter(r => r.rawText && r.rawText.trim().length > 0);
              if (withText.length === 0) {
                Alert.alert('완료', '재분석할 기록이 없습니다.');
                return;
              }
              const customTags = await getAllTags(activeChild.id).then(
                tags => tags.map(t => t.name).filter(n => !DEFAULT_TAGS.includes(n))
              );
              const allowedTags = new Set([...DEFAULT_TAGS, ...customTags]);
              let successCount = 0;
              for (let i = 0; i < withText.length; i++) {
                setRetagProgress({ current: i + 1, total: withText.length });
                const record = withText[i];
                try {
                  const tags = (await getTagsOnly(record.rawText!, customTags))
                    .filter(t => allowedTags.has(t));
                  if (tags.length > 0) {
                    await setTagsForRecord(record.id, tags, activeChild.id);
                    successCount++;
                  }
                } catch {}
                await new Promise(res => setTimeout(res, 200));
              }
              const today = new Date().toISOString().slice(0, 10);
              await setSetting(LAST_RETAG_KEY, today);
              setRetagDoneToday(true);
              void wakeSync('record_changed');
              Alert.alert('완료', `${successCount}/${withText.length}건의 기록 태그가 업데이트되었습니다.`);
            } catch (e: any) {
              if (e?.message === 'OFFLINE') {
                Alert.alert('오프라인', '인터넷에 연결되지 않았어요.');
              } else {
                Alert.alert('오류', '태그 재분석 중 문제가 발생했습니다.');
              }
            } finally {
              setIsRetagging(false);
              setRetagProgress(null);
            }
          },
        },
      ]
    );
  }, [activeChild, retagDoneToday]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SettingsSection
          title="기존 기록 태그 재분석"
          description={'앱 업데이트로 태그 분류가 세분화되었습니다.\n이전에 저장된 기록도 새 태그 기준으로 다시 분석합니다.\n태그 재분석은 하루 1회만 가능합니다.'}
        >
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.processButton, (isRetagging || retagDoneToday) && { opacity: 0.4 }]}
              onPress={handleRetagAll}
              disabled={isRetagging || retagDoneToday}
            >
              {isRetagging && retagProgress ? (
                <Text style={styles.processButtonText}>
                  분석 중... ({retagProgress.current}/{retagProgress.total})
                </Text>
              ) : isRetagging ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : retagDoneToday ? (
                <Text style={styles.processButtonText}>오늘 이미 실행했습니다</Text>
              ) : (
                <Text style={styles.processButtonText}>태그 재분석 시작</Text>
              )}
            </TouchableOpacity>
          </View>
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    card: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
    processButton: { backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.sm, paddingVertical: SPACING.sm, alignItems: 'center' },
    processButtonText: { color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium, fontSize: FONT_SIZE.sm },
  });
}
