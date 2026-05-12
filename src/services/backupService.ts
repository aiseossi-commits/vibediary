import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '../db/database';
import { getAllChildren } from '../db/childrenDao';
import { getAllRecordTags } from '../db/tagsDao';
import { getAllRecordsForBackup } from '../db/recordsDao';
import { wakeSync } from './sync';

const BACKUP_VERSION = 2;

export interface BackupData {
  version: number;
  exportedAt: number;
  children: { id: string; name: string; created_at: number }[];
  records: {
    id: string;
    created_at: number;
    audio_path: string | null;
    raw_text: string | null;
    summary: string;
    structured_data: string | null;
    is_synced: number;
    child_id: string | null;
  }[];
  tags: { id: string; name: string; child_id?: string | null }[];
  recordTags: { record_id: string; tag_id: string }[];
  synthesisArticles: {
    id: string;
    child_id: string;
    type: string;
    title: string;
    body: string;
    source_record_ids: string | null;
    period_start: number | null;
    period_end: number | null;
    created_at: number;
    updated_at: number;
  }[];
  wikiPages?: {
    id: string;
    child_id: string;
    slug: string;
    title: string;
    type: string;
    body: string;
    source_record_ids: string | null;
    cross_refs: string | null;
    visual_data: string | null;
    created_at: number;
    updated_at: number;
  }[];
}

// 전체 DB를 JSON 파일로 내보내고 공유 시트 표시
export async function exportBackup(): Promise<void> {
  const db = await getDatabase();
  const [children, records, recordTags] = await Promise.all([
    getAllChildren(),
    getAllRecordsForBackup(),
    getAllRecordTags(),
  ]);
  const [tags, synthesisArticles, wikiPages] = await Promise.all([
    db.getAllAsync<{ id: string; name: string; child_id: string | null }>(
      'SELECT id, name, child_id FROM tags ORDER BY name'
    ),
    db.getAllAsync<{
      id: string; child_id: string; type: string; title: string; body: string;
      source_record_ids: string | null; period_start: number | null; period_end: number | null;
      created_at: number; updated_at: number;
    }>('SELECT id, child_id, type, title, body, source_record_ids, period_start, period_end, created_at, updated_at FROM synthesis_articles ORDER BY created_at ASC'),
    db.getAllAsync<{
      id: string; child_id: string; slug: string; title: string; type: string; body: string;
      source_record_ids: string | null; cross_refs: string | null; visual_data: string | null;
      created_at: number; updated_at: number;
    }>('SELECT id, child_id, slug, title, type, body, source_record_ids, cross_refs, visual_data, created_at, updated_at FROM wiki_pages ORDER BY created_at ASC'),
  ]);

  const data: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    children: children.map(c => ({ id: c.id, name: c.name, created_at: c.createdAt })),
    records,
    tags,
    recordTags,
    synthesisArticles,
    wikiPages,
  };

  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const fileName = `vibediary-backup-${dateStr}.json`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data, null, 2));
  await Sharing.shareAsync(filePath, { mimeType: 'application/json', dialogTitle: '백업 파일 저장' });
}

// 파일 선택 및 파싱 (유효성 검증 포함)
export async function pickAndParseBackup(): Promise<BackupData> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) {
    throw new Error('CANCELED');
  }

  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
  let data: BackupData;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }

  if (!data.version || !Array.isArray(data.children) || !Array.isArray(data.records)) {
    throw new Error('INVALID_FORMAT');
  }

  return data;
}

// URI에서 직접 읽어서 파싱 (Open with 흐름용)
export async function parseBackupFromUri(uri: string): Promise<BackupData> {
  // content:// URI는 직접 읽기 실패할 수 있으므로 앱 캐시 디렉토리로 복사 후 읽기
  let readUri = uri;
  let tmpPath: string | null = null;
  if (uri.startsWith('content://')) {
    tmpPath = `${FileSystem.cacheDirectory}backup_import_${Date.now()}.json`;
    await FileSystem.copyAsync({ from: uri, to: tmpPath });
    readUri = tmpPath;
  }
  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(readUri);
  } finally {
    if (tmpPath) FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => {});
  }
  let data: BackupData;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }
  if (!data.version || !Array.isArray(data.children) || !Array.isArray(data.records)) {
    throw new Error('INVALID_FORMAT');
  }
  return data;
}

