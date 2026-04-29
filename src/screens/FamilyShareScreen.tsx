import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, ScrollView, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import {
  createFamilyRoom, joinFamilyRoom, getMyFamilyRoom, leaveFamilyRoom,
  promoteLocalDataToFamily,
  type FamilyRoom,
} from '../services/familyService';
import { clearAllDownloadWatermarks, wakeSync } from '../services/syncService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';

export default function FamilyShareScreen() {
  const { colors } = useTheme();
  const { userId, isAnonymous, signInWithApple, signInWithGoogle } = useAuth();
  const { refreshChildren } = useChild();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();

  const [room, setRoom] = useState<FamilyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getMyFamilyRoom();
      setRoom(r);
    } catch {
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const authGate = async (): Promise<boolean> => {
    if (!isAnonymous) return true;
    try {
      if (Platform.OS === 'ios') {
        await signInWithApple();
      } else if (Platform.OS === 'android') {
        await signInWithGoogle();
      } else {
        setError('이 플랫폼은 가족방을 지원하지 않습니다');
        return false;
      }
      return true;
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return false;
      if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === '-5') return false;
      const providerName = Platform.OS === 'ios' ? 'Apple' : 'Google';
      setError(`${providerName} 로그인에 실패했습니다. 다시 시도해주세요.`);
      return false;
    }
  };

  const handleCreate = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const authed = await authGate();
      if (!authed) return;
      const r = await createFamilyRoom();
      setRoom(r);
      await promoteLocalDataToFamily(r.id);
      await clearAllDownloadWatermarks();
      await wakeSync('family_created');
      await refreshChildren();
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as any)?.message ?? JSON.stringify(e);
      setError(msg || '가족방 생성에 실패했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!codeInput.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const authed = await authGate();
      if (!authed) return;
      const r = await joinFamilyRoom(codeInput.trim());
      setRoom(r);
      setCodeInput('');
      await promoteLocalDataToFamily(r.id);
      await clearAllDownloadWatermarks();
      await wakeSync('family_joined');
      await refreshChildren();
      Alert.alert('', '가족방에 참여했습니다!');
    } catch (e) {
      setError(e instanceof Error ? e.message : '참여에 실패했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = () => {
    if (!room) return;
    Alert.alert('가족방 나가기', '가족방을 나가면 공유 기록에 접근할 수 없게 됩니다. 나가시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await leaveFamilyRoom(room.id);
            setRoom(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : '오류가 발생했습니다');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleCopy = async () => {
    if (!room) return;
    await Clipboard.setStringAsync(room.invite_code);
    Alert.alert('', '초대코드가 복사됐습니다');
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>인증이 필요합니다. 잠시 후 다시 시도해주세요.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>가족 공유</Text>
        <Text style={styles.subtitle}>초대코드로 가족과 돌봄 기록을 함께 관리하세요</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {room ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>우리 가족방</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{room.invite_code}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                <Text style={styles.copyBtnText}>복사</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.memberCount}>참여 중인 멤버 {room.member_count}명</Text>
            <Text style={styles.hint}>이 코드를 가족에게 공유하면 같은 방에 참여할 수 있어요</Text>

            <TouchableOpacity
              style={styles.feedBtn}
              onPress={() => navigation.navigate('FamilyFeed')}
            >
              <Text style={styles.feedBtnText}>함께 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leaveBtn}
              onPress={handleLeave}
              disabled={actionLoading}
            >
              <Text style={styles.leaveBtnText}>가족방 나가기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, actionLoading && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>초대코드 만들기</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.joinSection}>
              <Text style={styles.sectionLabel}>초대코드로 참여</Text>
              <TextInput
                style={styles.input}
                value={codeInput}
                onChangeText={t => setCodeInput(t.toUpperCase())}
                placeholder="6자리 초대코드 입력"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.secondaryBtn, (!codeInput.trim() || actionLoading) && styles.btnDisabled]}
                onPress={handleJoin}
                disabled={!codeInput.trim() || actionLoading}
              >
                <Text style={styles.secondaryBtnText}>참여하기</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: SPACING.lg },
    title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.xs },
    subtitle: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginBottom: SPACING.xl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionLabel: { fontSize: FONT_SIZE.sm, color: colors.textTertiary, marginBottom: SPACING.sm },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
    codeText: { fontSize: 28, fontWeight: FONT_WEIGHT.bold, color: colors.primary, letterSpacing: 4 },
    copyBtn: {
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
    },
    copyBtnText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    memberCount: { fontSize: FONT_SIZE.md, color: colors.textPrimary, marginBottom: SPACING.xs },
    hint: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, marginBottom: SPACING.lg },
    feedBtn: {
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.sm,
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    feedBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textOnPrimary },
    leaveBtn: { alignSelf: 'flex-start' },
    leaveBtnText: { fontSize: FONT_SIZE.sm, color: colors.error },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    primaryBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textOnPrimary },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
    dividerText: { fontSize: FONT_SIZE.sm, color: colors.textTertiary },
    joinSection: { gap: SPACING.sm },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: FONT_SIZE.lg,
      color: colors.textPrimary,
      letterSpacing: 4,
      textAlign: 'center',
    },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    secondaryBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },
    btnDisabled: { opacity: 0.4 },
    errorText: { fontSize: FONT_SIZE.sm, color: colors.error, marginBottom: SPACING.md },
  });
}
