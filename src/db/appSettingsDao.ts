import { getDatabase } from './database';

export async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      key
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key, value
    );
  } catch {
    // 저장 실패 시 무시 (메모리 상태는 유지)
  }
}

const AI_USAGE_COUNT_KEY = 'ai_usage_count';
const AI_USAGE_MONTH_KEY = 'ai_usage_month';
const AI_MONTHLY_LIMIT = 10;

export async function getAIUsage(): Promise<{ count: number; month: string }> {
  const [countStr, month] = await Promise.all([
    getSetting(AI_USAGE_COUNT_KEY),
    getSetting(AI_USAGE_MONTH_KEY),
  ]);
  return {
    count: parseInt(countStr ?? '0', 10),
    month: month ?? '',
  };
}

export async function incrementAIUsage(): Promise<number> {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { count, month } = await getAIUsage();
  const newCount = month === currentMonth ? count + 1 : 1;
  await Promise.all([
    setSetting(AI_USAGE_COUNT_KEY, String(newCount)),
    setSetting(AI_USAGE_MONTH_KEY, currentMonth),
  ]);
  return newCount;
}

export { AI_MONTHLY_LIMIT };
