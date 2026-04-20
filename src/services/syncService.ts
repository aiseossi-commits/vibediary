import { supabase } from '../lib/supabase';
import { getDatabase } from '../db/database';
import { getSetting, setSetting } from '../db/appSettingsDao';

const INITIAL_MIGRATION_KEY = 'is_initial_migration_done';
const BATCH_SIZE = 50;

async function getAuthContext(): Promise<{ userId: string; familyId: string | null; authorName: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();

    return {
      userId: user.id,
      familyId: membership?.family_id ?? null,
      authorName: user.email?.split('@')[0] ?? '가족',
    };
  } catch {
    return null;
  }
}

export async function syncRecord(recordId: string): Promise<void> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return;

    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM records WHERE id = ?', recordId);
    if (!row) return;

    const tags = await db.getAllAsync<{ name: string }>(
      `SELECT t.name FROM tags t INNER JOIN record_tags rt ON t.id = rt.tag_id WHERE rt.record_id = ?`,
      recordId
    );

    const { error } = await supabase.from('records').upsert({
      id: row.id,
      created_at: row.created_at,
      raw_text: row.raw_text,
      summary: row.summary,
      structured_data: row.structured_data,
      source: row.source,
      photo_url: row.photo_url,
      tags: JSON.stringify(tags.map(t => t.name)),
      author_name: ctx.authorName,
      user_id: ctx.userId,
      family_id: ctx.familyId,
    }, { onConflict: 'id' });

    if (!error) {
      await db.runAsync('UPDATE records SET is_synced = 1 WHERE id = ?', recordId);
    }
  } catch {
    // 네트워크 오류 — is_synced = 0 유지, 다음 기회에 재시도
  }
}

export async function syncPendingRecords(): Promise<void> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM records WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
      BATCH_SIZE
    );
    for (const row of rows) {
      await syncRecord(row.id);
    }
  } catch {
    // 무시
  }
}

export async function runInitialMigration(): Promise<void> {
  try {
    const done = await getSetting(INITIAL_MIGRATION_KEY);
    if (done === '1') {
      // 마이그레이션 완료 후에도 미동기화 기록 재시도
      await syncPendingRecords();
      return;
    }

    const db = await getDatabase();
    while (true) {
      const rows = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM records WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
        BATCH_SIZE
      );
      if (rows.length === 0) break;
      for (const row of rows) {
        await syncRecord(row.id);
      }
      if (rows.length < BATCH_SIZE) break;
    }

    await setSetting(INITIAL_MIGRATION_KEY, '1');
  } catch {
    // 실패해도 앱 동작에 지장 없도록 완료 표시
    await setSetting(INITIAL_MIGRATION_KEY, '1').catch(() => {});
  }
}
