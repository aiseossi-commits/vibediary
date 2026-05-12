import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';
import { createRecord } from '../db/recordsDao';
import { markRecordDirty, wakeSync } from './sync';
import { getAIUsage, incrementAIUsage, AI_MONTHLY_LIMIT } from '../db/appSettingsDao';

const MAX_DIMENSION = 1024; // 긴 변 최대 1024px → JPEG 0.7 기준 약 100~200KB
const COMPRESS_QUALITY = 0.7;

export interface PhotoResult {
  uri: string;
  base64?: string;
}

async function compressImage(uri: string, width: number, height: number): Promise<PhotoResult> {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    scale < 1 ? [{ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } }] : [],
    { compress: COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return { uri: compressed.uri, base64: compressed.base64 ?? undefined };
}

export async function takePhoto(): Promise<PhotoResult | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('카메라 권한이 필요합니다. 설정에서 허용해 주세요.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const { uri, width, height } = result.assets[0];
  return compressImage(uri, width, height);
}

export async function pickPhotoFromLibrary(): Promise<PhotoResult | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('사진 접근 권한이 필요합니다. 설정에서 허용해 주세요.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const { uri, width, height } = result.assets[0];
  return compressImage(uri, width, height);
}

export async function uploadPhoto(uri: string, userId: string, recordId: string, base64?: string): Promise<string> {
  const path = `${userId}/${recordId}.jpg`;

  let uint8Array: Uint8Array;
  if (base64) {
    const binaryStr = atob(base64);
    uint8Array = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      uint8Array[i] = binaryStr.charCodeAt(i);
    }
  } else {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    uint8Array = new Uint8Array(arrayBuffer);
  }

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, uint8Array, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw new Error(`사진 업로드 실패: ${error.message}`);

  return path; // URL 대신 path 저장 — 표시 시 signed URL 발급
}

type CacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, CacheEntry>();

export async function getSignedPhotoUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return '';
  // 기존 레코드 중 full URL이 저장된 경우 그대로 반환
  if (pathOrUrl.startsWith('https://')) return pathOrUrl;

  const cached = signedUrlCache.get(pathOrUrl);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

  const { data, error } = await supabase.storage
    .from('photos')
    .createSignedUrl(pathOrUrl, 3600); // 1시간

  if (error || !data?.signedUrl) throw new Error('사진 URL 생성 실패');

  signedUrlCache.set(pathOrUrl, { url: data.signedUrl, expiresAt: Date.now() + 3_600_000 });
  return data.signedUrl;
}

export async function savePhotoRecord(params: {
  photoUrl: string;
  childId: string | null;
  tags?: string[];
  date?: string; // YYYY-MM-DD, 미지정 시 현재 시각
}): Promise<string> {
  const createdAt = params.date
    ? new Date(params.date + 'T12:00:00').getTime()
    : Date.now();
  const id = await createRecord({
    summary: '',
    photoUrl: params.photoUrl,
    childId: params.childId,
    source: 'voice',
    createdAt,
  });
  await markRecordDirty(id);
  void wakeSync('record_changed');
  return id;
}

export async function analyzePhotoTags(params: {
  base64: string;
  childId?: string | null;
}): Promise<string[]> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { count, month } = await getAIUsage();
  const effectiveCount = month === currentMonth ? count : 0;
  if (effectiveCount >= AI_MONTHLY_LIMIT) {
    throw new Error('LIMIT_EXCEEDED');
  }

  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    throw new Error('Worker 설정이 필요합니다');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  let response: Response;
  try {
    response = await fetch(
      `${workerUrl}/ai?model=gemini-2.5-flash-lite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Secret': workerSecret,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: TAG_ANALYSIS_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: params.base64,
                  },
                },
                { text: '이 사진에 적합한 태그를 JSON 배열로 반환하세요.' },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`AI 태깅 실패 (${response.status})`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

  let tags: string[] = [];
  try {
    const cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const parsed = JSON.parse(cleaned);
    tags = Array.isArray(parsed) ? parsed : (parsed.tags ?? []);
  } catch {
    tags = [];
  }

  await incrementAIUsage();
  return tags;
}

const TAG_ANALYSIS_SYSTEM_PROMPT = `당신은 발달장애인 돌봄 가족의 사진 기록을 분석하는 AI입니다.
사진을 보고 아래 태그 목록에서 적합한 것을 선택해 JSON 배열로 반환하세요.

사용 가능한 태그:
#의료, #투약, #치료, #언어치료, #작업치료, #감각통합치료, #ABA치료, #놀이치료, #물리치료,
#배변, #수면, #감각, #각성, #건강, #행동, #기분, #상동행동, #발달, #검사, #상담, #교육기관, #식단, #일상

규칙:
- 사진에서 명확히 확인되는 내용에 해당하는 태그만 선택
- 1~4개 태그 반환
- 반드시 유효한 JSON 배열만 응답: ["#태그1", "#태그2"]`;
