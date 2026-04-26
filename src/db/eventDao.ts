import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { enqueuePendingDelete } from './pendingDeletesDao';
import { wakeSync } from '../services/syncService';

// ─── ActiveEvent ──────────────────────────────────────────────────────────────

export interface ActiveEvent {
  id: string;
  childId: string;
  name: string;
  startedAt: number;
  endedAt: number | null;
  createdAt: number;
}

interface ActiveEventRow {
  id: string;
  child_id: string;
  name: string;
  started_at: number;
  ended_at: number | null;
  created_at: number;
}

function mapEventRow(row: ActiveEventRow): ActiveEvent {
  return {
    id: row.id,
    childId: row.child_id,
    name: row.name,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
    createdAt: row.created_at,
  };
}

export async function getActiveEvents(childId: string): Promise<ActiveEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ActiveEventRow>(
    'SELECT * FROM active_events WHERE child_id = ? AND ended_at IS NULL ORDER BY started_at ASC',
    childId
  );
  return rows.map(mapEventRow);
}

export async function getEventsByDateRange(
  childId: string,
  fromMs: number,
  toMs: number
): Promise<ActiveEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ActiveEventRow>(
    `SELECT * FROM active_events
     WHERE child_id = ?
       AND started_at <= ?
       AND (ended_at IS NULL OR ended_at >= ?)
     ORDER BY started_at ASC`,
    childId, toMs, fromMs
  );
  return rows.map(mapEventRow);
}

export async function createEvent(
  childId: string,
  name: string,
  startedAt: number
): Promise<ActiveEvent> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO active_events (id, child_id, name, started_at, created_at, updated_at, is_synced) VALUES (?, ?, ?, ?, ?, ?, 0)',
    id, childId, name, startedAt, now, now
  );
  void wakeSync('record_changed');
  return { id, childId, name, startedAt, endedAt: null, createdAt: now };
}

export async function endEvent(id: string, endedAt: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE active_events SET ended_at = ?, updated_at = ?, is_synced = 0 WHERE id = ?',
    endedAt, Date.now(), id
  );
  void wakeSync('record_changed');
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDatabase();
  await enqueuePendingDelete('active_events', id);
  await db.runAsync('DELETE FROM active_events WHERE id = ?', id);
  void wakeSync('record_changed');
}

// ─── EventDailyLog ────────────────────────────────────────────────────────────

export type EventSeverity = 'high' | 'medium' | 'low' | 'none';

export interface EventDailyLog {
  eventId: string;
  date: string;
  severity: EventSeverity;
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function upsertDailyLog(eventId: string, date: string, severity: EventSeverity): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO event_daily_logs (id, event_id, date, severity, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(event_id, date) DO UPDATE SET severity = excluded.severity, updated_at = excluded.updated_at, is_synced = 0`,
    Crypto.randomUUID(), eventId, date, severity, now, now
  );
  void wakeSync('record_changed');
}

export async function getDailyLog(eventId: string, date: string): Promise<EventSeverity | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ severity: string }>(
    'SELECT severity FROM event_daily_logs WHERE event_id = ? AND date = ?',
    eventId, date
  );
  return (row?.severity as EventSeverity) ?? null;
}

export async function getDailyLogsForEvents(eventIds: string[], date: string): Promise<Record<string, EventSeverity>> {
  if (eventIds.length === 0) return {};
  const db = await getDatabase();
  const placeholders = eventIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ event_id: string; severity: string }>(
    `SELECT event_id, severity FROM event_daily_logs WHERE event_id IN (${placeholders}) AND date = ?`,
    ...eventIds, date
  );
  const result: Record<string, EventSeverity> = {};
  for (const row of rows) {
    result[row.event_id] = row.severity as EventSeverity;
  }
  return result;
}

// ─── EventNamePresets ─────────────────────────────────────────────────────────

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
  const now = Date.now();
  await db.runAsync(
    'INSERT OR IGNORE INTO event_name_presets (id, child_id, name, created_at, updated_at, is_synced) VALUES (?, ?, ?, ?, ?, 0)',
    Crypto.randomUUID(), childId, name, now, now
  );
  void wakeSync('record_changed');
}

export async function deleteEventNamePreset(childId: string, name: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM event_name_presets WHERE child_id = ? AND name = ?',
    childId, name
  );
  if (row) await enqueuePendingDelete('event_name_presets', row.id);
  await db.runAsync(
    'DELETE FROM event_name_presets WHERE child_id = ? AND name = ?',
    childId, name
  );
  void wakeSync('record_changed');
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
  const now = Date.now();
  await db.runAsync(
    'INSERT OR IGNORE INTO hidden_default_event_names (id, child_id, name, created_at, updated_at, is_synced) VALUES (?, ?, ?, ?, ?, 0)',
    Crypto.randomUUID(), childId, name, now, now
  );
  void wakeSync('record_changed');
}
