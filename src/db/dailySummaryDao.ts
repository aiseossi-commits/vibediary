import { getDatabase } from './database';

export async function getDailySummaryCache(date: string, childId: string | undefined): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ summary: string }>(
    'SELECT summary FROM daily_summary_cache WHERE date = ? AND child_id IS ?',
    date, childId ?? null
  );
  return row?.summary ?? null;
}

export async function saveDailySummaryCache(date: string, childId: string | undefined, summary: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO daily_summary_cache (id, child_id, date, summary, created_at) VALUES (?, ?, ?, ?, ?)',
    `${date}_${childId ?? 'null'}`, childId ?? null, date, summary, Date.now()
  );
}
