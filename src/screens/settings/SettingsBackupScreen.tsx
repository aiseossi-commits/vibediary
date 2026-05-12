import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useChild } from '../../context/ChildContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../../constants/theme';
import { exportBackup, pickAndParseBackup, restoreOverwrite, restoreMerge } from '../../services/backupService';
import { SettingsSection } from '../../components/settings';

export default function SettingsBackupScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { refreshChildren } = useChild();
  const navigation = useNavigation();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isBusy = isBackingUp || isRestoring;

  // 진행 중 작업 보호: 뒤로가기 시도 시 confirm
  useFocusEffect(
    useCallback(() => {
      const beforeRemoveListener = (e: any) => {
        if (!isBusy) return;
        e.preventDefault();
        Alert.alert(
          isBackingUp ? '백업 진행 중' : '복원 진행 중',
          '진행 중에 나가면 작업이 중단될 수 있어요. 그래도 나가시겠어요?',
          [
            { text: '머무르기', style: 'cancel' },
            { text: '나가기', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          ]
        );
      };
      const sub = navigation.addListener('beforeRemove', beforeRemoveListener);
      return sub;
    }, [isBusy, isBackingUp, navigation])
  );

  const handleExport = useCallback(async () => {
    setIsBackingUp(true);
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('오류', '백업 내보내기 중 문제가 발생했습니다.');
    } finally {
      setIsBackingUp(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    let data;
    try {
      data = await pickAndParseBackup();
    } catch (e: any) {
      if (e?.message === 'CANCELED') return;
      Alert.alert('오류', '유효하지 않은 백업 파일입니다.');
      return;
    }

    Alert.alert(
      '복원 방식 선택',
      '기존 데이터를 어떻게 처리할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '병합 (기존 유지 + 신규 추가)',
          onPress: async () => {
            setIsRestoring(true);
            try {
              await restoreMerge(data);
              await refreshChildren();
              Alert.alert('완료', '병합 복원이 완료되었습니다.');
            } catch {
              Alert.alert('오류', '복원 중 문제가 발생했습니다.');
            } finally {
              setIsRestoring(false);
            }
          },
        },
        {
          text: '덮어쓰기 (전체 교체)',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '주의',
              '기존 데이터가 모두 삭제됩니다. 계속하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '덮어쓰기',
                  style: 'destructive',
                  onPress: async () => {
                    setIsRestoring(true);
                    try {
                      await restoreOverwrite(data);
                      await refreshChildren();
                      Alert.alert('완료', '덮어쓰기 복원이 완료되었습니다.');
                    } catch {
                      Alert.alert('오류', '복원 중 문제가 발생했습니다.');
                    } finally {
                      setIsRestoring(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [refreshChildren]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SettingsSection title="데이터 백업/복원">
          <View style={styles.card}>
            <Text style={styles.description}>
              폰 교체 시: 내보내기 → 카카오톡 "나에게 보내기" 전송{'\n'}
              새 폰에서: 카카오톡 파일 탭 → "다른 앱으로 열기" → 바다
            </Text>
            <View style={[styles.backupRow, { marginTop: SPACING.md }]}>
              <TouchableOpacity
                style={styles.backupButtonPrimary}
                onPress={handleExport}
                disabled={isBackingUp}
              >
                {isBackingUp
                  ? <ActivityIndicator size="small" color={colors.textOnPrimary} />
                  : <Text style={styles.backupButtonTextPrimary}>내보내기</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backupButton}
                onPress={handleImport}
                disabled={isRestoring}
              >
                {isRestoring
                  ? <ActivityIndicator size="small" color={colors.textSecondary} />
                  : <Text style={styles.backupButtonText}>가져오기</Text>
                }
              </TouchableOpacity>
            </View>
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
    description: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 22 },
    backupRow: { flexDirection: 'row', gap: SPACING.sm },
    backupButton: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary },
    backupButtonPrimary: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primary },
    backupButtonText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
    backupButtonTextPrimary: { fontSize: FONT_SIZE.sm, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium },
  });
}
