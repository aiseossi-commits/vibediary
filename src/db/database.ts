import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import {
  CREATE_CHILDREN_TABLE,
  CREATE_RECORDS_TABLE,
  CREATE_TAGS_TABLE,
  CREATE_RECORD_TAGS_TABLE,
  CREATE_OFFLINE_QUEUE_TABLE,
  CREATE_DAILY_AI_CACHE_TABLE,
  CREATE_SEARCH_LOGS_TABLE,
  CREATE_SYNTHESIS_ARTICLES_TABLE,
  CREATE_ABSORB_LOG_TABLE,
  CREATE_ACTIVE_EVENTS_TABLE,
  CREATE_EVENT_NAME_PRESETS_TABLE,
  CREATE_HIDDEN_DEFAULT_EVENT_NAMES_TABLE,
  CREATE_EVENT_DAILY_LOGS_TABLE,
  CREATE_APP_SETTINGS_TABLE,
  CREATE_WIKI_PAGES_TABLE,
  CREATE_WIKI_PAGES_INDEXES,
  CREATE_INDEXES,
  CREATE_SYNTHESIS_INDEXES,
  CREATE_PENDING_DELETES_TABLE,
  CREATE_SYNC_ATTEMPTS_TABLE,
  CREATE_SYNC_ATTEMPTS_INDEX,
  MIGRATE_TAGS_V3,
  CLEANUP_DUPLICATE_DEFAULT_TAGS,
  CLEANUP_NULL_DUPLICATE_TAGS,
  CLEANUP_EMPTY_STRUCTURED_DATA,
} from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let dbInitialized = false;
let initPromise: Promise<void> | null = null;

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    try {
      await db.execAsync('SELECT 1');
      return db;
    } catch {
      db = null;
    }
  }
  db = await SQLite.openDatabaseAsync('vibediary.db');
  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // DB가 초기화되지 않았으면 초기화 먼저 실행
  if (!dbInitialized) {
    await initializeDatabase();
  }
  return openDb();
}