// 덮어쓰기 복원: 기존 DB 전체 삭제 후 백업 데이터로 교체
export async function restoreOverwrite(data: BackupData): Promise<void> {
  const db = await getDatabase();

  await db.execAsync('DELETE FROM wiki_pages');
  await db.execAsync('DELETE FROM synthesis_articles');
  await db.execAsync('DELETE FROM record_tags');
  await db.execAsync('DELETE FROM records');
  await db.execAsync('DELETE FROM tags');
  await db.execAsync('DELETE FROM children');
  await db.execAsync('DELETE FROM daily_ai_cache');
  await db.execAsync('DELETE FROM home_briefing');

  for (const c of data.children) {
    await db.runAsync(
      'INSERT INTO children (id, name, created_at) VALUES (?, ?, ?)',
      c.id, c.name, c.created_at
    );
  }

  const validChildIds = new Set(data.children.map(c => c.id));

  for (const t of data.tags) {
    const childId = t.child_id && validChildIds.has(t.child_id) ? t.child_id : null;
    await db.runAsync(
      'INSERT OR IGNORE INTO tags (id, name, child_id) VALUES (?, ?, ?)',
      t.id, t.name, childId
    );
  }

  for (const r of data.records) {
    const childId = r.child_id && validChildIds.has(r.child_id) ? r.child_id : null;
    await db.runAsync(
      `INSERT INTO records (id, created_at, updated_at, audio_path, raw_text, summary, structured_data, embedding, is_synced, ai_pending, child_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, ?)`,
      r.id, r.created_at, r.created_at, r.audio_path, r.raw_text, r.summary,
      r.structured_data, childId
    );
  }

  for (const rt of data.recordTags) {
    await db.runAsync(
      'INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?, ?)',
      rt.record_id, rt.tag_id
    );
  }

  for (const a of (data.synthesisArticles ?? [])) {
    await db.runAsync(
      `INSERT OR IGNORE INTO synthesis_articles (id, child_id, type, title, body, source_record_ids, period_start, period_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      a.id, a.child_id, a.type, a.title, a.body,
      a.source_record_ids, a.period_start, a.period_end, a.created_at, a.updated_at
    );
  }

  for (const p of (data.wikiPages ?? [])) {
    await db.runAsync(
      `INSERT OR IGNORE INTO wiki_pages (id, child_id, slug, title, type, body, source_record_ids, cross_refs, visual_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      p.id, p.child_id, p.slug, p.title, p.type, p.body,
      p.source_record_ids, p.cross_refs, p.visual_data, p.created_at, p.updated_at
    );
  }

  // 구버전 백업 호환: child_id 없이 저장된 태그를 record_tags 기반으로 복구
  const hasLegacyTags = data.tags.some(t => t.child_id === undefined || t.child_id === null);
  if (hasLegacyTags) {
    await _recoverNullTagChildIds(db);
  }

  // 태그 없는 기록 AI 재처리 큐 등록 (복구 실패 또는 원래부터 태그 누락된 기록 구제)
  await _requeueUntaggedRecords(db);
  // 복원된 기록 전체를 가족 피드에 동기화
  void wakeSync('manual_retry');
}

// 병합 복원: 기존 데이터 유지 + 신규 데이터만 추가
export async function restoreMerge(data: BackupData): Promise<void> {
  const db = await getDatabase();

  // 기존 child id 목록
  const existingChildren = await getAllChildren();
  const existingChildIds = new Set(existingChildren.map(c => c.id));

  // child id 충돌 시 새 UUID 매핑 생성
  const childIdMap = new Map<string, string>();
  for (const c of data.children) {
    if (existingChildIds.has(c.id)) {
      childIdMap.set(c.id, Crypto.randomUUID());
    } else {
      childIdMap.set(c.id, c.id);
    }
  }

  // children 삽입 (충돌 시 새 id 사용)
  for (const c of data.children) {
    const newId = childIdMap.get(c.id)!;
    if (!existingChildIds.has(c.id)) {
      await db.runAsync(
        'INSERT OR IGNORE INTO children (id, name, created_at) VALUES (?, ?, ?)',
        newId, c.name, c.created_at
      );
    }
    // 충돌 시: 새 UUID로 삽입
    if (newId !== c.id) {
      await db.runAsync(
        'INSERT OR IGNORE INTO children (id, name, created_at) VALUES (?, ?, ?)',
        newId, c.name, c.created_at
      );
    }
  }

  // tags 삽입 (name+child_id 조합으로 중복 체크)
  const existingTagRows = await db.getAllAsync<{ id: string; name: string; child_id: string | null }>(
    'SELECT id, name, child_id FROM tags'
  );
  // key: "name|child_id" → id
  const existingTagKey = new Map(existingTagRows.map(t => [`${t.name}|${t.child_id ?? ''}`, t.id]));
  const tagIdMap = new Map<string, string>(); // 백업 tag id → 실제 tag id

  for (const t of data.tags) {
    const mappedChildId = t.child_id ? (childIdMap.get(t.child_id) ?? null) : null;
    const key = `${t.name}|${mappedChildId ?? ''}`;
    if (existingTagKey.has(key)) {
      tagIdMap.set(t.id, existingTagKey.get(key)!);
    } else {
      const newTagId = Crypto.randomUUID();
      await db.runAsync('INSERT OR IGNORE INTO tags (id, name, child_id) VALUES (?, ?, ?)', newTagId, t.name, mappedChildId);
      const inserted = await db.getFirstAsync<{ id: string }>(
        mappedChildId
          ? 'SELECT id FROM tags WHERE name = ? AND child_id = ?'
          : 'SELECT id FROM tags WHERE name = ? AND child_id IS NULL',
        ...(mappedChildId ? [t.name, mappedChildId] : [t.name])
      );
      if (inserted) {
        tagIdMap.set(t.id, inserted.id);
        existingTagKey.set(key, inserted.id);
      }
    }
  }

  // records 삽입 (중복 id 건너뜀, child_id 매핑 적용)
  for (const r of data.records) {
    const mappedChildId = r.child_id ? (childIdMap.get(r.child_id) ?? null) : null;
    await db.runAsync(
      `INSERT OR IGNORE INTO records (id, created_at, updated_at, audio_path, raw_text, summary, structured_data, embedding, is_synced, ai_pending, child_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, ?)`,
      r.id, r.created_at, r.created_at, r.audio_path, r.raw_text, r.summary,
      r.structured_data, mappedChildId
    );
  }

  // record_tags 삽입 (tag id 매핑 적용)
  for (const rt of data.recordTags) {
    const mappedTagId = tagIdMap.get(rt.tag_id);
    if (mappedTagId !== undefined) {
      await db.runAsync(
        'INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?, ?)',
        rt.record_id, mappedTagId
      );
    }
  }

  // synthesis_articles 삽입 (child_id 매핑 적용, 중복 id 건너뜀)
  for (const a of (data.synthesisArticles ?? [])) {
    const mappedChildId = childIdMap.get(a.child_id) ?? a.child_id;
    await db.runAsync(
      `INSERT OR IGNORE INTO synthesis_articles (id, child_id, type, title, body, source_record_ids, period_start, period_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      a.id, mappedChildId, a.type, a.title, a.body,
      a.source_record_ids, a.period_start, a.period_end, a.created_at, a.updated_at
    );
  }

  // wiki_pages 삽입 (child_id 매핑 적용, child_id+slug UNIQUE로 중복 건너뜀)
  for (const p of (data.wikiPages ?? [])) {
    const mappedChildId = childIdMap.get(p.child_id) ?? p.child_id;
    await db.runAsync(
      `INSERT OR IGNORE INTO wiki_pages (child_id, slug, title, type, body, source_record_ids, cross_refs, visual_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      mappedChildId, p.slug, p.title, p.type, p.body,
      p.source_record_ids, p.cross_refs, p.visual_data, p.created_at, p.updated_at
    );
  }

  // 구버전 백업 호환: child_id 없이 저장된 태그를 record_tags 기반으로 복구
  const hasLegacyTags = data.tags.some(t => t.child_id === undefined || t.child_id === null);
  if (hasLegacyTags) {
    await _recoverNullTagChildIds(db);
  }

  // 태그 없는 기록 AI 재처리 큐 등록
  await _requeueUntaggedRecords(db);
  // 복원 후 오늘의 이슈 캐시 무효화 (복원 전 빈 payload가 캐시되어 있을 수 있음)
  await db.execAsync('DELETE FROM daily_ai_cache');
  await db.execAsync('DELETE FROM home_briefing');
  // 복원된 기록 전체를 가족 피드에 동기화
  void wakeSync('manual_retry');
}

// 태그 없는 기록을 AI 재처리 큐에 등록 (raw_text 있고 record_tags 없는 기록)
async function _requeueUntaggedRecords(db: Awaited<ReturnType<typeof getDatabase>>): Promise<void> {
  await db.runAsync(`
    UPDATE records
    SET ai_pending = 1
    WHERE raw_text IS NOT NULL
      AND id NOT IN (SELECT DISTINCT record_id FROM record_tags)
  `);
}

// NULL child_id 태그를 record_tags 기반으로 per-child 태그로 복구 (v8 마이그레이션과 동일 로직)
async function _recoverNullTagChildIds(db: Awaited<ReturnType<typeof getDatabase>>): Promise<void> {
  const nullTags = await db.getAllAsync<{ id: number; name: string }>(
    'SELECT id, name FROM tags WHERE child_id IS NULL'
  );
  for (const nullTag of nullTags) {
    const linkedRecords = await db.getAllAsync<{ record_id: string }>(
      'SELECT rt.record_id FROM record_tags rt WHERE rt.tag_id = ?', nullTag.id
    );
    for (const { record_id } of linkedRecords) {
      const record = await db.getFirstAsync<{ child_id: string | null }>(
        'SELECT child_id FROM records WHERE id = ?', record_id
      );
      if (!record?.child_id) continue;
      await db.runAsync(
        'INSERT OR IGNORE INTO tags (name, child_id) VALUES (?, ?)', nullTag.name, record.child_id
      );
      const perChildTag = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM tags WHERE name = ? AND child_id = ?', nullTag.name, record.child_id
      );
      if (perChildTag) {
        await db.runAsync(
          `UPDATE record_tags SET tag_id = ? WHERE tag_id = ? AND record_id = ?`,
          perChildTag.id, nullTag.id, record_id
        );
      }
    }
    // 모든 연결이 이전된 NULL 태그 삭제
    const remaining = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM record_tags WHERE tag_id = ?', nullTag.id
    );
    if ((remaining?.count ?? 0) === 0) {
      await db.runAsync('DELETE FROM tags WHERE id = ?', nullTag.id);
    }
  }
}
