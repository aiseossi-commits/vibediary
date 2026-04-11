import { getDatabase } from './database';

export type EventSeverity = 'high' | 'medium' | 'low' | 'none';

export interface EventDailyLog {
  eventId: number;
  date: string;
  severity: EventSeverity;
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function upsertDailyLog(eventId: number, date: string, severity: EventSeverity): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO event_daily_logs (event_id, date, severity, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(event_id, date) DO UPDATE SET severity = excluded.severity`,
    eventId, date, severity, Date.now()
  );
}

export async function getDailyLog(eventId: number, date: string): Promise<EventSeverity | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ severity: string }>(
    'SELECT severity FROM event_daily_logs WHERE event_id = ? AND date = ?',
    eventId, date
  );
  return (row?.severity as EventSeverity) ?? null;
}

export async function getDailyLogsForEvents(eventIds: number[], date: string): Promise<Record<number, EventSeverity>> {
  if (eventIds.length === 0) return {};
  const db = await getDatabase();
  const placeholders = eventIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ event_id: number; severity: string }>(
    `SELECT event_id, severity FROM event_daily_logs WHERE event_id IN (${placeholders}) AND date = ?`,
    ...eventIds, date
  );
  const result: Record<number, EventSeverity> = {};
  for (const row of rows) {
    result[row.event_id] = row.severity as EventSeverity;
  }
  return result;
}
