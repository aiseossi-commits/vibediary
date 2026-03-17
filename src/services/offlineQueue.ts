import { getDatabase } from '../db/database';
import { processWithAI, generateEmbedding } from './aiProcessor';
import { updateRecord, getRecordById } from '../db/recordsDao';
import { setTagsForRecord, getAllTags } from '../db/tagsDao';
import { getNetworkState } from '../utils/network';

// 오프라인 큐에 추가
export async function addToOfflineQueue(recordId: string, rawText: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO offline_queue (record_id, raw_text, created_at, status) VALUES (?, ?, ?, ?)',
    recordId,
    rawText,
    Date.now(),
    'pending'
  );
}

// 오프라인 큐의 대기 항목 수
export async function getPendingQueueCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM offline_queue WHERE status = 'pending'"
  );
  return result?.count ?? 0;
}

let isProcessingQueue = false;
let apiErrorCooldownUntil = 0;
const API_ERROR_COOLDOWN_MS = 5 * 60 * 1000; // 429 등 API 오류 시 5분 대기

// 오프라인 큐 일괄 처리 (네트워크 복구 시)
export async function processOfflineQueue(): Promise<number> {
  if (isProcessingQueue) return 0;
  if (Date.now() < apiErrorCooldownUntil) return 0;
  const isOnline = await getNetworkState();
  if (!isOnline) return 0;

  isProcessingQueue = true;

  try {
    const db = await getDatabase();
    const pendingItems = await db.getAllAsync<{
      id: number;
      record_id: string;
      raw_text: string;
    }>("SELECT id, record_id, raw_text FROM offline_queue WHERE status = 'pending' ORDER BY created_at ASC");

    let processed = 0;

    for (const item of pendingItems) {
      try {
        // 이미 처리된 기록이면 큐에서만 제거
        const record = await getRecordById(item.record_id);
        if (!record || !record.aiPending) {
          await db.runAsync("UPDATE offline_queue SET status = 'done' WHERE id = ?", item.id);
          continue;
        }

        // AI 처리 (커스텀 태그 포함)
        const baseTags = ['#의료', '#투약', '#행동', '#일상', '#치료'];
        const allTagNames = (await getAllTags().catch(() => [])).map((t) => t.name);
        const customTags = allTagNames.filter((n) => !baseTags.includes(n));
        const result = await processWithAI(item.raw_text, customTags);

        // embedding 생성 (실패해도 큐 처리 계속)
        let embedding: number[] | null = null;
        try {
          embedding = await generateEmbedding(result.summary);
        } catch {
          // embedding 생성 실패 시 null 유지
        }

        // 기록 업데이트
        await updateRecord(item.record_id, {
          summary: result.summary,
          structuredData: result.structuredData,
          aiPending: false,
          embedding,
        });

        // 태그 업데이트
        await setTagsForRecord(item.record_id, result.tags);

        // 큐에서 완료 처리
        await db.runAsync(
          "UPDATE offline_queue SET status = 'done' WHERE id = ?",
          item.id
        );

        processed++;
      } catch (error) {
        console.warn(`오프라인 큐 처리 실패 (record: ${item.record_id}):`, error);

        const errMsg = error instanceof Error ? error.message : '';
        // API 할당량 초과 → 쿨다운 후 중단 (재시도해도 의미없음)
        if (errMsg.includes('429')) {
          apiErrorCooldownUntil = Date.now() + API_ERROR_COOLDOWN_MS;
          break;
        }

        // 네트워크 오류면 중단
        const stillOnline = await getNetworkState();
        if (!stillOnline) break;
      }
    }

    // 완료된 항목 정리
    await db.runAsync("DELETE FROM offline_queue WHERE status = 'done'");

    return processed;
  } finally {
    isProcessingQueue = false;
  }
}
