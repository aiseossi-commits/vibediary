import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import {
  CREATE_CHILDREN_TABLE,
  CREATE_RECORDS_TABLE,
  CREATE_TAGS_TABLE,
  CREATE_RECORD_TAGS_TABLE,
  CREATE_OFFLINE_QUEUE_TABLE,
  CREATE_INDEXES,
  DEFAULT_TAGS,
} from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let dbInitialized = false;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('vibediary.db');
  return db;
}

export async function initializeDatabase(): Promise<void> {
  if (dbInitialized) return;

  // 웹에서 expo-sqlite OPFS가 특정 헤더 없이 행(hang)할 수 있으므로 타임아웃 적용
  const timeoutMs = Platform.OS === 'web' ? 3000 : 10000;

  const dbPromise = (async () => {
    const database = await getDatabase();

    // 외래 키 활성화
    await database.execAsync('PRAGMA foreign_keys = ON;');

    // 테이블 생성 (children 먼저 — records가 FK 참조)
    await database.execAsync(CREATE_CHILDREN_TABLE);
    await database.execAsync(CREATE_RECORDS_TABLE);
    await database.execAsync(CREATE_TAGS_TABLE);
    await database.execAsync(CREATE_RECORD_TAGS_TABLE);
    await database.execAsync(CREATE_OFFLINE_QUEUE_TABLE);

    // 인덱스 생성
    for (const indexSQL of CREATE_INDEXES) {
      await database.execAsync(indexSQL);
    }

    // 기본 태그 삽입 (이미 존재하면 무시)
    for (const tagName of DEFAULT_TAGS) {
      await database.runAsync(
        'INSERT OR IGNORE INTO tags (name) VALUES (?)',
        tagName
      );
    }

    // 마이그레이션 (기존 DB 버전 확인)
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

    dbInitialized = true;
  })();

  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('DB 초기화 타임아웃')), timeoutMs)
  );

  await Promise.race([dbPromise, timeout]);
}

export function isDatabaseReady(): boolean {
  return dbInitialized;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    dbInitialized = false;
  }
}
