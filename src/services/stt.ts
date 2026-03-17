import { Platform } from 'react-native';
import type { ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';

// Expo Go에서는 네이티브 모듈 미지원 → 동적 로드로 폴백
let ExpoSpeechRecognitionModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null = null;
try {
  ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  // Expo Go 환경 — Whisper fallback 사용
}
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
async function deviceSTT(audioUri: string, subjectName?: string): Promise<DeviceSTTResult> {
  // Android 또는 Expo Go 환경 → 즉시 반환
  if (DEVICE_STT_TIMEOUT === 0 || !ExpoSpeechRecognitionModule) {
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

    const nameVariants = subjectName ? generateNameVariants(subjectName) : [];
    ExpoSpeechRecognitionModule.start({
      lang: 'ko-KR',
      interimResults: false,
      continuous: false,
      contextualStrings: nameVariants.length > 0 ? nameVariants : undefined,
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

// STT 환각 패턴 블랙리스트 — 전체 텍스트가 이 패턴이면 완전 차단
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

// 끝에 붙는 환각 패턴 — 실제 내용 뒤에 추가된 경우만 제거
const TRAILING_HALLUCINATION_PATTERNS = [
  '감사합니다',
  '감사해요',
  '시청해주셔서',
  '구독해주세요',
  'thank you',
  'thanks for watching',
  '다음에 또 만나요',
  '안녕히 계세요',
];

// 마지막 문장이 환각 패턴이면 제거 (실제 내용은 보존)
function stripTrailingHallucination(text: string): string {
  // 문장 단위로 분리 (.!? 기준)
  const parts = text.split(/(?<=[.!?])\s+/);
  while (parts.length > 1) {
    const last = parts[parts.length - 1].toLowerCase().trim();
    if (TRAILING_HALLUCINATION_PATTERNS.some((p) => last.includes(p.toLowerCase()))) {
      parts.pop();
    } else {
      break;
    }
  }
  return parts.join(' ').trim();
}

function isHallucination(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (HALLUCINATION_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) return true;

  // 한글이 없고 외국어만 있으면 환각 처리 (예: "quizas un mens Hispanic")
  const koreanChars = (text.match(/[\uAC00-\uD7A3\u3131-\u318E]/g) ?? []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (koreanChars === 0 && latinChars > 2) return true;

  // 같은 단어 3회 이상 연속 반복 → 환각 (예: "비싼 비싼 비싼")
  const words = text.trim().split(/\s+/);
  for (let i = 0; i < words.length - 2; i++) {
    if (words[i] === words[i + 1] && words[i] === words[i + 2]) return true;
  }

  return false;
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
  formData.append('response_format', 'verbose_json');
  const basePrompt = '발달장애인 돌봄 기록입니다. 의료, 투약, 행동, 일상, 치료 관련 내용입니다. 음성 발화가 없거나 소음만 있는 경우 빈 텍스트로 응답하세요.';
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
  const segments: { text?: string; no_speech_prob?: number }[] = data.segments ?? [];

  // 세그먼트가 있으면 no_speech_prob 낮은 것만 골라 재조합 (중간 환각 제거)
  let trimmed: string;
  if (segments.length > 0) {
    const validSegments = segments.filter((seg) => (seg.no_speech_prob ?? 0) < 0.5);
    // 유효 세그먼트가 전혀 없으면 무음 처리
    if (validSegments.length === 0) return '';
    trimmed = validSegments.map((seg) => (seg.text ?? '').trim()).join(' ').trim();
  } else {
    trimmed = (data.text || '').trim();
  }

  // 10자 미만이거나 환각 패턴이면 빈 텍스트 반환
  if (trimmed.length < 10 || isHallucination(trimmed)) return '';

  // 끝에 붙은 환각 패턴 제거 (실제 내용은 보존)
  const stripped = stripTrailingHallucination(trimmed);
  if (stripped.length < 10) return '';
  return stripped;
}

// 통합 STT 파이프라인
export async function processSTT(audioUri: string, subjectName?: string): Promise<STTResult> {
  // 0단계: 파일 크기 기반 무음 감지
  if (await isSilentAudio(audioUri)) {
    throw new Error('녹음된 내용이 없습니다.');
  }

  // 1단계: 기기 내장 STT 시도
  try {
    const deviceResult = await deviceSTT(audioUri, subjectName);

    if (
      deviceResult.confidence >= STT_CONFIDENCE_THRESHOLD &&
      deviceResult.text.length >= STT_MIN_TEXT_LENGTH
    ) {
      // 디바이스 STT 결과에도 환각 필터 적용
      if (isHallucination(deviceResult.text)) {
        // 환각 감지 — fallback 진행
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
