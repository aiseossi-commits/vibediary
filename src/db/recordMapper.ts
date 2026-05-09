import { parseJsonOrNull } from '../utils/parseJson';
import type { RecordWithTags, StructuredData, Tag } from '../types/record';

export function mapRowToRecordWithTags(row: any, tags: Tag[] = []): RecordWithTags {
  return {
    id: row.id,
    createdAt: row.created_at,
    audioPath: row.audio_path,
    rawText: row.raw_text,
    summary: row.summary,
    structuredData: parseJsonOrNull<StructuredData>(row.structured_data),
    isSynced: row.is_synced === 1,
    aiPending: row.ai_pending === 1,
    source: row.source ?? undefined,
    childId: row.child_id ?? null,
    photoUrl: row.photo_url ?? null,
    tags,
  };
}
