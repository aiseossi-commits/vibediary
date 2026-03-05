import { getDatabase } from '../db/database';
import { processWithAI } from './aiProcessor';
import { updateRecord } from '../db/recordsDao';
import { setTagsForRecord } from '../db/tagsDao';
import { getNetworkState } from '../utils/network';

// 오프라인 큐에 추가
export async function addToOfflineQueue(recordId: string, rawText: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO offline_queue (record_id, raw_text, created_at, status) VALUES (?, ?, ?, ?)',
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

// 오프라인 큐 일괄 처리 (네트워크 복구 시)
export async function processOfflineQueue(): Promise<number> {
  if (isProcessingQueue) return 0;
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
        // AI 처리
        const result = await processWithAI(item.raw_text);

        // 기록 업데이트
        await updateRecord(item.record_id, {
          summary: result.summary,
          structuredData: result.structuredData,
          mood: result.mood,
          aiPending: false,
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
        // 개별 실패는 건너뛰고 다음 항목 처리
        console.warn(`오프라인 큐 처리 실패 (record: ${item.record_id}):`, error);

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
