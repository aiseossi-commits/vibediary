import { processSTT } from './stt';
import { processWithAI, createFallbackResult } from './aiProcessor';
import { createRecord } from '../db/recordsDao';
import { setTagsForRecord } from '../db/tagsDao';
import { addToOfflineQueue } from './offlineQueue';
import type { RecordWithTags } from '../types/record';

// 전체 녹음 → 기록 생성 파이프라인
export async function processRecording(audioUri: string): Promise<string> {
  // 1. STT 변환
  const sttResult = await processSTT(audioUri);

  // 2. AI 처리 시도
  let aiResult;
  let aiPending = false;

  try {
    aiResult = await processWithAI(sttResult.text);
  } catch (error) {
    // AI 실패 (오프라인 포함) → fallback
    aiResult = createFallbackResult(sttResult.text);
    aiPending = true;
  }

  // 3. DB에 기록 저장
  const recordId = await createRecord({
    audioPath: audioUri,
    rawText: sttResult.text,
    summary: aiResult.summary,
    structuredData: aiResult.structuredData,
    mood: aiResult.mood,
    aiPending,
  });

  // 4. 태그 연결
  await setTagsForRecord(recordId, aiResult.tags);

  // 5. AI 실패 시 오프라인 큐에 추가
  if (aiPending) {
    await addToOfflineQueue(recordId, sttResult.text);
  }

  return recordId;
}

// 텍스트 직접 입력 → 기록 생성 파이프라인 (STT 건너뜀)
export async function processTextRecord(text: string): Promise<string> {
  // 1. AI 처리 시도
  let aiResult;
  let aiPending = false;

  try {
    aiResult = await processWithAI(text);
  } catch {
    aiResult = createFallbackResult(text);
    aiPending = true;
  }

  // 2. DB에 기록 저장 (audioPath 없음)
  const recordId = await createRecord({
    audioPath: '',
    rawText: text,
    summary: aiResult.summary,
    structuredData: aiResult.structuredData,
    mood: aiResult.mood,
    aiPending,
  });

  // 3. 태그 연결
  await setTagsForRecord(recordId, aiResult.tags);

  // 4. AI 실패 시 오프라인 큐에 추가
  if (aiPending) {
    await addToOfflineQueue(recordId, text);
  }

  return recordId;
}
