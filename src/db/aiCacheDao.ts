import { getDatabase } from './database';

type AICacheResult = { rational: string; emotional: string };

function normalizeChildId(childId: string | null | undefined): string {
  return childId ?? '';
}

export async function getDailyAICache(
  date: string,
  childId: string | null | undefined
): Promise<AICacheResult | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ rational: string; emotional: string }>(
    'SELECT rational, emotional FROM daily_ai_cache WHERE date = ? AND child_id = ?',
    date, normalizeChildId(childId)
  );
  return row ?? null;
}

export async function setDailyAICache(
  date: string,
  childId: string | null | undefined,
  rational: string,
  emotional: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO daily_ai_cache (date, child_id, rational, emotional, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    date, normalizeChildId(childId), rational, emotional, Date.now()
  );
}

export async function deleteDailyAICache(
  date: string,
  childId: string | null | undefined
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM daily_ai_cache WHERE date = ? AND child_id = ?',
    date, normalizeChildId(childId)
  );
}
