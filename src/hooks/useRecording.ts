import { useState, useRef, useCallback, useEffect } from 'react';
import {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  setMeteringCallback,
  type RecordingResult,
} from '../services/audioRecorder';

interface UseRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  isStarting: boolean;
  duration: number; // seconds
  audioLevel: number; // 0~1
  start: () => Promise<void>;
  stop: () => Promise<RecordingResult>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  error: string | null;
}

export function useRecording(): UseRecordingReturn {
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const avgLevelRef = useRef({ sum: 0, count: 0 });

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      setMeteringCallback(null);
    };
  }, [stopTimer]);

  const start = useCallback(async () => {
    if (isActive || isStarting) return; // 중복 시작 방지
    try {
      setError(null);
      setDuration(0);
      setAudioLevel(0);
      setIsStarting(true);
      avgLevelRef.current = { sum: 0, count: 0 }; // 시작 시 리셋
      setMeteringCallback((level) => {
        setAudioLevel(level);
        avgLevelRef.current.sum += level;
        avgLevelRef.current.count++;
      });
      await startRecording();
      setIsActive(true);
      setIsPaused(false);
      startTimer();
    } catch (e) {
      setMeteringCallback(null);
      setError(e instanceof Error ? e.message : '녹음 시작에 실패했습니다');
    } finally {
      setIsStarting(false);
    }
  }, [isActive, isStarting, startTimer]);

  const stop = useCallback(async (): Promise<RecordingResult> => {
    try {
      stopTimer();
      setMeteringCallback(null);
      setAudioLevel(0);
      const result = await stopRecording();
      setIsActive(false);
      setIsPaused(false);
      setDuration(0);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : '녹음 정지에 실패했습니다');
      throw e;
    }
  }, [stopTimer]);

  const pause = useCallback(async () => {
    try {
      await pauseRecording();
      setIsPaused(true);
      setAudioLevel(0);
      stopTimer();
    } catch (e) {
      setError(e instanceof Error ? e.message : '일시중지에 실패했습니다');
    }
  }, [stopTimer]);

  const getAverageAudioLevel = useCallback(() => {
    const { sum, count } = avgLevelRef.current;
    return count > 0 ? sum / count : 0;
  }, []);

  const resume_ = useCallback(async () => {
    try {
      setMeteringCallback((level) => {
        setAudioLevel(level);
        avgLevelRef.current.sum += level;
        avgLevelRef.current.count++;
      });
      await resumeRecording();
      setIsPaused(false);
      startTimer();
    } catch (e) {
      setError(e instanceof Error ? e.message : '재개에 실패했습니다');
    }
  }, [startTimer]);

  return {
    isRecording: isActive,
    isPaused,
    isStarting,
    duration,
    audioLevel,
    getAverageAudioLevel,
    start,
    stop,
    pause,
    resume: resume_,
    error,
  };
}
