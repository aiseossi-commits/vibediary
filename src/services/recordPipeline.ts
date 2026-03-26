import { processSTT } from './stt';
import { processWithAI, createFallbackResult, generateEmbedding } from './aiProcessor';
import { createRecord } from '../db/recordsDao';
import { setTagsForRecord, getAllTags } from '../db/tagsDao';
import { addToOfflineQueue } from './offlineQueue';
import { getDatabase } from '../db/database';

const BASE_TAG_NAMES = ['#의료', '#투약', '#행동', '#일상', '#치료'];

async function getCustomTagNames(): Promise<string[]> {
  try {
    const all = await getAllTags();
    return all.map((t) => t.name).filter((n) => !BASE_TAG_NAMES.includes(n));
  } catch {
    return [];
  }
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

  const customTags = await getCustomTagNames();
  try {
    aiResult = await processWithAI(text, customTags);
  } catch (e) {
    console.error('[Pipeline] AI 처리 실패 (fromText):', e);
    aiResult = createFallbackResult(text);
    aiPending = true;
  }

  const embedding = !aiPending ? await generateEmbedding(text || aiResult.summary) : null;

  const db = await getDatabase();
  let recordId!: string;
  await db.withTransactionAsync(async () => {
    recordId = await createRecord({
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
  });

  return recordId;
}

// 텍스트 직접 입력 → 기록 생성 파이프라인 (STT 건너뜀)
export async function processTextRecord(text: string, childId?: string, date?: string): Promise<string> {
  // 1. AI 처리 시도
  let aiResult;
  let aiPending = false;

  const customTags = await getCustomTagNames();
  try {
    aiResult = await processWithAI(text, customTags);
  } catch (e) {
    console.error('[Pipeline] AI 처리 실패 (textRecord):', e);
    aiResult = createFallbackResult(text);
    aiPending = true;
  }

  // 2. embedding 생성 + DB 저장 (트랜잭션)
  const embedding = !aiPending ? await generateEmbedding(text || aiResult.summary) : null;

  const db = await getDatabase();
  let recordId!: string;
  await db.withTransactionAsync(async () => {
    recordId = await createRecord({
      audioPath: '',
      rawText: text,
      summary: aiResult.summary,
      structuredData: aiResult.structuredData,
      embedding,
      aiPending,
      childId,
      createdAt: date ? new Date(date + 'T12:00:00').getTime() : undefined,
    });
    await setTagsForRecord(recordId, aiResult.tags);
    if (aiPending) {
      await addToOfflineQueue(recordId, text);
    }
  });

  return recordId;
}
