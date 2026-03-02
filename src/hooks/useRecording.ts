import { useState, useRef, useCallback, useEffect } from 'react';
import {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  type RecordingResult,
} from '../services/audioRecorder';

interface UseRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // seconds
  start: () => Promise<void>;
  stop: () => Promise<RecordingResult>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  error: string | null;
}

export function useRecording(): UseRecordingReturn {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 타이머 시작
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // 타이머 정지
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const start = useCallback(async () => {
    try {
      setError(null);
      setDuration(0);
      await startRecording();
      setIsActive(true);
      setIsPaused(false);
      startTimer();
    } catch (e) {
      setError(e instanceof Error ? e.message : '녹음 시작에 실패했습니다');
    }
  }, [startTimer]);

  const stop = useCallback(async (): Promise<RecordingResult> => {
    try {
      stopTimer();
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
      stopTimer();
    } catch (e) {
      setError(e instanceof Error ? e.message : '일시중지에 실패했습니다');
    }
  }, [stopTimer]);

  const resume_ = useCallback(async () => {
    try {
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
    duration,
    start,
    stop,
    pause,
    resume: resume_,
    error,
  };
}
