import { getDatabase } from './database';

export async function enqueuePendingDelete(tableName: string, rowId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO pending_deletes (table_name, row_id, created_at) VALUES (?, ?, ?)',
    tableName, rowId, Date.now()
  );
}
