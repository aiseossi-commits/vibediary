import { getDatabase } from './database';
import type { Tag } from '../types/record';

// 전체 태그 조회
export async function getAllTags(): Promise<Tag[]> {
  const db = await getDatabase();
  return db.getAllAsync<Tag>('SELECT id, name FROM tags ORDER BY name');
}

// 태그 생성 (이미 존재하면 기존 태그 반환)
export async function createTag(name: string): Promise<Tag> {
  const db = await getDatabase();
  const normalizedName = name.startsWith('#') ? name : `#${name}`;

  await db.runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', normalizedName);

  const tag = await db.getFirstAsync<Tag>(
    'SELECT id, name FROM tags WHERE name = ?',
    normalizedName
  );

  return tag!;
}

// 태그 삭제
export async function deleteTag(tagId: number): Promise<void> {
  const db = await getDatabase();
  // CASCADE로 record_tags도 자동 삭제
  await db.runAsync('DELETE FROM tags WHERE id = ?', tagId);
}

// 기록에 태그 연결
export async function addTagToRecord(recordId: string, tagId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?, ?)',
    recordId,
    tagId
  );
}

// 기록에서 태그 제거
export async function removeTagFromRecord(recordId: string, tagId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM record_tags WHERE record_id = ? AND tag_id = ?',
    recordId,
    tagId
  );
}

// 태그 이름 배열로 기록에 태그 일괄 연결 (AI 태깅 후 사용)
export async function setTagsForRecord(recordId: string, tagNames: string[]): Promise<void> {
  const db = await getDatabase();

  // 기존 태그 관계 제거
  await db.runAsync('DELETE FROM record_tags WHERE record_id = ?', recordId);

  // 새 태그 연결
  for (const name of tagNames) {
    const tag = await createTag(name);
    await addTagToRecord(recordId, tag.id);
  }
}

// 태그별 기록 수 조회
export async function getTagsWithCount(): Promise<(Tag & { count: number })[]> {
  const db = await getDatabase();
  return db.getAllAsync<Tag & { count: number }>(
    `SELECT t.id, t.name, COUNT(rt.record_id) as count
     FROM tags t
     LEFT JOIN record_tags rt ON t.id = rt.tag_id
     GROUP BY t.id
     ORDER BY count DESC, t.name`
  );
}
