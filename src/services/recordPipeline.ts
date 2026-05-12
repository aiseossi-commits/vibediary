import { processSTT } from './stt';
import { processWithAI } from './aiProcessor';
import { createRecord } from '../db/recordsDao';
import { setTagsForRecord, getAllTags } from '../db/tagsDao';
import { addToOfflineQueue } from './offlineQueue';
import { getDatabase } from '../db/database';
import { DEFAULT_TAGS } from '../db/schema';
import { markRecordDirty, wakeSync } from './syncService';
import { validateAndCleanStructuredData } from './recordValidation';

async function getCustomTagNames(childId?: string): Promise<string[]> {
  try {
    const all = await getAllTags(childId);
    return all.map((t) => t.name).filter((n) => !DEFAULT_TAGS.includes(n));
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
export async function processFromText(text: string, createdAt?: number, childId?: string, photoUrl?: string | null): Promise<string> {
  let aiResult;
  let aiPending = false;

  if (!text.trim()) {
    throw new Error('NO_SPEECH');
  }

  const customTags = await getCustomTagNames(childId);
  try {
    aiResult = await processWithAI(text, customTags);
    // 후처리 검증
    aiResult = validateAndCleanStructuredData(aiResult, customTags);
  } catch (e) {
    console.error('[Pipeline] AI 처리 실패 (fromText):', e);
    aiResult = { summary: text.length > 100 ? text.substring(0, 100) + '...' : text, tags: ['#일상'], structuredData: null };
    aiPending = true;
  }

  const db = await getDatabase();
  let recordId!: string;
  await db.withTransactionAsync(async () => {
    recordId = await createRecord({
      audioPath: null,
      rawText: text,
      summary: aiResult.summary,
      structuredData: aiPending ? null : aiResult.structuredData,
      aiPending,
      createdAt,
      childId,
      source: 'voice',
      photoUrl: photoUrl ?? null,
    });
    await setTagsForRecord(recordId, aiResult.tags, childId);
    if (aiPending && text.trim().length > 0) {
      await addToOfflineQueue(recordId, text);
    }
  });

  await markRecordDirty(recordId);
  void wakeSync('record_changed');
  return recordId;
}

// 텍스트 직접 입력 → 기록 생성 파이프라인 (STT 건너뜀)
export async function processTextRecord(text: string, childId?: string, date?: string, timestamp?: number): Promise<string> {
  // 1. AI 처리 시도
  let aiResult;
  let aiPending = false;

  const customTags = await getCustomTagNames(childId);
  try {
    aiResult = await processWithAI(text, customTags);
    // 후처리 검증
    aiResult = validateAndCleanStructuredData(aiResult, customTags);
  } catch (e) {
    console.error('[Pipeline] AI 처리 실패 (textRecord):', e);
    aiResult = { summary: text.length > 100 ? text.substring(0, 100) + '...' : text, tags: ['#일상'], structuredData: null };
    aiPending = true;
  }

  // 2. DB 저장 (트랜잭션)
  const db = await getDatabase();
  let recordId!: string;
  await db.withTransactionAsync(async () => {
    recordId = await createRecord({
      audioPath: '',
      rawText: text,
      summary: aiResult.summary,
      structuredData: aiPending ? null : aiResult.structuredData,

      aiPending,
      childId,
      createdAt: timestamp ?? (date ? new Date(date + 'T23:59:59').getTime() : undefined),
      source: 'calendar_text',
    });
    await setTagsForRecord(recordId, aiResult.tags, childId);
    if (aiPending) {
      await addToOfflineQueue(recordId, text);
    }
  });

  await markRecordDirty(recordId);
  void wakeSync('record_changed');
  return recordId;
}
