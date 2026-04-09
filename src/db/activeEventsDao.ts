import { getDatabase } from './database';

export interface ActiveEvent {
  id: number;
  childId: string;
  name: string;
  startedAt: number;
  endedAt: number | null;
  createdAt: number;
}

interface ActiveEventRow {
  id: number;
  child_id: string;
  name: string;
  started_at: number;
  ended_at: number | null;
  created_at: number;
}

function mapRow(row: ActiveEventRow): ActiveEvent {
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
  return rows.map(mapRow);
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
  return rows.map(mapRow);
}

export async function createEvent(
  childId: string,
  name: string,
  startedAt: number
): Promise<ActiveEvent> {
  const db = await getDatabase();
  const now = Date.now();
  const result = await db.runAsync(
    'INSERT INTO active_events (child_id, name, started_at, created_at) VALUES (?, ?, ?, ?)',
    childId, name, startedAt, now
  );
  return {
    id: result.lastInsertRowId,
    childId,
    name,
    startedAt,
    endedAt: null,
    createdAt: now,
  };
}

export async function endEvent(id: number, endedAt: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE active_events SET ended_at = ? WHERE id = ?',
    endedAt, id
  );
}
