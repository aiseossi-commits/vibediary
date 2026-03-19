import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { useRecording } from '../hooks/useRecording';
import WaveLoader from '../components/WaveLoader';
import { useTheme } from '../context/ThemeContext';
import {
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  TOUCH_TARGET,
  TYPOGRAPHY,
  type AppColors,
} from '../constants/theme';

interface RecordingScreenProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgGlow: {
      position: 'absolute',
      top: -120,
      left: '15%',
      right: '15%',
      height: 280,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.primary,
      opacity: 0.04,
    },
    header: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
    cancelButton: { padding: SPACING.sm },
    cancelText: { fontSize: 16, color: colors.textSecondary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xxl },
    guideText: { ...TYPOGRAPHY.h2, color: colors.textSecondary, textAlign: 'center' },
    waveform: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 72, gap: 7 },
    waveBar: { width: 5, backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.full },
    statusText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 20,
      fontWeight: '500' as const,
      letterSpacing: 0.4,
    },
    controls: { paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.xl, alignItems: 'center' },
    timer: {
      fontSize: 22,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      marginBottom: 8,
      letterSpacing: 2,
    },
    countdown: {
      fontSize: 64,
      fontWeight: '700' as const,
      color: colors.recordingRed,
      marginBottom: 16,
      letterSpacing: -2,
    },
    countdownSpacer: { height: 40, marginBottom: 24 },
    buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl },
    recordButton: {
      width: TOUCH_TARGET.recordButton,
      height: TOUCH_TARGET.recordButton,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.micBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.micBorder,
    },
    recordDot: { width: 32, height: 32, borderRadius: BORDER_RADIUS.full, backgroundColor: colors.primary },
    stopButton: {
      width: TOUCH_TARGET.min,
      height: TOUCH_TARGET.min,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.recordingRedLight,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.recordingRed,
    },
    stopIcon: { width: 20, height: 20, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.recordingRed },
    errorText: { fontSize: FONT_SIZE.sm, color: colors.error, marginTop: SPACING.md },
    processingText: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' as const, letterSpacing: 0.4, marginTop: SPACING.lg },
  });
}

function OrganicBlob({ audioLevel, color }: { audioLevel: number; color: string }) {
  const scale = useSharedValue(1);
  const r1 = useSharedValue(60);
  const r2 = useSharedValue(60);
  const r3 = useSharedValue(60);
  const r4 = useSharedValue(60);

  useEffect(() => {
    const dur = (d: number) => ({ duration: d });
    r1.value = withRepeat(withSequence(withTiming(52, dur(900)), withTiming(70, dur(900))), -1);
    r2.value = withRepeat(withSequence(withTiming(72, dur(1100)), withTiming(50, dur(1100))), -1);
    r3.value = withRepeat(withSequence(withTiming(58, dur(1300)), withTiming(74, dur(1300))), -1);
    r4.value = withRepeat(withSequence(withTiming(68, dur(950)), withTiming(52, dur(950))), -1);
  }, []);

  useEffect(() => {
    scale.value = withSpring(
      audioLevel > 0.05 ? 1 + audioLevel * 0.5 : 1,
      { damping: 8, stiffness: 120 }
    );
  }, [audioLevel]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const blobStyle = useAnimatedStyle(() => ({
    width: 120,
    height: 120,
    backgroundColor: color,
    opacity: 0.85,
    borderTopLeftRadius: r1.value,
    borderTopRightRadius: r2.value,
    borderBottomRightRadius: r3.value,
    borderBottomLeftRadius: r4.value,
  }));

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={scaleStyle}>
        <Animated.View style={blobStyle} />
      </Animated.View>
    </View>
  );
}

export default function RecordingScreen({ onRecordingComplete, onCancel, isProcessing = false }: RecordingScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isRecording, isStarting, duration, audioLevel, getAverageAudioLevel, start, stop, error } = useRecording();

  React.useEffect(() => { start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const MIN_DURATION = 3;
  const MAX_DURATION = 30;
  const SILENCE_THRESHOLD = 0.08;
  const LOW_AUDIO_THRESHOLD = 0.15;

  const handleStop = useCallback(async () => {
    try {
      if (duration <= MIN_DURATION) { await stop(); onCancel(); return; }
      const avgLevel = getAverageAudioLevel();
      const result = await stop();
      if (avgLevel <= SILENCE_THRESHOLD) {
        Alert.alert('녹음된 내용이 없습니다', '음성이 감지되지 않았습니다. 마이크 가까이에서 다시 녹음해 주세요.');
        FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
        onCancel();
        return;
      }
      if (avgLevel <= LOW_AUDIO_THRESHOLD) {
        Alert.alert('녹음 음량이 낮습니다', '음성이 잘 들리지 않을 수 있습니다. 저장할까요?', [
          { text: '취소', style: 'cancel', onPress: () => { FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {}); onCancel(); } },
          { text: '저장', onPress: () => onRecordingComplete(result.uri, result.duration) },
        ]);
      } else {
        onRecordingComplete(result.uri, result.duration);
      }
    } catch {
      Alert.alert('오류', '녹음 저장에 실패했습니다');
    }
  }, [duration, stop, getAverageAudioLevel, onRecordingComplete, onCancel]);

  // 30초 자동 종료
  useEffect(() => {
    if (isRecording && duration >= MAX_DURATION) {
      handleStop();
    }
  }, [duration, isRecording, handleStop]);

  const handleCancel = useCallback(() => {
    if (isRecording) {
      Alert.alert('녹음 취소', '녹음을 취소하시겠습니까?', [
        { text: '계속 녹음', style: 'cancel' },
        { text: '취소', style: 'destructive', onPress: async () => { try { await stop(); } catch {} onCancel(); } },
      ]);
    } else {
      onCancel();
    }
  }, [isRecording, stop, onCancel]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgGlow} pointerEvents="none" />
      <View style={styles.header}>
        {!isProcessing && (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.center}>
        {isProcessing && (
          <>
            <WaveLoader color={colors.primary} />
            <Text style={styles.processingText}>기록중입니다...</Text>
          </>
        )}
        {!isRecording && !isProcessing && null}
        {isRecording && (
          <>
            <OrganicBlob audioLevel={audioLevel} color={colors.primary} />
            <Text style={styles.statusText}>녹음 중...</Text>
          </>
        )}
      </View>

      <View style={styles.controls}>
        {isProcessing ? null : (
          <>
            {isRecording && duration >= 25 ? (
              <Text style={styles.countdown}>{MAX_DURATION - duration}</Text>
            ) : (
              <View style={styles.countdownSpacer} />
            )}
            <View style={styles.buttonRow}>
              {!isRecording ? (
                <TouchableOpacity
                  onPress={start}
                  disabled={isStarting}
                  style={[styles.recordButton, isStarting && { opacity: 0.5 }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.recordDot} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleStop} style={styles.stopButton}>
                  <View style={styles.stopIcon} />
                </TouchableOpacity>
              )}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
