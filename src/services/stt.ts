import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import type { STTResult } from '../types/record';
import { getNetworkState } from '../utils/network';

// STT 설정
const STT_CONFIDENCE_THRESHOLD = 0.7;
const STT_MIN_TEXT_LENGTH = 5;

// 기기 내장 STT를 위한 인터페이스 (플랫폼별 네이티브 모듈 필요)
// React Native에서는 @react-native-voice/voice 또는 expo-speech-recognition 사용
// 현재는 인터페이스만 정의하고, 실제 구현은 네이티브 모듈 연동 시 완성

interface DeviceSTTResult {
  text: string;
  confidence: number;
}

// 기기 내장 STT 처리
async function deviceSTT(audioUri: string): Promise<DeviceSTTResult> {
  // TODO: 플랫폼별 네이티브 STT 연동
  // iOS: Speech Framework (expo-speech-recognition)
  // Android: SpeechRecognizer
  // 현재는 플레이스홀더 — 실제 디바이스에서 연동 필요

  // expo-speech-recognition이 설치되면 여기서 사용
  // 임시로 빈 결과 반환 (실제 앱에서는 네이티브 모듈 필요)
  return {
    text: '',
    confidence: 0,
  };
}

// Whisper API fallback
async function whisperSTT(audioUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다');
  }

  // 파일 읽기
  const fileInfo = await FileSystem.getInfoAsync(audioUri);
  if (!fileInfo.exists) {
    throw new Error('오디오 파일을 찾을 수 없습니다');
  }

  // Whisper API 호출 (multipart/form-data)
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

    // confidence가 충분하고 텍스트가 길면 기기 STT 결과 사용
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

    // 2단계: Whisper fallback (네트워크 필요)
    const isOnline = await getNetworkState();
    if (isOnline) {
      try {
        const whisperText = await whisperSTT(audioUri);
        if (whisperText.length > 0) {
          return {
            text: whisperText,
            confidence: 0.9, // Whisper는 일반적으로 높은 정확도
            source: 'whisper',
          };
        }
      } catch {
        // Whisper 실패 시 기기 STT 결과라도 사용
      }
    }

    // 기기 STT 결과가 있으면 그대로 사용
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
      const whisperText = await whisperSTT(audioUri);
      return {
        text: whisperText,
        confidence: 0.9,
        source: 'whisper',
      };
    }
    throw new Error('오프라인 상태에서 음성 인식에 실패했습니다');
  }
}
