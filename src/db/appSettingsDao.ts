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
