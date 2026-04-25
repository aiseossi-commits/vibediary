import { processSTT } from './stt';
import { processWithAI } from './aiProcessor';
import { createRecord } from '../db/recordsDao';
import { setTagsForRecord, getAllTags } from '../db/tagsDao';
import { addToOfflineQueue } from './offlineQueue';
import { getDatabase } from '../db/database';
import { DEFAULT_TAGS } from '../db/schema';
import { markRecordDirty, wakeSync } from './syncService';
import type { AIProcessingResult } from '../types/record';

async function getCustomTagNames(childId?: string): Promise<string[]> {
  try {
    const all = await getAllTags(childId);
    return all.map((t) => t.name).filter((n) => !DEFAULT_TAGS.includes(n));
  } catch {
    return [];
  }
}

// 후처리 검증: AI 응답 정제 (consequence 정제, tags 정규화, #행동 배치)
export function validateAndCleanStructuredData(result: AIProcessingResult, customTagNames: string[]): AIProcessingResult {
  const allowedTags = new Set([...DEFAULT_TAGS, ...customTagNames]);

  // 1. consequence 정제: 의료 데이터 제거
  if (result.structuredData && 'consequence' in result.structuredData && typeof result.structuredData.consequence === 'string') {
    const medicalPatterns = [
      '상처', '피', '병원', '응급실', '의원', '응급', '처치',
      '밴드', '연고', '붕대', '발작', '수술', '검사', '멍',
    ];
    const hasmedicalKeyword = medicalPatterns.some(pattern =>
      result.structuredData.consequence!.includes(pattern)
    );
    if (hasmedicalKeyword) {
      (result.structuredData as any).consequence = '';
    }
  }

  // 2. tags 정규화: 콜론 제거, 정의되지 않은 태그 필터링, 중복 제거
  if (Array.isArray(result.tags)) {
    result.tags = [
      ...new Set(
        result.tags
          .map(tag => {
            const cleanTag = tag.split(':')[0].split('(')[0].trim();
            return cleanTag.startsWith('#') ? cleanTag : `#${cleanTag}`;
          })
          .filter(tag => allowedTags.has(tag))
      )
    ];
  }

  // 3. behavioral_incident이면 #행동 반드시 맨 앞에
  if (result.structuredData?.event_type === 'behavioral_incident') {
    result.tags = result.tags.filter(t => t !== '#행동');
    if (!result.tags.includes('#행동')) {
      result.tags.unshift('#행동');
    } else {
      result.tags.unshift('#행동');
    }
  }

  return result;
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
export async function processFromText(audioUri: string, text: string, createdAt?: number, childId?: string, photoUrl?: string | null): Promise<string> {
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
      audioPath: audioUri,
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
