import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import * as FileSystem from 'expo-file-system/legacy';
import type { STTResult } from '../types/record';
import { getNetworkState } from '../utils/network';

// STT 설정
const STT_CONFIDENCE_THRESHOLD = 0.7;
const STT_MIN_TEXT_LENGTH = 5;
// Android는 파일 기반 STT 미지원 → 즉시 스킵
const DEVICE_STT_TIMEOUT = Platform.OS === 'ios' ? 15000 : 0;

interface DeviceSTTResult {
  text: string;
  confidence: number;
}

// 기기 내장 STT (expo-speech-recognition, iOS 전용)
async function deviceSTT(audioUri: string): Promise<DeviceSTTResult> {
  // Android는 파일 기반 STT 미지원 → 즉시 반환
  if (DEVICE_STT_TIMEOUT === 0) {
    return { text: '', confidence: 0 };
  }

  const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!granted) {
    return { text: '', confidence: 0 };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try { ExpoSpeechRecognitionModule.abort(); } catch {}
      resolve({ text: '', confidence: 0 });
    }, DEVICE_STT_TIMEOUT);

    let finalText = '';
    let finalConfidence = 0;

    const resultSub = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event: ExpoSpeechRecognitionResultEvent) => {
        if (event.isFinal && event.results?.length > 0) {
          finalText = event.results[0].transcript;
          finalConfidence = event.results[0].confidence ?? 0.8;
        }
      }
    );

    const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
      clearTimeout(timeout);
      resultSub.remove();
      endSub.remove();
      errorSub.remove();
      resolve({ text: finalText, confidence: finalConfidence });
    });

    const errorSub = ExpoSpeechRecognitionModule.addListener('error', () => {
      clearTimeout(timeout);
      resultSub.remove();
      endSub.remove();
      errorSub.remove();
      resolve({ text: '', confidence: 0 });
    });

    ExpoSpeechRecognitionModule.start({
      lang: 'ko-KR',
      interimResults: false,
      continuous: false,
      audioSource: {
        uri: audioUri,
        audioChannels: 1,
        sampleRate: 44100,
      },
    });
  });
}

// 무음 파일 최소 크기 (10KB 미만이면 의미있는 음성 없음으로 판단)
const MIN_AUDIO_FILE_SIZE = 10 * 1024;

// 이름 변형 목록 생성 (Whisper 힌트용)
// 예) "서지원" → ["서지원", "지원이", "지원"]
function generateNameVariants(name: string): string[] {
  const variants = new Set<string>([name]);

  if (name.length >= 3) {
    const givenName = name.slice(1); // 성 제외 이름
    variants.add(givenName);

    // 받침 여부 확인 → 이 suffix
    const code = givenName.charCodeAt(givenName.length - 1);
    const hasBatchim = code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0;
    if (hasBatchim) variants.add(givenName + '이');
  } else {
    const code = name.charCodeAt(name.length - 1);
    const hasBatchim = code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0;
    if (hasBatchim) variants.add(name + '이');
  }

  return [...variants];
}

// STT 환각 패턴 블랙리스트 (Whisper + 디바이스 STT 공통)
const HALLUCINATION_PATTERNS = [
  '시청해주셔서 감사합니다',
  '구독과 좋아요',
  '좋아요와 구독',
  'MBC 뉴스',
  'KBS 뉴스',
  'SBS 뉴스',
  '안녕하세요',
  'thank you for watching',
  'thanks for watching',
  'please subscribe',
  '다음 영상에서 만나요',
  '좋아요 구독 알림',
  '영상이 도움이 되셨다면',
  'subtitles by',
  '자막 제공',
];

function isHallucination(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return HALLUCINATION_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

// 오디오 파일 크기로 무음 여부 판단
async function isSilentAudio(audioUri: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) return true;
    return (fileInfo.size ?? 0) < MIN_AUDIO_FILE_SIZE;
  } catch {
    return false;
  }
}

// Whisper API fallback
async function whisperSTT(audioUri: string, subjectName?: string): Promise<string> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    throw new Error('Worker URL 또는 Secret이 설정되지 않았습니다');
  }

  const fileInfo = await FileSystem.getInfoAsync(audioUri);
  if (!fileInfo.exists) {
    throw new Error('오디오 파일을 찾을 수 없습니다');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'audio.m4a',
  } as any);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ko');
  const basePrompt = '발달장애인 돌봄 기록입니다. 의료, 투약, 행동, 일상, 치료 관련 내용입니다.';
  const nameHint = subjectName
    ? ` 관찰 대상 이름: ${generateNameVariants(subjectName).join(', ')}.`
    : '';
  formData.append('prompt', basePrompt + nameHint);

  const response = await fetch(`${workerUrl}/stt`, {
    method: 'POST',
    headers: {
      'X-App-Secret': workerSecret,
    },
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('[STT] Whisper 오류 응답:', errBody);
    throw new Error(`Whisper API 오류: ${response.status}`);
  }

  const data = await response.json();
  const text: string = data.text || '';
  const trimmed = text.trim();

  // 10자 미만이거나 환각 패턴이면 빈 텍스트 반환
  if (trimmed.length < 10 || isHallucination(trimmed)) return '';
  return trimmed;
}

// 통합 STT 파이프라인
export async function processSTT(audioUri: string, subjectName?: string): Promise<STTResult> {
  // 0단계: 파일 크기 기반 무음 감지
  if (await isSilentAudio(audioUri)) {
    console.log('[STT] 무음 감지 (파일 크기 기준) — STT 스킵');
    throw new Error('녹음된 내용이 없습니다.');
  }

  // 1단계: 기기 내장 STT 시도
  try {
    const deviceResult = await deviceSTT(audioUri);

    if (
      deviceResult.confidence >= STT_CONFIDENCE_THRESHOLD &&
      deviceResult.text.length >= STT_MIN_TEXT_LENGTH
    ) {
      // 디바이스 STT 결과에도 환각 필터 적용
      if (isHallucination(deviceResult.text)) {
        console.log('[STT] 디바이스 STT 환각 감지:', deviceResult.text);
      } else {
        return {
          text: deviceResult.text,
          confidence: deviceResult.confidence,
          source: 'device',
        };
      }
    }

    // 2단계: Whisper fallback
    const isOnline = await getNetworkState();
    console.log('[STT] 온라인 상태:', isOnline);
    if (isOnline) {
      try {
        const whisperText = await whisperSTT(audioUri, subjectName);
        if (whisperText.length > 0) {
          return {
            text: whisperText,
            confidence: 0.9,
            source: 'whisper',
          };
        }
      } catch (e) {
        console.error('[STT] Whisper 실패:', e);
      }
    }

    if (deviceResult.text.length > 0 && !isHallucination(deviceResult.text)) {
      return {
        text: deviceResult.text,
        confidence: deviceResult.confidence,
        source: 'device',
      };
    }

    throw new Error('음성 인식에 실패했습니다. 다시 시도해 주세요.');
  } catch (error) {
    console.error('[STT] 전체 실패:', error);
    const isOnline = await getNetworkState();
    if (isOnline) {
      try {
        const whisperText = await whisperSTT(audioUri, subjectName);
        if (whisperText.length > 0) {
          return {
            text: whisperText,
            confidence: 0.9,
            source: 'whisper',
          };
        }
      } catch (e) {
        console.error('[STT] Whisper 재시도 실패:', e);
      }
    }
    throw new Error('음성 인식에 실패했습니다. 다시 시도해 주세요.');
  }
}
