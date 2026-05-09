import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { enqueuePendingDelete } from './pendingDeletesDao';
import { wakeSync } from '../services/syncService';
import { parseJsonOrNull } from '../utils/parseJson';
import type { WikiPage, WikiPageType } from '../types/record';

function mapRow(row: any): WikiPage {
  return {
    id: row.id,
    childId: row.child_id,
    slug: row.slug,
    title: row.title,
    type: row.type as WikiPageType,
    body: row.body,
    sourceRecordIds: parseJsonOrNull<string[]>(row.source_record_ids),
    crossRefs: parseJsonOrNull<string[]>(row.cross_refs),
    visualData: row.visual_data ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// child 기준 전체 wiki pages 조회 (updated_at 내림차순)
export async function getWikiPages(childId: string): Promise<WikiPage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM wiki_pages WHERE child_id = ? ORDER BY updated_at DESC',
    childId
  );
  return rows.map(mapRow);
}

// slug 단건 조회
export async function getWikiPageBySlug(childId: string, slug: string): Promise<WikiPage | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM wiki_pages WHERE child_id = ? AND slug = ?',
    childId, slug
  );
  return row ? mapRow(row) : null;
}

// upsert: 동일 child_id + slug이면 UPDATE, 없으면 INSERT
export async function upsertWikiPage(params: {
  childId: string;
  slug: string;
  title: string;
  type: WikiPageType;
  body: string;
  sourceRecordIds?: string[] | null;
  crossRefs?: string[] | null;
  visualData?: string | null;
}): Promise<'created' | 'updated'> {
  const db = await getDatabase();
  const now = Date.now();
  const sourceJson = params.sourceRecordIds ? JSON.stringify(params.sourceRecordIds) : null;
  const crossRefsJson = params.crossRefs ? JSON.stringify(params.crossRefs) : null;
  const visualData = params.visualData ?? null;

  const existing = await getWikiPageBySlug(params.childId, params.slug);

  if (existing) {
    await db.runAsync(
      `UPDATE wiki_pages SET title = ?, type = ?, body = ?, source_record_ids = ?, cross_refs = ?, visual_data = ?, updated_at = ?, is_synced = 0 WHERE id = ?`,
      params.title, params.type, params.body, sourceJson, crossRefsJson, visualData, now, existing.id
    );
    void wakeSync('record_changed');
    return 'updated';
  } else {
    await db.runAsync(
      `INSERT INTO wiki_pages (id, child_id, slug, title, type, body, source_record_ids, cross_refs, visual_data, created_at, updated_at, is_synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      Crypto.randomUUID(), params.childId, params.slug, params.title, params.type, params.body,
      sourceJson, crossRefsJson, visualData, now, now
    );
    void wakeSync('record_changed');
    return 'created';
  }
}

// 단건 삭제
export async function deleteWikiPage(id: string): Promise<void> {
  const db = await getDatabase();
  await enqueuePendingDelete('wiki_pages', id);
  await db.runAsync('DELETE FROM wiki_pages WHERE id = ?', id);
  void wakeSync('record_changed');
}

// absorb_log: 마지막 absorb 시각 조회
export async function getLastAbsorbTime(childId: string): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ ran_at: number }>(
    'SELECT ran_at FROM absorb_log WHERE child_id = ? ORDER BY ran_at DESC LIMIT 1',
    childId
  );
  return row?.ran_at ?? null;
}

// absorb_log: absorb 완료 기록 저장
export async function insertAbsorbLog(childId: string, result: { absorbedCount: number; articlesCreated: number; articlesUpdated: number }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO absorb_log (child_id, absorbed_count, articles_created, articles_updated, ran_at) VALUES (?, ?, ?, ?, ?)',
    childId, result.absorbedCount, result.articlesCreated, result.articlesUpdated, Date.now()
  );
}
