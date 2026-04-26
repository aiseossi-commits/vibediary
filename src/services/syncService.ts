import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { getDatabase } from '../db/database';
import { getSetting, setSetting } from '../db/appSettingsDao';

const INITIAL_MIGRATION_KEY = 'is_initial_migration_done';
const BATCH_SIZE = 50;

// ============ 타입 정의 ============

export type SyncReadiness =
  | { status: 'ready'; userId: string; familyId: string; authorName: string }
  | { status: 'unauthenticated' }
  | { status: 'no_family' }
  | { status: 'context_error'; error: Error };

export type SyncWakeReason =
  | 'app_start'
  | 'session_ready'
  | 'network_reconnected'
  | 'app_foregrounded'
  | 'family_joined'
  | 'family_created'
  | 'record_changed'
  | 'manual_retry';

export type SyncRunResult = {
  processed: number;
  failed: number;
  skipped: number;
};

type LocalDb = Awaited<ReturnType<typeof getDatabase>>;

type SyncTable = {
  name: string;
  selectDirty: string;
  toRemote: (local: any, readiness: Extract<SyncReadiness, { status: 'ready' }>, db: LocalDb) => Promise<Record<string, unknown>>;
  upsertLocal: (db: LocalDb, remote: any) => Promise<'applied' | 'skipped'>;
};

// ============ 상태 관리 ============

let pendingSyncWake = false;
let syncDrainPromise: Promise<void> | null = null;
type SyncCallback = (result: SyncRunResult) => void;
const listeners = new Set<SyncCallback>();

export function onSyncCompleted(cb: SyncCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ============ 핵심 함수: Sync Readiness 판단 ============

export async function getSyncReadiness(): Promise<SyncReadiness> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[sync] getSyncReadiness: user not authenticated');
      return { status: 'unauthenticated' };
    }

    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError) {
      if (membershipError.code === 'PGRST116') {
        // 결과 0건 = 가족방 미참여
        console.warn('[sync] getSyncReadiness: user has no family membership');
        return { status: 'no_family' };
      }
      console.error('[sync] getSyncReadiness: membership query failed', membershipError);
      return { status: 'context_error', error: membershipError };
    }

    if (!membership) {
      console.warn('[sync] getSyncReadiness: membership is null');
      return { status: 'no_family' };
    }

    return {
      status: 'ready',
      userId: user.id,
      familyId: membership.family_id,
      authorName: user.email?.split('@')[0] ?? '가족',
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[sync] getSyncReadiness: unexpected error', error);
    return { status: 'context_error', error };
  }
}

// ============ 기록 변경 감지: Dirty 표시 ============

export async function markRecordDirty(recordId: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE records SET is_synced = 0, updated_at = ? WHERE id = ?',
      Date.now(),
      recordId
    );
  } catch (err) {
    console.error('[sync] markRecordDirty failed:', err);
  }
}

// ============ 테이블별 Sync 매핑 ============

function withRemoteContext(
  row: Record<string, unknown>,
  readiness: Extract<SyncReadiness, { status: 'ready' }>
): Record<string, unknown> {
  return {
    ...row,
    family_id: readiness.familyId,
    user_id: readiness.userId,
  };
}

async function shouldApplyRemote(db: LocalDb, tableName: string, remote: any): Promise<boolean> {
  const local = await db.getFirstAsync<{ updated_at: number | null }>(
    `SELECT updated_at FROM ${tableName} WHERE id = ?`,
    remote.id
  );
  if (!local) return true;
  return Number(remote.updated_at ?? 0) >= Number(local.updated_at ?? 0);
}

async function upsertChildrenLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'children', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO children (id, name, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, created_at = excluded.created_at, updated_at = excluded.updated_at, is_synced = 1`,
    remote.id, remote.name, remote.created_at, remote.updated_at
  );
  return 'applied';
}

async function upsertTagsLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'tags', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO tags (id, name, child_id, updated_at, is_synced)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, child_id = excluded.child_id, updated_at = excluded.updated_at, is_synced = 1`,
    remote.id, remote.name, remote.child_id ?? null, remote.updated_at
  );
  return 'applied';
}

