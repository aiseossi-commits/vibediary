import { processSTT } from './stt';
import { processWithAI, createFallbackResult, generateEmbedding } from './aiProcessor';
import { createRecord } from '../db/recordsDao';
import { setTagsForRecord } from '../db/tagsDao';
import { addToOfflineQueue } from './offlineQueue';

// 전체 녹음 → 기록 생성 파이프라인
export async function processRecording(audioUri: string, createdAt?: number, childId?: string, childName?: string): Promise<string> {
  // 1. STT 변환 — 실패하거나 빈 텍스트면 저장 자체를 차단
  const sttResult = await processSTT(audioUri, childName);
  if (!sttResult.text.trim()) {
    throw new Error('NO_SPEECH');
  }

  // 2. AI 처리 시도
  let aiResult;
  let aiPending = false;

  try {
    aiResult = await processWithAI(sttResult.text);
  } catch (e) {
    console.error('[Pipeline] AI 처리 실패:', e);
    aiResult = createFallbackResult(sttResult.text);
    aiPending = true;
  }

  // 3. embedding 생성 (AI 처리 성공 시에만)
  const embedding = !aiPending ? await generateEmbedding(aiResult.summary) : null;

  // 4. DB에 기록 저장
  const recordId = await createRecord({
    audioPath: audioUri,
    rawText: sttResult.text,
    summary: aiResult.summary,
    structuredData: aiResult.structuredData,
    embedding,
    aiPending,
    createdAt,
    childId,
  });

  // 5. 태그 연결
  await setTagsForRecord(recordId, aiResult.tags);

  // 6. AI 실패 시 오프라인 큐에 추가 (rawText가 있을 때만)
  if (aiPending && sttResult.text.trim().length > 0) {
    await addToOfflineQueue(recordId, sttResult.text);
  }

  return recordId;
}

// STT만 실행, 실패 시 빈 문자열 반환
export async function runSTTOnly(audioUri: string, subjectName?: string): Promise<string> {
  try {
    const sttResult = await processSTT(audioUri, subjectName);
    return sttResult.text;
  } catch {
    return '';
  }
}

// 텍스트 받아서 AI 처리 + DB 저장
export async function processFromText(audioUri: string, text: string, createdAt?: number, childId?: string): Promise<string> {
  let aiResult;
  let aiPending = false;

  if (!text.trim()) {
    throw new Error('NO_SPEECH');
  }

  try {
    aiResult = await processWithAI(text);
  } catch (e) {
    console.error('[Pipeline] AI 처리 실패 (fromText):', e);
    aiResult = createFallbackResult(text);
    aiPending = true;
  }

  const embedding = !aiPending ? await generateEmbedding(aiResult.summary) : null;

  const recordId = await createRecord({
    audioPath: audioUri,
    rawText: text,
    summary: aiResult.summary,
    structuredData: aiResult.structuredData,
    embedding,
    aiPending,
    createdAt,
    childId,
  });

  await setTagsForRecord(recordId, aiResult.tags);

  if (aiPending && text.trim().length > 0) {
    await addToOfflineQueue(recordId, text);
  }

  return recordId;
}

// 텍스트 직접 입력 → 기록 생성 파이프라인 (STT 건너뜀)
export async function processTextRecord(text: string, childId?: string, date?: string): Promise<string> {
  // 1. AI 처리 시도
  let aiResult;
  let aiPending = false;

  try {
    aiResult = await processWithAI(text);
  } catch (e) {
    console.error('[Pipeline] AI 처리 실패 (textRecord):', e);
    aiResult = createFallbackResult(text);
    aiPending = true;
  }

  // 2. embedding 생성 + DB 저장
  const embedding = !aiPending ? await generateEmbedding(aiResult.summary) : null;

  const recordId = await createRecord({
    audioPath: '',
    rawText: text,
    summary: aiResult.summary,
    structuredData: aiResult.structuredData,
    embedding,
    aiPending,
    childId,
    createdAt: date ? new Date(date + 'T12:00:00').getTime() : undefined,
  });

  // 3. 태그 연결
  await setTagsForRecord(recordId, aiResult.tags);

  // 4. AI 실패 시 오프라인 큐에 추가
  if (aiPending) {
    await addToOfflineQueue(recordId, text);
  }

  return recordId;
}
