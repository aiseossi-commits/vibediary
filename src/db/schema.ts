// SQLite 스키마 정의 (design.md D4 참조)

export const CREATE_CHILDREN_TABLE = `
  CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`;

export const CREATE_RECORDS_TABLE = `
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    audio_path TEXT,
    raw_text TEXT,
    summary TEXT NOT NULL,
    structured_data TEXT,
    mood TEXT,
    embedding BLOB,
    is_synced INTEGER DEFAULT 0,
    ai_pending INTEGER DEFAULT 0,
    child_id TEXT REFERENCES children(id) ON DELETE SET NULL
  );
`;

export const CREATE_TAGS_TABLE = `
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );
`;

export const CREATE_RECORD_TAGS_TABLE = `
  CREATE TABLE IF NOT EXISTS record_tags (
    record_id TEXT REFERENCES records(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (record_id, tag_id)
  );
`;

export const CREATE_OFFLINE_QUEUE_TABLE = `
  CREATE TABLE IF NOT EXISTS offline_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id TEXT UNIQUE REFERENCES records(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    status TEXT DEFAULT 'pending'
  );
`;

export const CREATE_DAILY_AI_CACHE_TABLE = `
  CREATE TABLE IF NOT EXISTS daily_ai_cache (
    date TEXT NOT NULL,
    child_id TEXT NOT NULL DEFAULT '',
    rational TEXT NOT NULL,
    emotional TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (date, child_id)
  );
`;

export const CREATE_SEARCH_LOGS_TABLE = `
  CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id TEXT,
    query TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`;

// 인덱스
export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_record_tags_tag ON record_tags(tag_id);`,
  `CREATE INDEX IF NOT EXISTS idx_record_tags_record ON record_tags(record_id);`,
  `CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);`,
];

// 기본 태그 (최초 실행 시 삽입)
export const DEFAULT_TAGS = [
  '#의료',
  '#투약',
  '#행동',
  '#일상',
  '#치료',
];