async function getOrCreateSyncedTag(db: LocalDb, name: string, childId: string | null, updatedAt: number): Promise<string> {
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM tags WHERE name = ? AND child_id IS ?',
    name, childId
  ) ?? await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM tags WHERE name = ? AND child_id = ?',
    name, childId
  );
  if (existing) return existing.id;

  const id = Crypto.randomUUID();
  await db.runAsync(
    'INSERT OR IGNORE INTO tags (id, name, child_id, updated_at, is_synced) VALUES (?, ?, ?, ?, 1)',
    id, name, childId, updatedAt
  );
  return id;
}

function parseRemoteTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

async function upsertRecordsLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'records', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO records (id, created_at, updated_at, raw_text, summary, structured_data, source, photo_url, child_id, ai_pending, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
     ON CONFLICT(id) DO UPDATE SET
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       raw_text = excluded.raw_text,
       summary = excluded.summary,
       structured_data = excluded.structured_data,
       source = excluded.source,
       photo_url = excluded.photo_url,
       child_id = excluded.child_id,
       ai_pending = 0,
       is_synced = 1`,
    remote.id,
    remote.created_at,
    remote.updated_at,
    remote.raw_text ?? null,
    remote.summary ?? '',
    remote.structured_data ?? null,
    remote.source ?? null,
    remote.photo_url ?? null,
    remote.child_id ?? null
  );

  const tagNames = parseRemoteTags(remote.tags);
  await db.runAsync('DELETE FROM record_tags WHERE record_id = ?', remote.id);
  for (const name of tagNames) {
    const tagId = await getOrCreateSyncedTag(db, name, remote.child_id ?? null, remote.updated_at ?? Date.now());
    await db.runAsync(
      'INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?, ?)',
      remote.id, tagId
    );
  }
  return 'applied';
}

async function upsertActiveEventsLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'active_events', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO active_events (id, child_id, name, started_at, ended_at, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET child_id = excluded.child_id, name = excluded.name, started_at = excluded.started_at, ended_at = excluded.ended_at, created_at = excluded.created_at, updated_at = excluded.updated_at, is_synced = 1`,
    remote.id, remote.child_id, remote.name, remote.started_at, remote.ended_at ?? null, remote.created_at, remote.updated_at
  );
  return 'applied';
}

async function upsertEventDailyLogsLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'event_daily_logs', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO event_daily_logs (id, event_id, date, severity, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET event_id = excluded.event_id, date = excluded.date, severity = excluded.severity, created_at = excluded.created_at, updated_at = excluded.updated_at, is_synced = 1`,
    remote.id, remote.event_id, remote.date, remote.severity, remote.created_at, remote.updated_at
  );
  return 'applied';
}

async function upsertEventNamePresetsLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'event_name_presets', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO event_name_presets (id, child_id, name, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET child_id = excluded.child_id, name = excluded.name, created_at = excluded.created_at, updated_at = excluded.updated_at, is_synced = 1`,
    remote.id, remote.child_id, remote.name, remote.created_at, remote.updated_at
  );
  return 'applied';
}

async function upsertHiddenDefaultEventNamesLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'hidden_default_event_names', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO hidden_default_event_names (id, child_id, name, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET child_id = excluded.child_id, name = excluded.name, created_at = excluded.created_at, updated_at = excluded.updated_at, is_synced = 1`,
    remote.id, remote.child_id, remote.name, remote.created_at, remote.updated_at
  );
  return 'applied';
}

async function upsertSynthesisArticlesLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'synthesis_articles', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO synthesis_articles (id, child_id, type, title, body, source_record_ids, period_start, period_end, visual_data, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET child_id = excluded.child_id, type = excluded.type, title = excluded.title, body = excluded.body, source_record_ids = excluded.source_record_ids, period_start = excluded.period_start, period_end = excluded.period_end, visual_data = excluded.visual_data, created_at = excluded.created_at, updated_at = excluded.updated_at, is_synced = 1`,
    remote.id, remote.child_id, remote.type, remote.title, remote.body, remote.source_record_ids ?? null,
    remote.period_start ?? null, remote.period_end ?? null, remote.visual_data ?? null, remote.created_at, remote.updated_at
  );
  return 'applied';
}

