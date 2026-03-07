import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';

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
    'INSERT INTO children (id, name, created_at) VALUES (?, ?, ?)',
    id, name, now
  );
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
  await db.runAsync('UPDATE children SET name = ? WHERE id = ?', name, id);
}

export async function deleteChild(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM children WHERE id = ?', id);
}
