import { getDatabase } from './database';
import type { SearchLog } from '../types/record';

export async function createSearchLog(
  childId: string | null,
  query: string,
  answer: string
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO search_logs (child_id, query, answer, created_at) VALUES (?, ?, ?, ?)',
    childId,
    query,
    answer,
    Date.now()
  );
  return result.lastInsertRowId;
}

export async function getSearchLogs(childId: string | null): Promise<SearchLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: number; child_id: string | null; query: string; answer: string; created_at: number }>(
    'SELECT id, child_id, query, answer, created_at FROM search_logs WHERE child_id IS ? ORDER BY created_at DESC',
    childId
  );
  return rows.map((r) => ({
    id: r.id,
    childId: r.child_id,
    query: r.query,
    answer: r.answer,
    createdAt: r.created_at,
  }));
}

export async function deleteSearchLog(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM search_logs WHERE id = ?', id);
}