export async function initializeDatabase(): Promise<void> {
  if (dbInitialized) return;
  // 이미 초기화 진행 중이면 기존 프로미스 대기
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = await openDb();

    // 테이블 생성 (FK 검증 전에 테이블부터 생성)
    await database.execAsync(CREATE_CHILDREN_TABLE);
    await database.execAsync(CREATE_RECORDS_TABLE);
    await database.execAsync(CREATE_TAGS_TABLE);
    await database.execAsync(CREATE_RECORD_TAGS_TABLE);
    await database.execAsync(CREATE_OFFLINE_QUEUE_TABLE);
    await database.execAsync(CREATE_DAILY_AI_CACHE_TABLE);
    await database.execAsync(CREATE_SEARCH_LOGS_TABLE);
    await database.execAsync(CREATE_SYNTHESIS_ARTICLES_TABLE);
    await database.execAsync(CREATE_ABSORB_LOG_TABLE);
    await database.execAsync(CREATE_ACTIVE_EVENTS_TABLE);
    await database.execAsync(CREATE_EVENT_NAME_PRESETS_TABLE);
    await database.execAsync(CREATE_HIDDEN_DEFAULT_EVENT_NAMES_TABLE);
    await database.execAsync(CREATE_EVENT_DAILY_LOGS_TABLE);
    await database.execAsync(CREATE_APP_SETTINGS_TABLE);
    await database.execAsync(CREATE_PENDING_DELETES_TABLE);
    await database.execAsync(CREATE_SYNC_ATTEMPTS_TABLE);
    await database.execAsync(CREATE_SYNC_ATTEMPTS_INDEX);

    // 외래 키 활성화 (테이블 생성 후)
    await database.execAsync('PRAGMA foreign_keys = ON;');

    // 인덱스 생성
    for (const indexSQL of CREATE_INDEXES) {
      await database.execAsync(indexSQL);
    }
    for (const indexSQL of CREATE_SYNTHESIS_INDEXES) {
      await database.execAsync(indexSQL);
    }

    // 마이그레이션 (기존 DB 버전 확인) — 기본 태그 삽입보다 먼저 실행
    const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = versionRow?.user_version ?? 0;

    if (currentVersion < 1) {
      // v0 → v1: children 테이블 + records.child_id 추가
      await database.execAsync(CREATE_CHILDREN_TABLE);
      try {
        await database.execAsync('ALTER TABLE records ADD COLUMN child_id TEXT REFERENCES children(id) ON DELETE SET NULL');
      } catch {
        // 이미 컬럼이 있으면 무시
      }
      await database.execAsync('PRAGMA user_version = 1');
    }

    if (currentVersion < 2) {
      // v1 → v2: daily_ai_cache 테이블 추가
      await database.execAsync(CREATE_DAILY_AI_CACHE_TABLE);
      await database.execAsync('PRAGMA user_version = 2');
    }

    if (currentVersion < 3) {
      // v2 → v3: tags 테이블에 child_id 추가 (global/per-child 분리)
      await database.execAsync(MIGRATE_TAGS_V3);
      await database.execAsync('PRAGMA user_version = 3');
    }

    if (currentVersion < 4) {
      // v3 → v4: 기본 태그 child_id IS NOT NULL 중복 행 정리
      await database.execAsync(CLEANUP_DUPLICATE_DEFAULT_TAGS);
      await database.execAsync('PRAGMA user_version = 4');
    }

    if (currentVersion < 5) {
      // v4 → v5: SQLite NULL UNIQUE 버그로 생긴 global 태그 중복 정리 + partial unique index
      await database.execAsync(CLEANUP_NULL_DUPLICATE_TAGS);
      await database.execAsync('PRAGMA user_version = 5');
    }

    if (currentVersion < 6) {
      // v5 → v6: records.source 컬럼 추가 ('voice' | 'calendar_text')
      await database.execAsync('ALTER TABLE records ADD COLUMN source TEXT');
      await database.execAsync('PRAGMA user_version = 6');
    }

    if (currentVersion < 7) {
      // v6 → v7: 글로벌 기본 태그를 바다별로 분리
      const children = await database.getAllAsync<{ id: string }>('SELECT id FROM children');
      const globalTags = await database.getAllAsync<{ id: number; name: string }>(
        'SELECT id, name FROM tags WHERE child_id IS NULL'
      );
      for (const child of children) {
        for (const globalTag of globalTags) {
          await database.runAsync(
            'INSERT OR IGNORE INTO tags (name, child_id) VALUES (?, ?)',
            globalTag.name, child.id
          );
          const newTag = await database.getFirstAsync<{ id: number }>(
            'SELECT id FROM tags WHERE name = ? AND child_id = ?',
            globalTag.name, child.id
          );
          if (newTag) {
            await database.runAsync(
              `UPDATE record_tags SET tag_id = ?
               WHERE tag_id = ? AND record_id IN (SELECT id FROM records WHERE child_id = ?)`,
              newTag.id, globalTag.id, child.id
            );
          }
        }
      }
      await database.runAsync('DELETE FROM tags WHERE child_id IS NULL');
      await database.execAsync('DROP INDEX IF EXISTS idx_tags_name_global');
      await database.execAsync('PRAGMA user_version = 7');
    }

    if (currentVersion < 8) {
      // v7 → v8: pipeline 버그로 생긴 child_id=NULL 태그를 레코드의 child_id 기준으로 복구
      const nullTags = await database.getAllAsync<{ id: number; name: string }>(
        'SELECT id, name FROM tags WHERE child_id IS NULL'
      );
      for (const nullTag of nullTags) {
        const linkedRecords = await database.getAllAsync<{ record_id: string }>(
          'SELECT rt.record_id FROM record_tags rt WHERE rt.tag_id = ?',
          nullTag.id
        );
        for (const { record_id } of linkedRecords) {
          const record = await database.getFirstAsync<{ child_id: string | null }>(
            'SELECT child_id FROM records WHERE id = ?',
            record_id
          );
          if (!record?.child_id) continue;
          await database.runAsync(
            'INSERT OR IGNORE INTO tags (name, child_id) VALUES (?, ?)',
            nullTag.name, record.child_id
          );
          const perChildTag = await database.getFirstAsync<{ id: number }>(
            'SELECT id FROM tags WHERE name = ? AND child_id = ?',
            nullTag.name, record.child_id
          );
          if (perChildTag) {
            await database.runAsync(
              'UPDATE record_tags SET tag_id = ? WHERE tag_id = ? AND record_id = ?',
              perChildTag.id, nullTag.id, record_id
            );
          }
        }
      }
      await database.runAsync('DELETE FROM tags WHERE child_id IS NULL');
      await database.execAsync('PRAGMA user_version = 8');
    }

    if (currentVersion < 9) {
      // v8 → v9: synthesis_articles, absorb_log 테이블 추가
      await database.execAsync(CREATE_SYNTHESIS_ARTICLES_TABLE);
      await database.execAsync(CREATE_ABSORB_LOG_TABLE);
      for (const indexSQL of CREATE_SYNTHESIS_INDEXES) {
        await database.execAsync(indexSQL);
      }
      await database.execAsync('PRAGMA user_version = 9');
    }

    if (currentVersion < 10) {
      // v9 → v10: synthesis_articles에 visual_data 컬럼 추가
      // 신규 설치 시 v9 CREATE TABLE에 이미 포함된 경우 skip
      try {
        await database.execAsync('ALTER TABLE synthesis_articles ADD COLUMN visual_data TEXT');
      } catch {
        // 컬럼이 이미 존재하면 무시 (신규 설치 케이스)
      }
      await database.execAsync('PRAGMA user_version = 10');
    }

    if (currentVersion < 11) {
      // v10 → v11: active_events 테이블 추가
      await database.execAsync(CREATE_ACTIVE_EVENTS_TABLE);
      await database.execAsync('PRAGMA user_version = 11');
    }

    if (currentVersion < 12) {
      // v11 → v12: wiki_pages 테이블 추가 + synthesis_articles 데이터 이전
      await database.execAsync(CREATE_WIKI_PAGES_TABLE);
      for (const indexSQL of CREATE_WIKI_PAGES_INDEXES) {
        await database.execAsync(indexSQL);
      }
      // synthesis_articles → wiki_pages slug 매핑 이전
      const typeToSlug: Record<string, { slug: string; type: string }> = {
        weekly_overview:    { slug: 'overview/weekly',       type: 'overview' },
        developmental_domain: { slug: 'domain/developmental', type: 'overview' },
        milestone_timeline: { slug: 'timeline/milestones',   type: 'timeline' },
        behavioral_pattern: { slug: 'domain/behavioral',     type: 'overview' },
        medical_summary:    { slug: 'domain/medical',        type: 'overview' },
        therapy_log:        { slug: 'domain/therapy',        type: 'overview' },
      };
      const existing = await database.getAllAsync<{
        child_id: string; type: string; title: string; body: string;
        source_record_ids: string | null; visual_data: string | null;
        created_at: number; updated_at: number;
      }>('SELECT * FROM synthesis_articles');
      for (const row of existing) {
        const mapped = typeToSlug[row.type];
        if (!mapped) continue;
        try {
          await database.runAsync(
            `INSERT OR IGNORE INTO wiki_pages (child_id, slug, title, type, body, source_record_ids, visual_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            row.child_id, mapped.slug, row.title, mapped.type, row.body,
            row.source_record_ids, row.visual_data, row.created_at, row.updated_at
          );
        } catch {
          // 개별 행 이전 실패 무시
        }
      }
      await database.execAsync('PRAGMA user_version = 12');
    }

    if (currentVersion < 13) {
      // v12 → v13: event_name_presets 테이블 추가
      await database.execAsync(CREATE_EVENT_NAME_PRESETS_TABLE);
      await database.execAsync('PRAGMA user_version = 13');
    }

    if (currentVersion < 14) {
      // v13 → v14: hidden_default_event_names 테이블 추가
      await database.execAsync(CREATE_HIDDEN_DEFAULT_EVENT_NAMES_TABLE);
      await database.execAsync('PRAGMA user_version = 14');
    }

    if (currentVersion < 15) {
      // v14 → v15: event_daily_logs 테이블 추가
      await database.execAsync(CREATE_EVENT_DAILY_LOGS_TABLE);
      await database.execAsync('PRAGMA user_version = 15');
    }

    if (currentVersion < 16) {
      // v15 → v16: app_settings 테이블 추가 (홈화면 위젯 on/off 설정)
      await database.execAsync(CREATE_APP_SETTINGS_TABLE);
      await database.execAsync('PRAGMA user_version = 16');
    }

    if (currentVersion < 17) {
      // v16 → v17: records.photo_url 컬럼 추가 (사진 기록)
      try {
        await database.execAsync('ALTER TABLE records ADD COLUMN photo_url TEXT');
      } catch {
        // 컬럼이 이미 존재하면 무시 (신규 설치 케이스)
      }
      await database.execAsync('PRAGMA user_version = 17');
    }

    if (currentVersion < 18) {
      // v17 → v18: records.updated_at 컬럼 추가 (last-write-wins 충돌 정책)
      try {
        await database.execAsync('ALTER TABLE records ADD COLUMN updated_at INTEGER DEFAULT 0');
      } catch {
        // 컬럼이 이미 존재하면 무시 (신규 설치 케이스)
      }
      // 기존 기록은 created_at을 updated_at 초기값으로 설정, is_synced=0 으로 리셋 (전체 재동기화)
      await database.execAsync('UPDATE records SET updated_at = created_at, is_synced = 0 WHERE updated_at = 0 OR updated_at IS NULL');
      await database.execAsync('PRAGMA user_version = 18');
    }

    if (currentVersion < 19) {
      // v18 → v19: pending_deletes 테이블 추가 (Supabase 삭제 큐)
      await database.execAsync(CREATE_PENDING_DELETES_TABLE);
      await database.execAsync('PRAGMA user_version = 19');
    }

    if (currentVersion < 20) {
      // v19 → v20: 빈 structured_data ({}) → null로 정리 (지연 저장 정책)
      await database.execAsync(CLEANUP_EMPTY_STRUCTURED_DATA);
      await database.execAsync('PRAGMA user_version = 20');
    }

    if (currentVersion < 21) {
      // v20 → v21: 9개 sync 대상 테이블 UUID 마이그레이션 + sync 컬럼 추가
      // pending_deletes: table_name 추가 (record_id → row_id)
      await database.execAsync('PRAGMA foreign_keys = OFF');
      const ts = Date.now();
      const uuid = `lower(substr(hex(randomblob(4)),1,8)||'-'||substr(hex(randomblob(2)),1,4)||'-4'||substr(hex(randomblob(2)),1,3)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),1,3)||'-'||substr(hex(randomblob(6)),1,12))`;

      // 1. children: sync 컬럼 추가 (id 변경 없음)
      try { await database.execAsync('ALTER TABLE children ADD COLUMN is_synced INTEGER DEFAULT 0'); } catch {}
      try { await database.execAsync('ALTER TABLE children ADD COLUMN updated_at INTEGER DEFAULT 0'); } catch {}
      await database.execAsync('UPDATE children SET updated_at = created_at WHERE updated_at = 0');

      // 2. tags: INTEGER id → UUID, sync 컬럼 추가, record_tags 외래키 업데이트
      await database.execAsync('ALTER TABLE tags ADD COLUMN _uuid TEXT');
      await database.execAsync(`UPDATE tags SET _uuid = ${uuid}`);
      await database.execAsync(`CREATE TABLE tags_v21 (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
        is_synced INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0,
        UNIQUE(name, child_id)
      )`);
      await database.runAsync(`INSERT INTO tags_v21 (id, name, child_id, updated_at) SELECT _uuid, name, child_id, ${ts} FROM tags`);
      await database.execAsync(`CREATE TABLE record_tags_v21 (
        record_id TEXT REFERENCES records(id) ON DELETE CASCADE,
        tag_id TEXT REFERENCES tags_v21(id) ON DELETE CASCADE,
        PRIMARY KEY (record_id, tag_id)
      )`);
      await database.execAsync(`INSERT INTO record_tags_v21 (record_id, tag_id) SELECT rt.record_id, t._uuid FROM record_tags rt JOIN tags t ON rt.tag_id = t.id`);
      await database.execAsync('DROP TABLE record_tags');
      await database.execAsync('ALTER TABLE record_tags_v21 RENAME TO record_tags');
      await database.execAsync('DROP TABLE tags');
      await database.execAsync('ALTER TABLE tags_v21 RENAME TO tags');
      for (const idx of CREATE_INDEXES.filter(s => s.includes('record_tags'))) {
        await database.execAsync(idx);
      }

      // 3. active_events: INTEGER id → UUID, sync 컬럼 추가
      await database.execAsync('ALTER TABLE active_events ADD COLUMN _uuid TEXT');
      await database.execAsync(`UPDATE active_events SET _uuid = ${uuid}`);
      await database.execAsync(`CREATE TABLE active_events_v21 (
        id TEXT PRIMARY KEY, child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
        name TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER,
        created_at INTEGER NOT NULL, is_synced INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
      )`);
      await database.runAsync(`INSERT INTO active_events_v21 (id, child_id, name, started_at, ended_at, created_at, updated_at) SELECT _uuid, child_id, name, started_at, ended_at, created_at, ${ts} FROM active_events`);

      // 4. event_daily_logs: INTEGER id → UUID, event_id: INTEGER → TEXT (active_events UUID 매핑)
      await database.execAsync(`CREATE TABLE event_daily_logs_v21 (
        id TEXT PRIMARY KEY, event_id TEXT NOT NULL,
        date TEXT NOT NULL, severity TEXT NOT NULL, created_at INTEGER NOT NULL,
        is_synced INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0,
        UNIQUE(event_id, date)
      )`);
      await database.runAsync(`INSERT INTO event_daily_logs_v21 (id, event_id, date, severity, created_at, updated_at)
        SELECT ${uuid}, ae._uuid, edl.date, edl.severity, edl.created_at, ${ts}
        FROM event_daily_logs edl JOIN active_events ae ON edl.event_id = ae.id`);
      await database.execAsync('DROP TABLE event_daily_logs');
      await database.execAsync('ALTER TABLE event_daily_logs_v21 RENAME TO event_daily_logs');
      await database.execAsync('DROP TABLE active_events');
      await database.execAsync('ALTER TABLE active_events_v21 RENAME TO active_events');

      // 5. event_name_presets: INTEGER id → UUID
      await database.execAsync(`CREATE TABLE event_name_presets_v21 (
        id TEXT PRIMARY KEY, child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        name TEXT NOT NULL, created_at INTEGER NOT NULL,
        is_synced INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0,
        UNIQUE(child_id, name)
      )`);
      await database.runAsync(`INSERT INTO event_name_presets_v21 (id, child_id, name, created_at, updated_at) SELECT ${uuid}, child_id, name, created_at, ${ts} FROM event_name_presets`);
      await database.execAsync('DROP TABLE event_name_presets');
      await database.execAsync('ALTER TABLE event_name_presets_v21 RENAME TO event_name_presets');

      // 6. hidden_default_event_names: INTEGER id → UUID
      await database.execAsync(`CREATE TABLE hidden_default_event_names_v21 (
        id TEXT PRIMARY KEY, child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        name TEXT NOT NULL, created_at INTEGER NOT NULL,
        is_synced INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0,
        UNIQUE(child_id, name)
      )`);
      await database.runAsync(`INSERT INTO hidden_default_event_names_v21 (id, child_id, name, created_at, updated_at) SELECT ${uuid}, child_id, name, created_at, ${ts} FROM hidden_default_event_names`);
      await database.execAsync('DROP TABLE hidden_default_event_names');
      await database.execAsync('ALTER TABLE hidden_default_event_names_v21 RENAME TO hidden_default_event_names');

      // 7. synthesis_articles: INTEGER id → UUID, is_synced 추가 (updated_at 기존 존재)
      await database.execAsync(`CREATE TABLE synthesis_articles_v21 (
        id TEXT PRIMARY KEY, child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
        source_record_ids TEXT, period_start INTEGER, period_end INTEGER, visual_data TEXT,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, is_synced INTEGER DEFAULT 0
      )`);
      await database.execAsync(`INSERT INTO synthesis_articles_v21 SELECT ${uuid}, child_id, type, title, body, source_record_ids, period_start, period_end, visual_data, created_at, updated_at, 0 FROM synthesis_articles`);
      await database.execAsync('DROP TABLE synthesis_articles');
      await database.execAsync('ALTER TABLE synthesis_articles_v21 RENAME TO synthesis_articles');
      for (const idx of CREATE_SYNTHESIS_INDEXES) await database.execAsync(idx);

      // 8. wiki_pages: INTEGER id → UUID, is_synced 추가 (updated_at 기존 존재)
      await database.execAsync(`CREATE TABLE wiki_pages_v21 (
        id TEXT PRIMARY KEY, child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        slug TEXT NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL, body TEXT NOT NULL,
        source_record_ids TEXT, cross_refs TEXT, visual_data TEXT,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, is_synced INTEGER DEFAULT 0,
        UNIQUE(child_id, slug)
      )`);
      await database.execAsync(`INSERT INTO wiki_pages_v21 SELECT ${uuid}, child_id, slug, title, type, body, source_record_ids, cross_refs, visual_data, created_at, updated_at, 0 FROM wiki_pages`);
      await database.execAsync('DROP TABLE wiki_pages');
      await database.execAsync('ALTER TABLE wiki_pages_v21 RENAME TO wiki_pages');
      for (const idx of CREATE_WIKI_PAGES_INDEXES) await database.execAsync(idx);

      // 9. search_logs: INTEGER id → UUID, sync 컬럼 추가
      await database.execAsync(`CREATE TABLE search_logs_v21 (
        id TEXT PRIMARY KEY, child_id TEXT,
        query TEXT NOT NULL, answer TEXT NOT NULL,
        created_at INTEGER NOT NULL, is_synced INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0
      )`);
      await database.runAsync(`INSERT INTO search_logs_v21 (id, child_id, query, answer, created_at, updated_at) SELECT ${uuid}, child_id, query, answer, created_at, ${ts} FROM search_logs`);
      await database.execAsync('DROP TABLE search_logs');
      await database.execAsync('ALTER TABLE search_logs_v21 RENAME TO search_logs');

      // 10. pending_deletes: record_id → row_id, table_name 컬럼 추가
      await database.execAsync('DROP TABLE IF EXISTS pending_deletes_v21');
      await database.execAsync(`CREATE TABLE pending_deletes_v21 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL DEFAULT 'records',
        row_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(table_name, row_id)
      )`);
      const pendingDeleteColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(pending_deletes)');
      const pendingDeleteColumnNames = new Set(pendingDeleteColumns.map(column => column.name));
      const hasLegacyPendingDeleteRecordId = pendingDeleteColumnNames.has('record_id');
      const hasPendingDeleteRowId = pendingDeleteColumnNames.has('row_id');
      const hasPendingDeleteTableName = pendingDeleteColumnNames.has('table_name');
      if (hasLegacyPendingDeleteRecordId) {
        await database.execAsync(`INSERT OR IGNORE INTO pending_deletes_v21 (table_name, row_id, created_at) SELECT 'records', record_id, created_at FROM pending_deletes`);
      } else if (hasPendingDeleteRowId) {
        const tableNameExpr = hasPendingDeleteTableName ? 'table_name' : "'records'";
        await database.execAsync(`INSERT OR IGNORE INTO pending_deletes_v21 (table_name, row_id, created_at) SELECT ${tableNameExpr}, row_id, created_at FROM pending_deletes`);
      }
      await database.execAsync('DROP TABLE pending_deletes');
      await database.execAsync('ALTER TABLE pending_deletes_v21 RENAME TO pending_deletes');

      await database.execAsync('PRAGMA foreign_keys = ON');
      await database.execAsync('PRAGMA user_version = 21');
    }

    if (currentVersion < 22) {
      // v21 → v22: sync 진단 인프라 (sync_attempts 테이블 + 각 sync 테이블에 sync_error/sync_attempted_at 추가)
      await database.execAsync(`CREATE TABLE IF NOT EXISTS sync_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        reason TEXT NOT NULL,
        readiness_status TEXT,
        user_id TEXT,
        family_id TEXT,
        last_sync_family_id_before TEXT,
        pending_count_before TEXT,
        uploaded_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        skipped_count INTEGER DEFAULT 0,
        download_count INTEGER DEFAULT 0,
        last_error_table TEXT,
        last_error_row_id TEXT,
        last_error_message TEXT,
        echo_check_passed INTEGER
      )`);
      await database.execAsync('CREATE INDEX IF NOT EXISTS idx_sync_attempts_started ON sync_attempts(started_at DESC)');

      const syncErrorTables = ['records', 'children', 'tags', 'active_events', 'event_daily_logs', 'event_name_presets', 'hidden_default_event_names', 'synthesis_articles', 'wiki_pages', 'search_logs'];
      for (const t of syncErrorTables) {
        try { await database.execAsync(`ALTER TABLE ${t} ADD COLUMN sync_error TEXT`); } catch {}
        try { await database.execAsync(`ALTER TABLE ${t} ADD COLUMN sync_attempted_at INTEGER`); } catch {}
      }
      await database.execAsync('PRAGMA user_version = 22');
    }

    if (currentVersion < 23) {
      // v22 → v23: tags의 비-UUID id 정리 (v21 마이그레이션 후에도 INTEGER id가 남아있는 케이스)
      // record_tags의 tag_id도 같이 매핑 업데이트
      await database.execAsync('PRAGMA foreign_keys = OFF');
      const uuid = `lower(substr(hex(randomblob(4)),1,8)||'-'||substr(hex(randomblob(2)),1,4)||'-4'||substr(hex(randomblob(2)),1,3)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),1,3)||'-'||substr(hex(randomblob(6)),1,12))`;

      // UUID 형식이 아닌 tag id를 찾아서 새 UUID로 교체
      // (UUID v4는 길이 36, 8-4-4-4-12 hex 형태)
      const badTags = await database.getAllAsync<{ id: string }>(
        `SELECT id FROM tags WHERE length(id) <> 36 OR id NOT LIKE '________-____-____-____-____________'`
      );
      for (const t of badTags) {
        const r = await database.getFirstAsync<{ new_id: string }>(`SELECT ${uuid} as new_id`);
        const newId = r?.new_id;
        if (!newId) continue;
        await database.runAsync('UPDATE tags SET id = ?, is_synced = 0, updated_at = ? WHERE id = ?', newId, Date.now(), t.id);
        await database.runAsync('UPDATE record_tags SET tag_id = ? WHERE tag_id = ?', newId, t.id);
      }

      await database.execAsync('PRAGMA foreign_keys = ON');
      await database.execAsync('PRAGMA user_version = 23');
    }

    if (currentVersion < 24) {
      // v23 → v24: family_id, created_by, updated_by, deleted_at 추가 (재설계)
      const v24Tables = [
        'children', 'records', 'tags', 'active_events', 'event_daily_logs',
        'event_name_presets', 'hidden_default_event_names', 'synthesis_articles',
        'wiki_pages', 'search_logs',
      ];
      for (const t of v24Tables) {
        try { await database.execAsync(`ALTER TABLE ${t} ADD COLUMN family_id TEXT`); } catch {}
        try { await database.execAsync(`ALTER TABLE ${t} ADD COLUMN created_by TEXT`); } catch {}
        try { await database.execAsync(`ALTER TABLE ${t} ADD COLUMN updated_by TEXT`); } catch {}
        try { await database.execAsync(`ALTER TABLE ${t} ADD COLUMN deleted_at INTEGER`); } catch {}
      }
      await database.execAsync('PRAGMA user_version = 24');
    }

    if (currentVersion < 25) {
      // v24 → v25: alarm_presets 테이블 추가
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS alarm_presets (
          id TEXT PRIMARY KEY,
          hour INTEGER NOT NULL,
          minute INTEGER NOT NULL,
          enabled INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL
        )
      `);
      await database.execAsync('PRAGMA user_version = 25');
    }

    dbInitialized = true;
  })();

  const timeoutMs = Platform.OS === 'web' ? 3000 : 10000;
  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('DB 초기화 타임아웃')), timeoutMs)
  );

  try {
    await Promise.race([initPromise, timeout]);
  } finally {
    initPromise = null;
  }
}

export function isDatabaseReady(): boolean {
  return dbInitialized;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    dbInitialized = false;
    initPromise = null;
  }
}
