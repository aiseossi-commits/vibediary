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

// ============ 상태 관리 ============

let isSyncInFlight = false;
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

// ============ 동기화 엔진: Sync Wake ============

export async function wakeSync(reason: SyncWakeReason): Promise<void> {
  if (isSyncInFlight) {
    console.debug('[sync] wakeSync: already in flight, ignoring', reason);
    return;
  }

  console.log('[sync] wakeSync triggered:', reason);
  isSyncInFlight = true;

  try {
    const result = await syncPendingRecords();
    listeners.forEach(cb => cb(result));
  } catch (err) {
    console.error('[sync] wakeSync failed:', err);
  } finally {
    isSyncInFlight = false;
  }
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

    // 1. pending records 동기화
    while (true) {
      const rows = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM records WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
        BATCH_SIZE
      );

      if (rows.length === 0) break;

      for (const row of rows) {
        const success = await syncOneRecord(row.id, readiness);
        if (success) {
          processed++;
        } else {
          failed++;
        }
      }

      if (rows.length < BATCH_SIZE) break;
    }

    // 2. pending deletes 처리
    await processPendingDeletes(readiness);
  } catch (err) {
    console.error('[sync] syncPendingRecords batch failed:', err);
  }

  console.log('[sync] syncPendingRecords result:', { processed, failed, skipped });
  return { processed, failed, skipped };
}

// ============ 개별 기록 동기화 (내부) ============

async function syncOneRecord(recordId: string, readiness: SyncReadiness): Promise<boolean> {
  if (readiness.status !== 'ready') {
    console.warn('[sync] syncOneRecord: readiness not ready', recordId);
    return false;
  }

  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM records WHERE id = ?', recordId);

    if (!row) {
      console.warn('[sync] syncOneRecord: record not found', recordId);
      return false;
    }

    const tags = await db.getAllAsync<{ name: string }>(
      `SELECT t.name FROM tags t INNER JOIN record_tags rt ON t.id = rt.tag_id WHERE rt.record_id = ?`,
      recordId
    );

    // familyId 없이는 upsert하지 않음 (핵심!)
    if (!readiness.familyId) {
      console.error('[sync] syncOneRecord: familyId is missing', recordId);
      return false;
    }

    const { error } = await supabase.from('records').upsert({
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.created_at,
      raw_text: row.raw_text,
      summary: row.summary,
      structured_data: row.structured_data,
      source: row.source,
      photo_url: row.photo_url,
      tags: JSON.stringify(tags.map(t => t.name)),
      author_name: readiness.authorName,
      user_id: readiness.userId,
      family_id: readiness.familyId,
    }, { onConflict: 'id' });

    if (error) {
      console.error('[sync] syncOneRecord: upsert failed', recordId, error);
      return false;
    }

    await db.runAsync('UPDATE records SET is_synced = 1 WHERE id = ?', recordId);
    console.debug('[sync] syncOneRecord: success', recordId);
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
