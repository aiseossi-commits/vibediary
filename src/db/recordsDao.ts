import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import type { DiaryRecord, RecordWithTags, StructuredData, Tag } from '../types/record';

// Float32Array <-> BLOB 변환 유틸
function float32ToBlob(arr: number[]): Uint8Array {
  const float32 = new Float32Array(arr);
  return new Uint8Array(float32.buffer);
}

function blobToFloat32(blob: Uint8Array): number[] {
  const float32 = new Float32Array(blob.buffer);
  return Array.from(float32);
}

// 새 기록 생성
export async function createRecord(params: {
  audioPath?: string | null;
  rawText?: string | null;
  summary: string;
  structuredData?: StructuredData | null;
  mood?: string | null;
  embedding?: number[] | null;
  aiPending?: boolean;
  createdAt?: number;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = params.createdAt ?? Date.now();

  await db.runAsync(
    `INSERT INTO records (id, created_at, audio_path, raw_text, summary, structured_data, mood, embedding, ai_pending)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    now,
    params.audioPath ?? null,
    params.rawText ?? null,
    params.summary,
    params.structuredData ? JSON.stringify(params.structuredData) : null,
    params.mood ?? null,
    params.embedding ? float32ToBlob(params.embedding) : null,
    params.aiPending ? 1 : 0
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

// 전체 기록 조회 (최신순)
export async function getAllRecords(limit = 50, offset = 0): Promise<RecordWithTags[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<any>(
    'SELECT * FROM records ORDER BY created_at DESC LIMIT ? OFFSET ?',
    limit,
    offset
  );

  const results: RecordWithTags[] = [];
  for (const row of rows) {
    const tags = await getTagsForRecord(row.id);
    results.push(mapRowToRecordWithTags(row, tags));
  }
  return results;
}

// 기록 수정
export async function updateRecord(
  id: string,
  updates: Partial<Pick<DiaryRecord, 'rawText' | 'summary' | 'structuredData' | 'mood' | 'embedding' | 'aiPending'>>
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
  if (updates.mood !== undefined) {
    sets.push('mood = ?');
    values.push(updates.mood);
  }
  if (updates.embedding !== undefined) {
    sets.push('embedding = ?');
    values.push(updates.embedding ? float32ToBlob(updates.embedding) : null);
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

// 기록 삭제
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
    mood: row.mood,
    embedding: row.embedding ? blobToFloat32(row.embedding) : null,
    isSynced: row.is_synced === 1,
    aiPending: row.ai_pending === 1,
    tags,
  };
}
