import { getDatabase } from './database';
import type { RecordWithTags, Tag, DailyRecordSummary } from '../types/record';

// 날짜 범위 기반 기록 조회 (캘린더용)
export async function getRecordsByDateRange(
  startDate: string, // YYYY-MM-DD
  endDate: string, // YYYY-MM-DD
  childId?: string
): Promise<RecordWithTags[]> {
  const db = await getDatabase();
  const startTs = new Date(startDate).setHours(0, 0, 0, 0);
  const endTs = new Date(endDate).setHours(23, 59, 59, 999);

  const rows = childId
    ? await db.getAllAsync<any>(
        `SELECT * FROM records WHERE created_at >= ? AND created_at <= ? AND child_id = ? ORDER BY created_at DESC`,
        startTs, endTs, childId
      )
    : await db.getAllAsync<any>(
        `SELECT * FROM records WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`,
        startTs, endTs
      );

  const results: RecordWithTags[] = [];
  for (const row of rows) {
    const tags = await db.getAllAsync<Tag>(
      `SELECT t.id, t.name FROM tags t
       INNER JOIN record_tags rt ON t.id = rt.tag_id
       WHERE rt.record_id = ?`,
      row.id
    );
    results.push(mapRow(row, tags));
  }
  return results;
}

// 날짜별 기록 요약 (캘린더 점 표시용)
export async function getDailyRecordSummaries(
  yearMonth: string, // YYYY-MM
  childId?: string
): Promise<DailyRecordSummary[]> {
  const db = await getDatabase();
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`; // 넉넉하게 31일
  const startTs = new Date(startDate).setHours(0, 0, 0, 0);
  const endTs = new Date(endDate).setHours(23, 59, 59, 999);

  // 날짜별 기록 수
  const rows = childId
    ? await db.getAllAsync<{ date_str: string; count: number }>(
        `SELECT date(created_at / 1000, 'unixepoch', 'localtime') as date_str, COUNT(*) as count
         FROM records WHERE created_at >= ? AND created_at <= ? AND child_id = ? GROUP BY date_str`,
        startTs, endTs, childId
      )
    : await db.getAllAsync<{ date_str: string; count: number }>(
        `SELECT date(created_at / 1000, 'unixepoch', 'localtime') as date_str, COUNT(*) as count
         FROM records WHERE created_at >= ? AND created_at <= ? GROUP BY date_str`,
        startTs, endTs
      );

  const summaries: DailyRecordSummary[] = [];
  for (const row of rows) {
    // 해당 날짜의 태그 조회
    const dayStart = new Date(row.date_str).setHours(0, 0, 0, 0);
    const dayEnd = new Date(row.date_str).setHours(23, 59, 59, 999);

    const tagRows = childId
      ? await db.getAllAsync<{ name: string }>(
          `SELECT DISTINCT t.name FROM tags t
           INNER JOIN record_tags rt ON t.id = rt.tag_id
           INNER JOIN records r ON rt.record_id = r.id
           WHERE r.created_at >= ? AND r.created_at <= ? AND r.child_id = ?`,
          dayStart, dayEnd, childId
        )
      : await db.getAllAsync<{ name: string }>(
          `SELECT DISTINCT t.name FROM tags t
           INNER JOIN record_tags rt ON t.id = rt.tag_id
           INNER JOIN records r ON rt.record_id = r.id
           WHERE r.created_at >= ? AND r.created_at <= ?`,
          dayStart, dayEnd
        );

    summaries.push({
      date: row.date_str,
      count: row.count,
      tags: tagRows.map((t) => t.name),
    });
  }

  return summaries;
}

// 특정 날짜의 기록 조회
export async function getRecordsByDate(date: string, childId?: string): Promise<RecordWithTags[]> {
  return getRecordsByDateRange(date, date, childId);
}

// 태그 기반 필터링 (OR 필터: 태그 중 하나라도 포함)
export async function getRecordsByTags(
  tagIds: number[],
  limit = 50,
  offset = 0,
  childId?: string
): Promise<RecordWithTags[]> {
  if (tagIds.length === 0) return [];

  const db = await getDatabase();
  const placeholders = tagIds.map(() => '?').join(',');

  const rows = childId
    ? await db.getAllAsync<any>(
        `SELECT DISTINCT r.* FROM records r
         INNER JOIN record_tags rt ON r.id = rt.record_id
         WHERE rt.tag_id IN (${placeholders}) AND r.child_id = ?
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        ...tagIds, childId, limit, offset
      )
    : await db.getAllAsync<any>(
        `SELECT DISTINCT r.* FROM records r
         INNER JOIN record_tags rt ON r.id = rt.record_id
         WHERE rt.tag_id IN (${placeholders})
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        ...tagIds, limit, offset
      );

  const results: RecordWithTags[] = [];
  for (const row of rows) {
    const tags = await db.getAllAsync<Tag>(
      `SELECT t.id, t.name FROM tags t
       INNER JOIN record_tags rt ON t.id = rt.tag_id
       WHERE rt.record_id = ?`,
      row.id
    );
    results.push(mapRow(row, tags));
  }
  return results;
}

// 태그 이름으로 필터링
export async function getRecordsByTagNames(
  tagNames: string[],
  limit = 50,
  offset = 0,
  childId?: string
): Promise<RecordWithTags[]> {
  if (tagNames.length === 0) return [];

  const db = await getDatabase();
  const placeholders = tagNames.map(() => '?').join(',');

  const tagRows = await db.getAllAsync<Tag>(
    `SELECT id, name FROM tags WHERE name IN (${placeholders})`,
    ...tagNames
  );

  if (tagRows.length === 0) return [];
  return getRecordsByTags(
    tagRows.map((t) => t.id),
    limit,
    offset,
    childId
  );
}

// 임베딩이 있는 전체 기록 조회 (벡터 검색용)
export async function getRecordsWithEmbeddings(tagIds?: number[], childId?: string): Promise<
  { id: string; summary: string; structuredData: string | null; embedding: Uint8Array; createdAt: number }[]
> {
  const db = await getDatabase();

  const childFilter = childId ? ' AND child_id = ?' : '';
  const childParams = childId ? [childId] : [];

  let query: string;
  const params: any[] = [];

  if (tagIds && tagIds.length > 0) {
    const placeholders = tagIds.map(() => '?').join(',');
    query = `SELECT DISTINCT r.id, r.summary, r.structured_data, r.embedding, r.created_at
             FROM records r
             INNER JOIN record_tags rt ON r.id = rt.record_id
             WHERE r.embedding IS NOT NULL AND rt.tag_id IN (${placeholders})${childFilter}`;
    params.push(...tagIds, ...childParams);
  } else {
    query = `SELECT id, summary, structured_data, embedding, created_at FROM records WHERE embedding IS NOT NULL${childFilter}`;
    params.push(...childParams);
  }

  query += ' ORDER BY created_at DESC';
  return db.getAllAsync(query, ...params);
}

// Row → RecordWithTags 변환 유틸
function mapRow(row: any, tags: Tag[]): RecordWithTags {
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
    embedding: null, // 목록 조회 시 임베딩은 로드하지 않음 (성능)
    isSynced: row.is_synced === 1,
    aiPending: row.ai_pending === 1,
    tags,
  };
}
