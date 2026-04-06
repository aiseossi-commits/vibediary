import { getDatabase } from './database';
import type { SynthesisArticle, SynthesisArticleType, AbsorbResult } from '../types/record';

function mapRow(row: any): SynthesisArticle {
  return {
    id: row.id,
    childId: row.child_id,
    type: row.type as SynthesisArticleType,
    title: row.title,
    body: row.body,
    sourceRecordIds: row.source_record_ids ? (() => { try { return JSON.parse(row.source_record_ids); } catch { return null; } })() : null,
    periodStart: row.period_start ?? null,
    periodEnd: row.period_end ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// child 기준 전체 synthesis 아티클 조회 (최신순)
export async function getSynthesisArticles(childId: string): Promise<SynthesisArticle[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM synthesis_articles WHERE child_id = ? ORDER BY updated_at DESC',
    childId
  );
  return rows.map(mapRow);
}

// type별 단건 조회 (upsert용)
export async function getSynthesisArticleByType(childId: string, type: SynthesisArticleType): Promise<SynthesisArticle | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM synthesis_articles WHERE child_id = ? AND type = ?',
    childId, type
  );
  return row ? mapRow(row) : null;
}

// 동일 child_id + type이면 UPDATE, 없으면 INSERT
export async function upsertSynthesisArticle(params: {
  childId: string;
  type: SynthesisArticleType;
  title: string;
  body: string;
  sourceRecordIds?: string[] | null;
  periodStart?: number | null;
  periodEnd?: number | null;
}): Promise<'created' | 'updated'> {
  const db = await getDatabase();
  const now = Date.now();
  const sourceJson = params.sourceRecordIds ? JSON.stringify(params.sourceRecordIds) : null;

  const existing = await getSynthesisArticleByType(params.childId, params.type);

  if (existing) {
    await db.runAsync(
      `UPDATE synthesis_articles SET title = ?, body = ?, source_record_ids = ?, period_start = ?, period_end = ?, updated_at = ? WHERE id = ?`,
      params.title, params.body, sourceJson, params.periodStart ?? null, params.periodEnd ?? null, now, existing.id
    );
    return 'updated';
  } else {
    await db.runAsync(
      `INSERT INTO synthesis_articles (child_id, type, title, body, source_record_ids, period_start, period_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params.childId, params.type, params.title, params.body, sourceJson, params.periodStart ?? null, params.periodEnd ?? null, now, now
    );
    return 'created';
  }
}

// 단건 삭제
export async function deleteSynthesisArticle(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM synthesis_articles WHERE id = ?', id);
}

// 마지막 absorb 시각 조회 (없으면 null)
export async function getLastAbsorbTime(childId: string): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ ran_at: number }>(
    'SELECT ran_at FROM absorb_log WHERE child_id = ? ORDER BY ran_at DESC LIMIT 1',
    childId
  );
  return row?.ran_at ?? null;
}

// absorb 완료 기록 저장
export async function insertAbsorbLog(childId: string, result: AbsorbResult): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO absorb_log (child_id, absorbed_count, articles_created, articles_updated, ran_at) VALUES (?, ?, ?, ?, ?)',
    childId, result.absorbedCount, result.articlesCreated, result.articlesUpdated, Date.now()
  );
}
