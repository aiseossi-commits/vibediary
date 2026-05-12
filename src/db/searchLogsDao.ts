import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { enqueuePendingDelete } from './pendingDeletesDao';
import { wakeSync } from '../services/sync';
import type { SearchLog } from '../types/record';

export async function createSearchLog(
  childId: string | null,
  query: string,
  answer: string
): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO search_logs (id, child_id, query, answer, created_at, updated_at, is_synced) VALUES (?, ?, ?, ?, ?, ?, 0)',
    id,
    childId,
    query,
    answer,
    now,
    now
  );
  void wakeSync('record_changed');
  return id;
}

export async function getSearchLogs(childId: string | null): Promise<SearchLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; child_id: string | null; query: string; answer: string; created_at: number }>(
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

export async function deleteSearchLog(id: string): Promise<void> {
  const db = await getDatabase();
  await enqueuePendingDelete('search_logs', id);
  await db.runAsync('DELETE FROM search_logs WHERE id = ?', id);
  void wakeSync('record_changed');
}
