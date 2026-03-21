import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '../db/database';
import { getAllChildren } from '../db/childrenDao';
import { getAllTags, getAllRecordTags } from '../db/tagsDao';
import { getAllRecordsForBackup } from '../db/recordsDao';

const BACKUP_VERSION = 1;

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
  tags: { id: number; name: string }[];
  recordTags: { record_id: string; tag_id: number }[];
}

// 전체 DB를 JSON 파일로 내보내고 공유 시트 표시
export async function exportBackup(): Promise<void> {
  const [children, records, tags, recordTags] = await Promise.all([
    getAllChildren(),
    getAllRecordsForBackup(),
    getAllTags(),
    getAllRecordTags(),
  ]);

  const data: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    children: children.map(c => ({ id: c.id, name: c.name, created_at: c.createdAt })),
    records,
    tags,
    recordTags,
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
  const raw = await FileSystem.readAsStringAsync(uri);
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

  await db.execAsync('DELETE FROM record_tags');
  await db.execAsync('DELETE FROM records');
  await db.execAsync('DELETE FROM tags');
  await db.execAsync('DELETE FROM children');

  for (const c of data.children) {
    await db.runAsync(
      'INSERT INTO children (id, name, created_at) VALUES (?, ?, ?)',
      c.id, c.name, c.created_at
    );
  }

  for (const t of data.tags) {
    await db.runAsync('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', t.id, t.name);
  }

  for (const r of data.records) {
    await db.runAsync(
      `INSERT INTO records (id, created_at, audio_path, raw_text, summary, structured_data, embedding, is_synced, ai_pending, child_id)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
      r.id, r.created_at, r.audio_path, r.raw_text, r.summary,
      r.structured_data, r.is_synced, r.child_id
    );
  }

  for (const rt of data.recordTags) {
    await db.runAsync(
      'INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?, ?)',
      rt.record_id, rt.tag_id
    );
  }
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

  // tags 삽입 (name UNIQUE 충돌 시 기존 태그 id 사용)
  const existingTags = await getAllTags();
  const tagNameToId = new Map(existingTags.map(t => [t.name, t.id]));
  const tagIdMap = new Map<number, number>(); // 백업 tag id → 실제 tag id

  for (const t of data.tags) {
    if (tagNameToId.has(t.name)) {
      tagIdMap.set(t.id, tagNameToId.get(t.name)!);
    } else {
      await db.runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', t.name);
      const inserted = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM tags WHERE name = ?', t.name
      );
      if (inserted) {
        tagIdMap.set(t.id, inserted.id);
        tagNameToId.set(t.name, inserted.id);
      }
    }
  }

  // records 삽입 (중복 id 건너뜀, child_id 매핑 적용)
  for (const r of data.records) {
    const mappedChildId = r.child_id ? (childIdMap.get(r.child_id) ?? r.child_id) : null;
    await db.runAsync(
      `INSERT OR IGNORE INTO records (id, created_at, audio_path, raw_text, summary, structured_data, embedding, is_synced, ai_pending, child_id)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
      r.id, r.created_at, r.audio_path, r.raw_text, r.summary,
      r.structured_data, r.is_synced, mappedChildId
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
}
