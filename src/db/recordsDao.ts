import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import type { DiaryRecord, RecordWithTags, StructuredData, Tag } from '../types/record';

// 새 기록 생성
export async function createRecord(params: {
  audioPath?: string | null;
  rawText?: string | null;
  summary: string;
  structuredData?: StructuredData | null;
  aiPending?: boolean;
  createdAt?: number;
  childId?: string | null;
  source?: 'voice' | 'calendar_text';
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = params.createdAt ?? Date.now();

  await db.runAsync(
    `INSERT INTO records (id, created_at, audio_path, raw_text, summary, structured_data, ai_pending, child_id, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    now,
    params.audioPath || null,
    params.rawText ?? null,
    params.summary,
    params.structuredData ? JSON.stringify(params.structuredData) : null,
    params.aiPending ? 1 : 0,
    params.childId ?? null,
    params.source ?? null
  );

  return id;
}

// ID로 기록 조회
export async function getRecordById(id: string): Promise<RecordWithTags | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<any>(
    'SELECT * FROM records WHERE id = ?',
    id
  );

  if (!row) return null;

  const tags = await getTagsForRecord(id);
  return mapRowToRecordWithTags(row, tags);
}

// 전체 기록 조회 (최신순), childId가 string이면 해당 아이만, undefined면 전체
export async function getAllRecords(limit = 50, offset = 0, childId?: string): Promise<RecordWithTags[]> {
  const db = await getDatabase();

  const rows = childId !== undefined
    ? await db.getAllAsync<any>(
        'SELECT * FROM records WHERE child_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        childId, limit, offset
      )
    : await db.getAllAsync<any>(
        'SELECT * FROM records ORDER BY created_at DESC LIMIT ? OFFSET ?',
        limit, offset
      );

  const results: RecordWithTags[] = [];
  for (const row of rows) {
    const tags = await getTagsForRecord(row.id);
    results.push(mapRowToRecordWithTags(row, tags));
  }
  return results;
}

// 백업용: 전체 기록 무제한 조회 (raw row, embedding 제외)
export async function getAllRecordsForBackup(): Promise<{
  id: string;
  created_at: number;
  audio_path: string | null;
  raw_text: string | null;
  summary: string;
  structured_data: string | null;
  is_synced: number;
  child_id: string | null;
}[]> {
  const db = await getDatabase();
  return db.getAllAsync<any>(
    'SELECT id, created_at, audio_path, raw_text, summary, structured_data, is_synced, child_id FROM records ORDER BY created_at ASC'
  );
}

// 기록 수정
export async function updateRecord(
  id: string,
  updates: Partial<Pick<DiaryRecord, 'rawText' | 'summary' | 'structuredData' | 'aiPending'>>
): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];

  if (updates.rawText !== undefined) {
    sets.push('raw_text = ?');
    values.push(updates.rawText);
  }
  if (updates.summary !== undefined) {
    sets.push('summary = ?');
    values.push(updates.summary);
  }
  if (updates.structuredData !== undefined) {
    sets.push('structured_data = ?');
    values.push(updates.structuredData ? JSON.stringify(updates.structuredData) : null);
  }
  if (updates.aiPending !== undefined) {
    sets.push('ai_pending = ?');
    values.push(updates.aiPending ? 1 : 0);
  }

  if (sets.length === 0) return;

  values.push(id);
  await db.runAsync(
    `UPDATE records SET ${sets.join(', ')} WHERE id = ?`,
    ...values
  );
}

// 미분류 기록 수 조회 (child_id IS NULL)
export async function getOrphanedRecordsCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM records WHERE child_id IS NULL'
  );
  return row?.count ?? 0;
}

// 미분류 기록 → 특정 바다로 일괄 이동
export async function reassignOrphanedRecords(childId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'UPDATE records SET child_id = ? WHERE child_id IS NULL',
    childId
  );
  return result.changes;
}

// 특정 바다의 기록 → 다른 바다로 이동 (삭제 전 호출)
export async function reassignChildRecords(fromChildId: string, toChildId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE records SET child_id = ? WHERE child_id = ?',
    toChildId, fromChildId
  );
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getDatabase();
  // CASCADE로 record_tags도 자동 삭제
  await db.runAsync('DELETE FROM records WHERE id = ?', id);
}

// 기록에 연결된 태그 조회
async function getTagsForRecord(recordId: string): Promise<Tag[]> {
  const db = await getDatabase();
  return db.getAllAsync<Tag>(
    `SELECT t.id, t.name FROM tags t
     INNER JOIN record_tags rt ON t.id = rt.tag_id
     WHERE rt.record_id = ?`,
    recordId
  );
}

// Row → RecordWithTags 변환
function mapRowToRecordWithTags(row: any, tags: Tag[]): RecordWithTags {
  return {
    id: row.id,
    createdAt: row.created_at,
    audioPath: row.audio_path,
    rawText: row.raw_text,
    summary: row.summary,
    structuredData: (() => {
      try { return row.structured_data ? JSON.parse(row.structured_data) : null; }
      catch { return null; }
    })(),
    isSynced: row.is_synced === 1,
    aiPending: row.ai_pending === 1,
    source: row.source ?? undefined,
    tags,
  };
}
