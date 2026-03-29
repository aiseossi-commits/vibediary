import { getDatabase } from './database';
import { DEFAULT_TAGS } from './schema';
import type { Tag } from '../types/record';

// 전체 태그 조회 (global + 아이별 커스텀)
export async function getAllTags(childId?: string): Promise<Tag[]> {
  const db = await getDatabase();
  if (childId) {
    return db.getAllAsync<Tag>(
      'SELECT id, name FROM tags WHERE child_id IS NULL OR child_id = ? ORDER BY name',
      childId
    );
  }
  return db.getAllAsync<Tag>('SELECT id, name FROM tags ORDER BY name');
}

// 태그 생성 (이미 존재하면 기존 태그 반환)
export async function createTag(name: string, childId?: string): Promise<Tag> {
  const db = await getDatabase();
  const normalizedName = name.startsWith('#') ? name : `#${name}`;
  const resolvedChildId = childId ?? null;

  await db.runAsync(
    'INSERT OR IGNORE INTO tags (name, child_id) VALUES (?, ?)',
    normalizedName,
    resolvedChildId
  );

  const tag = await db.getFirstAsync<Tag>(
    'SELECT id, name FROM tags WHERE name = ? AND (child_id IS ? OR child_id = ?)',
    normalizedName,
    resolvedChildId,
    resolvedChildId
  );

  if (!tag) throw new Error(`Tag not found after insert: ${normalizedName}`);
  return tag;
}

// 백업용: record_tags 전체 조회
export async function getAllRecordTags(): Promise<{ record_id: string; tag_id: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync<{ record_id: string; tag_id: number }>(
    'SELECT record_id, tag_id FROM record_tags'
  );
}

// 태그 삭제 (기본 태그는 삭제 불가)
export async function deleteTag(tagId: number): Promise<void> {
  const db = await getDatabase();
  const tag = await db.getFirstAsync<Tag>('SELECT id, name FROM tags WHERE id = ?', tagId);
  if (tag && DEFAULT_TAGS.includes(tag.name)) return;
  await db.runAsync('DELETE FROM tags WHERE id = ?', tagId);
}

// 기록에 태그 연결 (내부용)
async function addTagToRecord(recordId: string, tagId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?, ?)',
    recordId,
    tagId
  );
}

// 태그 이름 배열로 기록에 태그 일괄 연결
export async function setTagsForRecord(recordId: string, tagNames: string[], childId?: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM record_tags WHERE record_id = ?', recordId);
  for (const name of tagNames) {
    const tag = await createTag(name, childId);
    await addTagToRecord(recordId, tag.id);
  }
}

// 태그별 기록 수 조회 (global + 아이별), isDefault 포함
export async function getTagsWithCount(childId?: string): Promise<(Tag & { count: number; isDefault: boolean })[]> {
  const db = await getDatabase();
  let rows: (Tag & { count: number })[];

  if (childId) {
    rows = await db.getAllAsync<Tag & { count: number }>(
      `SELECT t.id, t.name, COUNT(rt.record_id) as count
       FROM tags t
       LEFT JOIN record_tags rt ON t.id = rt.tag_id
       WHERE t.child_id IS NULL OR t.child_id = ?
       GROUP BY t.id
       ORDER BY count DESC, t.name`,
      childId
    );
  } else {
    rows = await db.getAllAsync<Tag & { count: number }>(
      `SELECT t.id, t.name, COUNT(rt.record_id) as count
       FROM tags t
       LEFT JOIN record_tags rt ON t.id = rt.tag_id
       GROUP BY t.id
       ORDER BY count DESC, t.name`
    );
  }

  return rows.map((r) => ({ ...r, isDefault: DEFAULT_TAGS.includes(r.name) }));
}
