import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { createRecord } from '../db/recordsDao';
import { getAIUsage, incrementAIUsage, AI_MONTHLY_LIMIT } from '../db/appSettingsDao';

export interface PhotoResult {
  uri: string;
  base64?: string;
}

export async function takePhoto(): Promise<PhotoResult | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('카메라 권한이 필요합니다. 설정에서 허용해 주세요.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return { uri: asset.uri, base64: asset.base64 ?? undefined };
}

export async function uploadPhoto(uri: string, userId: string, recordId: string): Promise<string> {
  const path = `${userId}/${recordId}.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, uint8Array, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw new Error(`사진 업로드 실패: ${error.message}`);

  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  if (!data.publicUrl) throw new Error('사진 URL을 가져올 수 없습니다');

  return data.publicUrl;
}

export async function savePhotoRecord(params: {
  photoUrl: string;
  childId: string | null;
  tags?: string[];
}): Promise<string> {
  return createRecord({
    summary: '',
    photoUrl: params.photoUrl,
    childId: params.childId,
    source: 'voice', // photo 기록은 photo_url IS NOT NULL로 구분
  });
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
