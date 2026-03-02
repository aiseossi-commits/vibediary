import { processSTT } from './stt';
import { processWithAI, createFallbackResult } from './aiProcessor';
import { createRecord } from '../db/recordsDao';
import { setTagsForRecord } from '../db/tagsDao';
import { addToOfflineQueue } from './offlineQueue';
import type { RecordWithTags } from '../types/record';

// 전체 녹음 → 기록 생성 파이프라인
export async function processRecording(audioUri: string): Promise<string> {
  // 1. STT 변환 (실패해도 기록은 저장)
  let sttResult;
  try {
    sttResult = await processSTT(audioUri);
  } catch {
    sttResult = { text: '', confidence: 0, source: 'device' as const };
  }

  // 2. AI 처리 시도 (STT 텍스트가 있을 때만)
  let aiResult;
  let aiPending = false;

  if (sttResult.text.trim().length > 0) {
    try {
      aiResult = await processWithAI(sttResult.text);
    } catch {
      aiResult = createFallbackResult(sttResult.text);
      aiPending = true;
    }
  } else {
    // STT 실패 → 텍스트 없음, AI 처리 불가 → aiPending=false
    aiResult = { ...createFallbackResult(''), summary: '음성 저장됨 (텍스트 변환 실패)' };
    aiPending = false;
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

  // 5. AI 실패 시 오프라인 큐에 추가 (rawText가 있을 때만)
  if (aiPending && sttResult.text.trim().length > 0) {
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
