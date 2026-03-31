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
  CREATE_INDEXES,
  DEFAULT_TAGS,
  MIGRATE_TAGS_V3,
  CLEANUP_DUPLICATE_DEFAULT_TAGS,
  CLEANUP_NULL_DUPLICATE_TAGS,
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

    // 외래 키 활성화 (테이블 생성 후)
    await database.execAsync('PRAGMA foreign_keys = ON;');

    // 인덱스 생성
    for (const indexSQL of CREATE_INDEXES) {
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

    // 기본 태그 삽입 (마이그레이션 완료 후, child_id 컬럼 보장된 상태에서 실행)
    for (const tagName of DEFAULT_TAGS) {
      await database.runAsync(
        'INSERT OR IGNORE INTO tags (name, child_id) VALUES (?, NULL)',
        tagName
      );
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
