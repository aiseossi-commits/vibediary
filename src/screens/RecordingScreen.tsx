import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
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
  const scale = useRef(new Animated.Value(1)).current;
  const r1 = useRef(new Animated.Value(60)).current;
  const r2 = useRef(new Animated.Value(60)).current;
  const r3 = useRef(new Animated.Value(60)).current;
  const r4 = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, a: number, b: number, dur: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: a, duration: dur, useNativeDriver: false }),
        Animated.timing(anim, { toValue: b, duration: dur, useNativeDriver: false }),
      ]));

    const l1 = makeLoop(r1, 52, 70, 900);
    const l2 = makeLoop(r2, 72, 50, 1100);
    const l3 = makeLoop(r3, 58, 74, 1300);
    const l4 = makeLoop(r4, 68, 52, 950);
    l1.start(); l2.start(); l3.start(); l4.start();

    return () => { l1.stop(); l2.stop(); l3.stop(); l4.stop(); };
  }, []);

  useEffect(() => {
    const target = audioLevel > 0.05 ? 1 + audioLevel * 0.5 : 1;
    Animated.spring(scale, { toValue: target, useNativeDriver: true, damping: 8, stiffness: 120 }).start();
  }, [audioLevel]);

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Animated.View style={{
          width: 120, height: 120,
          backgroundColor: color,
          opacity: 0.85,
          borderTopLeftRadius: r1,
          borderTopRightRadius: r2,
          borderBottomRightRadius: r3,
          borderBottomLeftRadius: r4,
        }} />
      </Animated.View>
    </View>
  );
}

export default function RecordingScreen({ onRecordingComplete, onCancel, isProcessing = false }: RecordingScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isRecording, isStarting, duration, audioLevel, getAverageAudioLevel, start, stop, error } = useRecording();

  React.useEffect(() => { start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
            <Text style={[styles.timer, duration >= 25 && { color: colors.recordingRed }]}>
              {formatDuration(duration)}
            </Text>
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