async function upsertWikiPagesLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'wiki_pages', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO wiki_pages (id, child_id, slug, title, type, body, source_record_ids, cross_refs, visual_data, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET child_id = excluded.child_id, slug = excluded.slug, title = excluded.title, type = excluded.type, body = excluded.body, source_record_ids = excluded.source_record_ids, cross_refs = excluded.cross_refs, visual_data = excluded.visual_data, created_at = excluded.created_at, updated_at = excluded.updated_at, is_synced = 1`,
    remote.id, remote.child_id, remote.slug, remote.title, remote.type, remote.body, remote.source_record_ids ?? null,
    remote.cross_refs ?? null, remote.visual_data ?? null, remote.created_at, remote.updated_at
  );
  return 'applied';
}

async function upsertSearchLogsLocal(db: LocalDb, remote: any): Promise<'applied' | 'skipped'> {
  if (!(await shouldApplyRemote(db, 'search_logs', remote))) return 'skipped';
  await db.runAsync(
    `INSERT INTO search_logs (id, child_id, query, answer, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET child_id = excluded.child_id, query = excluded.query, answer = excluded.answer, created_at = excluded.created_at, updated_at = excluded.updated_at, is_synced = 1`,
    remote.id, remote.child_id ?? null, remote.query, remote.answer, remote.created_at, remote.updated_at
  );
  return 'applied';
}

const SYNC_TABLES: SyncTable[] = [
  {
    name: 'children',
    selectDirty: 'SELECT * FROM children WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    toRemote: async (row, readiness) => withRemoteContext({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    }, readiness),
    upsertLocal: upsertChildrenLocal,
  },
  {
    name: 'tags',
    selectDirty: 'SELECT * FROM tags WHERE is_synced = 0 AND child_id IS NOT NULL ORDER BY updated_at ASC LIMIT ?',
    toRemote: async (row, readiness) => withRemoteContext({
      id: row.id,
      name: row.name,
      child_id: row.child_id,
      created_at: row.updated_at || Date.now(),
      updated_at: row.updated_at || Date.now(),
    }, readiness),
    upsertLocal: upsertTagsLocal,
  },
  {
    name: 'records',
    selectDirty: 'SELECT * FROM records WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    toRemote: async (row, readiness, db) => {
      const tags = await db.getAllAsync<{ name: string }>(
        `SELECT t.name FROM tags t INNER JOIN record_tags rt ON t.id = rt.tag_id WHERE rt.record_id = ?`,
        row.id
      );
      return withRemoteContext({
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at ?? row.created_at,
        raw_text: row.raw_text,
        summary: row.summary,
        structured_data: row.structured_data,
        source: row.source,
        photo_url: row.photo_url,
        child_id: row.child_id,
        tags: JSON.stringify(tags.map(t => t.name)),
        author_name: readiness.authorName,
      }, readiness);
    },
    upsertLocal: upsertRecordsLocal,
  },
  {
    name: 'active_events',
    selectDirty: 'SELECT * FROM active_events WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    toRemote: async (row, readiness) => withRemoteContext({
      id: row.id,
      child_id: row.child_id,
      name: row.name,
      started_at: row.started_at,
      ended_at: row.ended_at,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    }, readiness),
    upsertLocal: upsertActiveEventsLocal,
  },
  {
    name: 'event_daily_logs',
    selectDirty: 'SELECT * FROM event_daily_logs WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    toRemote: async (row, readiness) => withRemoteContext({
      id: row.id,
      event_id: row.event_id,
      date: row.date,
      severity: row.severity,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    }, readiness),
    upsertLocal: upsertEventDailyLogsLocal,
  },
  {
    name: 'event_name_presets',
    selectDirty: 'SELECT * FROM event_name_presets WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    toRemote: async (row, readiness) => withRemoteContext({
      id: row.id,
      child_id: row.child_id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    }, readiness),
    upsertLocal: upsertEventNamePresetsLocal,
  },
  {
    name: 'hidden_default_event_names',
    selectDirty: 'SELECT * FROM hidden_default_event_names WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    toRemote: async (row, readiness) => withRemoteContext({
      id: row.id,
      child_id: row.child_id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    }, readiness),
    upsertLocal: upsertHiddenDefaultEventNamesLocal,
  },
  {
    name: 'synthesis_articles',
    selectDirty: 'SELECT * FROM synthesis_articles WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    toRemote: async (row, readiness) => withRemoteContext({
      id: row.id,
      child_id: row.child_id,
      type: row.type,
      title: row.title,
      body: row.body,
      source_record_ids: row.source_record_ids,
      period_start: row.period_start,
      period_end: row.period_end,
      visual_data: row.visual_data,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }, readiness),
    upsertLocal: upsertSynthesisArticlesLocal,
  },
  {
    name: 'wiki_pages',
    selectDirty: 'SELECT * FROM wiki_pages WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    toRemote: async (row, readiness) => withRemoteContext({
      id: row.id,
      child_id: row.child_id,
      slug: row.slug,
      title: row.title,
      type: row.type,
      body: row.body,
      source_record_ids: row.source_record_ids,
      cross_refs: row.cross_refs,
      visual_data: row.visual_data,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }, readiness),
    upsertLocal: upsertWikiPagesLocal,
  },
  {
    name: 'search_logs',
    selectDirty: 'SELECT * FROM search_logs WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    toRemote: async (row, readiness) => withRemoteContext({
      id: row.id,
      child_id: row.child_id,
      query: row.query,
      answer: row.answer,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    }, readiness),
    upsertLocal: upsertSearchLogsLocal,
  },
];

export async function clearAllDownloadWatermarks(): Promise<void> {
  await Promise.all(SYNC_TABLES.map(table => setSetting(`last_download_${table.name}`, '0')));
}

// ============ 동기화 엔진: Sync Wake ============

export async function wakeSync(reason: SyncWakeReason): Promise<void> {
  console.log('[sync] wakeSync triggered:', reason);
  pendingSyncWake = true;

  if (syncDrainPromise) {
    return syncDrainPromise;
  }

  syncDrainPromise = (async () => {
    try {
      while (true) {
        if (!pendingSyncWake) break;
        pendingSyncWake = false;
        const result = await syncPendingRecords();
        listeners.forEach(cb => cb(result));
      }
    } catch (err) {
      console.error('[sync] wakeSync failed:', err);
    } finally {
      syncDrainPromise = null;
    }
  })();

  return syncDrainPromise;
}

// ============ 배치 동기화 ============

async function syncPendingRecords(): Promise<SyncRunResult> {
  const readiness = await getSyncReadiness();

  // readiness가 'ready'가 아니면 업로드하지 않음
  if (readiness.status !== 'ready') {
    console.warn('[sync] syncPendingRecords: not ready', readiness.status);
    return { processed: 0, failed: 0, skipped: 0 };
  }

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    const db = await getDatabase();

    // 1. dependency order대로 local dirty rows upload
    for (const table of SYNC_TABLES) {
      const result = await syncTableUpload(db, table, readiness);
      processed += result.processed;
      failed += result.failed;
      skipped += result.skipped;
    }

    // 2. remote rows download 전에 삭제를 먼저 반영해 재다운로드 resurrection을 막음
    await processPendingDeletes(readiness);

    // 3. 같은 순서로 remote rows download
    for (const table of SYNC_TABLES) {
      const result = await syncTableDownload(db, table, readiness);
      processed += result.processed;
      failed += result.failed;
      skipped += result.skipped;
    }
  } catch (err) {
    console.error('[sync] syncPendingRecords batch failed:', err);
  }

  console.log('[sync] syncPendingRecords result:', { processed, failed, skipped });
  return { processed, failed, skipped };
}

async function syncTableUpload(
  db: LocalDb,
  table: SyncTable,
  readiness: Extract<SyncReadiness, { status: 'ready' }>
): Promise<SyncRunResult> {
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  while (true) {
    const rows = await db.getAllAsync<any>(table.selectDirty, BATCH_SIZE);
    if (rows.length === 0) break;

    let batchHadFailure = false;
    for (const row of rows) {
      const remote = await table.toRemote(row, readiness, db);
      const { error } = await supabase.from(table.name).upsert(remote, { onConflict: 'id' });
      if (error) {
        console.error(`[sync] ${table.name} upload failed`, row.id, error);
        failed++;
        batchHadFailure = true;
        continue;
      }

      await db.runAsync(`UPDATE ${table.name} SET is_synced = 1 WHERE id = ?`, row.id);
      processed++;
    }

    if (batchHadFailure) break;
    if (rows.length < BATCH_SIZE) break;
  }

  return { processed, failed, skipped };
}

async function syncTableDownload(
  db: LocalDb,
  table: SyncTable,
  readiness: Extract<SyncReadiness, { status: 'ready' }>
): Promise<SyncRunResult> {
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  const watermarkKey = `last_download_${table.name}`;
  const lastDownloadedAt = Number(await getSetting(watermarkKey) ?? '0');

  const { data, error } = await supabase
    .from(table.name)
    .select('*')
    .eq('family_id', readiness.familyId)
    .gt('updated_at', lastDownloadedAt)
    .order('updated_at', { ascending: true });

  if (error) {
    console.error(`[sync] ${table.name} download failed`, error);
    return { processed, failed: failed + 1, skipped };
  }

  const rows = data ?? [];
  if (rows.length === 0) return { processed, failed, skipped };

  let maxUpdatedAt = lastDownloadedAt;
  for (const remote of rows) {
    try {
      const result = await table.upsertLocal(db, remote);
      if (result === 'applied') {
        processed++;
      } else {
        skipped++;
      }
      maxUpdatedAt = Math.max(maxUpdatedAt, Number(remote.updated_at ?? 0));
    } catch (err) {
      console.error(`[sync] ${table.name} local upsert failed`, remote.id, err);
      failed++;
    }
  }

  if (maxUpdatedAt > lastDownloadedAt) {
    await setSetting(watermarkKey, String(maxUpdatedAt));
  }
  return { processed, failed, skipped };
}

// ============ 개별 기록 동기화 (레거시 호환 내부) ============

async function syncOneRecord(recordId: string, readiness: SyncReadiness): Promise<boolean> {
  if (readiness.status !== 'ready') {
    console.warn('[sync] syncOneRecord: readiness not ready', recordId);
    return false;
  }

  try {
    const db = await getDatabase();
    const recordsTable = SYNC_TABLES.find(table => table.name === 'records');
    if (!recordsTable) return false;
    const row = await db.getFirstAsync<any>('SELECT * FROM records WHERE id = ?', recordId);
    if (!row) return false;
    const remote = await recordsTable.toRemote(row, readiness, db);
    const { error } = await supabase.from('records').upsert(remote, { onConflict: 'id' });
    if (error) return false;
    await db.runAsync('UPDATE records SET is_synced = 1 WHERE id = ?', recordId);
    return true;
  } catch (err) {
    console.error('[sync] syncOneRecord: unexpected error', recordId, err);
    return false;
  }
}

// ============ Pending Deletes 처리 ============

async function processPendingDeletes(readiness: SyncReadiness): Promise<void> {
  if (readiness.status !== 'ready') {
    console.warn('[sync] processPendingDeletes: readiness not ready');
    return;
  }

  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; table_name: string; row_id: string }>(
      'SELECT id, table_name, row_id FROM pending_deletes ORDER BY created_at ASC LIMIT ?',
      BATCH_SIZE
    );

    for (const row of rows) {
      const { error } = await supabase.from(row.table_name).delete().eq('id', row.row_id);
      if (!error) {
        await db.runAsync('DELETE FROM pending_deletes WHERE id = ?', row.id);
      }
    }
  } catch (err) {
    console.error('[sync] processPendingDeletes failed:', err);
  }
}

// ============ 앱 시작 시 초기화 (deprecated, 이제 wakeSync 사용) ============

export async function runInitialMigration(): Promise<void> {
  try {
    const done = await getSetting(INITIAL_MIGRATION_KEY);
    if (done === '1') {
      console.debug('[sync] runInitialMigration: already done, triggering wakeSync');
      void wakeSync('app_start');
      return;
    }

    console.log('[sync] runInitialMigration: starting');
    const result = await syncPendingRecords();

    // 동기화 완료 여부와 상관없이 마이그레이션 완료 표시
    // (다음부터는 trigger-based sync만 사용)
    await setSetting(INITIAL_MIGRATION_KEY, '1');
    console.log('[sync] runInitialMigration: completed', result);
  } catch (err) {
    console.error('[sync] runInitialMigration failed:', err);
    // 실패해도 마이그레이션 완료 표시 (앱 동작 보장)
    await setSetting(INITIAL_MIGRATION_KEY, '1').catch(() => {});
  }
}

// ============ 레거시 호환성 (gradually deprecate) ============

/**
 * @deprecated Use markRecordDirty() + wakeSync() instead
 * 예: await markRecordDirty(recordId); void wakeSync('record_changed');
 */
export async function syncRecord(recordId: string): Promise<void> {
  console.warn('[sync] syncRecord is deprecated, use markRecordDirty + wakeSync');
  const readiness = await getSyncReadiness();
  if (readiness.status === 'ready') {
    await syncOneRecord(recordId, readiness);
  }
}

/**
 * @deprecated Use wakeSync() instead
 */
export async function syncPendingRecordsLegacy(): Promise<void> {
  console.warn('[sync] syncPendingRecordsLegacy is deprecated, use wakeSync');
  void wakeSync('manual_retry');
}
