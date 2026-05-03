import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';

export interface AlarmPreset {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
  createdAt: number;
}

export async function getAlarmPresets(): Promise<AlarmPreset[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string; hour: number; minute: number; enabled: number; created_at: number;
  }>('SELECT * FROM alarm_presets ORDER BY hour ASC, minute ASC');
  return rows.map(r => ({
    id: r.id,
    hour: r.hour,
    minute: r.minute,
    enabled: r.enabled === 1,
    createdAt: r.created_at,
  }));
}

export async function addAlarmPreset(hour: number, minute: number): Promise<AlarmPreset> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO alarm_presets (id, hour, minute, enabled, created_at) VALUES (?, ?, ?, 1, ?)',
    id, hour, minute, now
  );
  return { id, hour, minute, enabled: true, createdAt: now };
}

export async function deleteAlarmPreset(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM alarm_presets WHERE id = ?', id);
}

export async function toggleAlarmPreset(id: string, enabled: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE alarm_presets SET enabled = ? WHERE id = ?', enabled ? 1 : 0, id);
}
