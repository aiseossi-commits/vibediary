import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecording } from '../hooks/useRecording';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, TOUCH_TARGET, TYPOGRAPHY } from '../constants/theme';

interface RecordingScreenProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export default function RecordingScreen({ onRecordingComplete, onCancel, isProcessing = false }: RecordingScreenProps) {
  const { isRecording, isPaused, isStarting, duration, audioLevel, getAverageAudioLevel, start, stop, pause, resume, error } = useRecording();

  // 화면 진입 시 자동 녹음 시작
  React.useEffect(() => {
    start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = useCallback(async () => {
    if (isStarting) return; // 시작 중이면 무시
    if (!isRecording) {
      await start();
    } else if (isPaused) {
      await resume();
    } else {
      await pause();
    }
  }, [isRecording, isPaused, isStarting, start, pause, resume]);

  const MIN_DURATION = 3; // 최소 녹음 시간 (초)
  const LOW_AUDIO_THRESHOLD = 0.15; // 평균 오디오 레벨 임계값 (0~1)

  const handleStop = useCallback(async () => {
    try {
      // 3초 이하: 저장하지 않고 취소
      if (duration <= MIN_DURATION) {
        await stop();
        onCancel();
        return;
      }

      const avgLevel = getAverageAudioLevel();
      const result = await stop();

      // 평균 레벨이 낮으면 확인 팝업
      if (avgLevel <= LOW_AUDIO_THRESHOLD) {
        Alert.alert(
          '녹음이 되지 않았습니다',
          '내용을 저장할까요?',
          [
            { text: '취소', style: 'cancel', onPress: onCancel },
            { text: '저장', onPress: () => onRecordingComplete(result.uri, result.duration) },
          ]
        );
      } else {
        onRecordingComplete(result.uri, result.duration);
      }
    } catch {
      Alert.alert('오류', '녹음 저장에 실패했습니다');
    }
  }, [duration, stop, getAverageAudioLevel, onRecordingComplete, onCancel]);

  const handleCancel = useCallback(() => {
    if (isRecording) {
      Alert.alert('녹음 취소', '녹음을 취소하시겠습니까?', [
        { text: '계속 녹음', style: 'cancel' },
        {
          text: '취소',
          style: 'destructive',
          onPress: async () => {
            try {
              await stop();
            } catch {
              // 무시
            }
            onCancel();
          },
        },
      ]);
    } else {
      onCancel();
    }
  }, [isRecording, stop, onCancel]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 배경 글로우 오버레이 */}
      <View style={styles.bgGlow} pointerEvents="none" />
      {/* 상단 취소 버튼 */}
      <View style={styles.header}>
        {!isProcessing && (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 중앙 안내 */}
      <View style={styles.center}>
        {isProcessing && (
          <ActivityIndicator size="large" color={COLORS.primary} />
        )}
        {!isRecording && !isProcessing && (
          <Text style={styles.guideText}>기록에 치이지 말고,{'\n'}그냥 말하세요</Text>
        )}
        {isRecording && (
          <>
            {/* 실시간 파형 애니메이션 */}
            <View style={styles.waveform}>
              {[0.5, 0.75, 1.0, 0.75, 0.5, 0.85, 0.6].map((factor, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: isPaused ? 4 : Math.max(4, audioLevel * factor * 56),
                      opacity: isPaused ? 0.3 : 0.7 + factor * 0.3,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.statusText}>
              {isPaused ? '일시중지' : '녹음 중...'}
            </Text>
          </>
        )}
      </View>

      {/* 하단 컨트롤 (화면 하단 1/3 — 한 손 조작 최적화) */}
      <View style={styles.controls}>
        {/* 녹음 시간 */}
        <Text style={styles.timer}>{formatDuration(duration)}</Text>

        <View style={styles.buttonRow}>
          {/* 완료 버튼 (녹음 중일 때만) */}
          {isRecording && (
            <TouchableOpacity onPress={handleStop} style={styles.stopButton}>
              <View style={styles.stopIcon} />
            </TouchableOpacity>
          )}

          {/* 녹음 시작/일시중지 버튼 */}
          <TouchableOpacity
            onPress={handleToggleRecording}
            disabled={isStarting}
            style={[
              styles.recordButton,
              isRecording && !isPaused && styles.recordButtonActive,
              isStarting && { opacity: 0.5 },
            ]}
            activeOpacity={0.7}
          >
            {!isRecording ? (
              <View style={styles.recordDot} />
            ) : isPaused ? (
              <Text style={styles.resumeIcon}>▶</Text>
            ) : (
              <Text style={styles.pauseIcon}>❚❚</Text>
            )}
          </TouchableOpacity>

          {/* 공간 맞추기 */}
          {isRecording && <View style={{ width: TOUCH_TARGET.min }} />}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // 배경 글로우: 상단 중앙에 민트 원형 광원 효과
  bgGlow: {
    position: 'absolute',
    top: -80,
    left: '10%',
    right: '10%',
    height: 320,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    opacity: 0.12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  cancelButton: {
    padding: SPACING.sm,
  },
  cancelText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  guideText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 72,
    gap: 7,
  },
  waveBar: {
    width: 6,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.secondary,
    marginTop: SPACING.lg,
    fontWeight: FONT_WEIGHT.medium,
    letterSpacing: 0.5,
  },
  controls: {
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  timer: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  recordButton: {
    width: TOUCH_TARGET.recordButton,
    height: TOUCH_TARGET.recordButton,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  recordButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  recordDot: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.secondary,
  },
  resumeIcon: {
    fontSize: 26,
    color: COLORS.secondary,
  },
  pauseIcon: {
    fontSize: 22,
    color: COLORS.secondary,
    letterSpacing: 3,
  },
  stopButton: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.recordingRedLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 20,
    height: 20,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.recordingRed,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
});
