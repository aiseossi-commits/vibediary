import { getDatabase } from '../../db/database';
import { processWithAI } from '../aiProcessor';
import { DEFAULT_TAGS } from '../../db/schema';
import { updateRecord, getRecordById } from '../../db/recordsDao';
import { setTagsForRecord, getAllTags } from '../../db/tagsDao';
import { getNetworkState } from '../../utils/network';
import { markRecordDirty, wakeSync } from './syncService';
import { validateAndCleanStructuredData } from '../recordValidation';

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

// AI 처리에 N회 실패한 항목 수 (사용자 안내용)
export async function getFailedQueueCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM offline_queue WHERE status = 'failed'"
  );
  return result?.count ?? 0;
}

// 실패 항목을 다시 pending으로 되돌림 (사용자 수동 재시도)
export async function retryFailedQueue(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE offline_queue SET status = 'pending', retry_count = 0 WHERE status = 'failed'"
  );
}

let isProcessingQueue = false;
let apiErrorCooldownUntil = 0;
const API_ERROR_COOLDOWN_MS = 5 * 60 * 1000; // 429 등 API 오류 시 5분 대기

// --- 자동 재시도 (지수 백오프) ---
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
const RETRY_DELAYS = [10_000, 30_000, 60_000, 120_000]; // 10s, 30s, 1m, 2m

function scheduleRetry(): void {
  if (retryTimer) return;
  if (Date.now() < apiErrorCooldownUntil) return;

  const delay = RETRY_DELAYS[Math.min(retryAttempt, RETRY_DELAYS.length - 1)];
  retryAttempt++;

  retryTimer = setTimeout(() => {
    retryTimer = null;
    processOfflineQueue().catch(() => {});
  }, delay);
}

// --- 큐 처리 완료 콜백 ---
type QueueCallback = (processedCount: number) => void;
const listeners = new Set<QueueCallback>();

export function onQueueProcessed(cb: QueueCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export type QueueProcessResult =
  | { status: 'ok'; processed: number }
  | { status: 'already_running' }
  | { status: 'offline' }
  | { status: 'cooldown'; resumesAt: number }
  | { status: 'empty' };

// 오프라인 큐 일괄 처리 (네트워크 복구 시)
// force=true 이면 쿨다운 무시 (수동 버튼 전용)
export async function processOfflineQueue(force = false): Promise<QueueProcessResult> {
  if (isProcessingQueue) return { status: 'already_running' };
  if (!force && Date.now() < apiErrorCooldownUntil) return { status: 'cooldown', resumesAt: apiErrorCooldownUntil };
  const isOnline = await getNetworkState();
  if (!isOnline) return { status: 'offline' };

  isProcessingQueue = true;

  try {
    const db = await getDatabase();
    const pendingItems = await db.getAllAsync<{
      id: number;
      record_id: string;
      raw_text: string;
      retry_count: number;
    }>("SELECT id, record_id, raw_text, COALESCE(retry_count, 0) as retry_count FROM offline_queue WHERE status = 'pending' ORDER BY created_at ASC");

    if (pendingItems.length === 0) return { status: 'empty' };

    if (force) apiErrorCooldownUntil = 0;

    let processed = 0;
    let hasPendingLeft = false;

    for (const item of pendingItems) {
      try {
        // 이미 처리된 기록이면 큐에서만 제거
        const record = await getRecordById(item.record_id);
        if (!record || !record.aiPending) {
          await db.runAsync("UPDATE offline_queue SET status = 'done' WHERE id = ?", item.id);
          continue;
        }

        // AI 처리 (해당 record의 child 기준 커스텀 태그만)
        const allTagNames = (await getAllTags(record.childId ?? undefined).catch(() => [])).map((t) => t.name);
        const customTags = allTagNames.filter((n) => !DEFAULT_TAGS.includes(n));
        let result;
        try {
          result = await processWithAI(item.raw_text, customTags);
          // 후처리 검증
          result = validateAndCleanStructuredData(result, customTags);
        } catch (aiError) {
          console.warn(`오프라인 큐 AI 처리 실패 (record: ${item.record_id}):`, aiError);
          const errMsg = aiError instanceof Error ? aiError.message : '';
          if (errMsg.includes('429')) {
            apiErrorCooldownUntil = Date.now() + API_ERROR_COOLDOWN_MS;
            break;
          }
          // 재시도 횟수 증가. 5회 누적되면 'failed'로 종결 (영구 pending 방지)
          const newRetryCount = item.retry_count + 1;
          const MAX_RETRY = 5;
          if (newRetryCount >= MAX_RETRY) {
            await db.runAsync(
              "UPDATE offline_queue SET status = 'failed', retry_count = ? WHERE id = ?",
              newRetryCount, item.id
            );
            console.warn(`오프라인 큐 항목 ${MAX_RETRY}회 실패 → failed 종결 (record: ${item.record_id})`);
          } else {
            await db.runAsync(
              "UPDATE offline_queue SET retry_count = ? WHERE id = ?",
              newRetryCount, item.id
            );
            hasPendingLeft = true;
          }
          continue;
        }

        // 기록 업데이트 (AI 성공 시만)
        await updateRecord(item.record_id, {
          summary: result.summary,
          structuredData: result.structuredData,
          aiPending: false,
        });

        // 태그 업데이트
        await setTagsForRecord(item.record_id, result.tags, record.childId ?? undefined);
        await markRecordDirty(item.record_id);
        void wakeSync('record_changed');

        // 큐에서 완료 처리
        await db.runAsync(
          "UPDATE offline_queue SET status = 'done' WHERE id = ?",
          item.id
        );

        processed++;
      } catch (error) {
        console.warn(`오프라인 큐 처리 중 예기치 않은 오류 (record: ${item.record_id}):`, error);
        hasPendingLeft = true;

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

    // 콜백 알림
    if (processed > 0) {
      retryAttempt = 0;
      listeners.forEach((cb) => cb(processed));
    }


    // 실패한 항목이 남아있으면 자동 재시도 스케줄
    if (hasPendingLeft) {
      scheduleRetry();
    }

    return { status: 'ok', processed };
  } finally {
    isProcessingQueue = false;
  }
}
