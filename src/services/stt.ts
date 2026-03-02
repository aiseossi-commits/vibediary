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

// Whisper API fallback
async function whisperSTT(audioUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다');
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

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper API 오류: ${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
}

// 통합 STT 파이프라인
export async function processSTT(audioUri: string): Promise<STTResult> {
  // 1단계: 기기 내장 STT 시도
  try {
    const deviceResult = await deviceSTT(audioUri);

    if (
      deviceResult.confidence >= STT_CONFIDENCE_THRESHOLD &&
      deviceResult.text.length >= STT_MIN_TEXT_LENGTH
    ) {
      return {
        text: deviceResult.text,
        confidence: deviceResult.confidence,
        source: 'device',
      };
    }

    // 2단계: Whisper fallback
    const isOnline = await getNetworkState();
    if (isOnline) {
      try {
        const whisperText = await whisperSTT(audioUri);
        if (whisperText.length > 0) {
          return {
            text: whisperText,
            confidence: 0.9,
            source: 'whisper',
          };
        }
      } catch {
        // Whisper 실패 시 기기 STT 결과라도 사용
      }
    }

    if (deviceResult.text.length > 0) {
      return {
        text: deviceResult.text,
        confidence: deviceResult.confidence,
        source: 'device',
      };
    }

    throw new Error('음성 인식에 실패했습니다. 다시 시도해 주세요.');
  } catch (error) {
    // 기기 STT 완전 실패 시 Whisper만 시도
    const isOnline = await getNetworkState();
    if (isOnline) {
      try {
        const whisperText = await whisperSTT(audioUri);
        return {
          text: whisperText,
          confidence: 0.9,
          source: 'whisper',
        };
      } catch {
        // Whisper도 실패
      }
    }
    throw new Error('음성 인식에 실패했습니다. 다시 시도해 주세요.');
  }
}
