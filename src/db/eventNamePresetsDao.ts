import { getDatabase } from './database';

export async function getEventNamePresets(childId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string }>(
    'SELECT name FROM event_name_presets WHERE child_id = ? ORDER BY created_at DESC',
    childId
  );
  return rows.map(r => r.name);
}

export async function addEventNamePreset(childId: string, name: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO event_name_presets (child_id, name, created_at) VALUES (?, ?, ?)',
    childId, name, Date.now()
  );
}

export async function deleteEventNamePreset(childId: string, name: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM event_name_presets WHERE child_id = ? AND name = ?',
    childId, name
  );
}

export async function getHiddenDefaultEventNames(childId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string }>(
    'SELECT name FROM hidden_default_event_names WHERE child_id = ?',
    childId
  );
  return rows.map(r => r.name);
}

export async function hideDefaultEventName(childId: string, name: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO hidden_default_event_names (child_id, name, created_at) VALUES (?, ?, ?)',
    childId, name, Date.now()
  );
}
