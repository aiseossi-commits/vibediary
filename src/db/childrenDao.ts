import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { enqueuePendingDelete } from './pendingDeletesDao';
import { DEFAULT_TAGS } from './schema';
import { wakeSync } from '../services/syncService';

export interface Child {
  id: string;
  name: string;
  createdAt: number;
}

export async function createChild(name: string): Promise<Child> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO children (id, name, created_at, updated_at, is_synced) VALUES (?, ?, ?, ?, 0)',
    id, name, now, now
  );
  // 새 바다에 기본 태그 시드
  for (const tagName of DEFAULT_TAGS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO tags (id, name, child_id, updated_at, is_synced) VALUES (?, ?, ?, ?, 0)',
      Crypto.randomUUID(), tagName, id, now
    );
  }
  void wakeSync('record_changed');
  return { id, name, createdAt: now };
}

export async function getAllChildren(): Promise<Child[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; name: string; created_at: number }>(
    'SELECT id, name, created_at FROM children ORDER BY created_at ASC'
  );
  return rows.map(r => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

export async function updateChild(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE children SET name = ?, updated_at = ?, is_synced = 0 WHERE id = ?',
    name, Date.now(), id
  );
  void wakeSync('record_changed');
}

export async function deleteChild(id: string): Promise<void> {
  const db = await getDatabase();
  await enqueuePendingDelete('children', id);
  await db.runAsync('DELETE FROM children WHERE id = ?', id);
  void wakeSync('record_changed');
}
