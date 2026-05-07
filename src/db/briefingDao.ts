import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';

export interface BriefingIssue {
  tag: string;          // 예: "#수면"
  durationDays: number; // 진행일수 (가장 최근 N일 안 첫 등장 ~ 오늘)
  count: number;        // 최근 14일 빈도
}

export interface BriefingPayload {
  primary: string;            // 30자 이내 한 줄 (예: "수면 문제가 5일째 이어지고 있어요")
  primaryTag: string;         // 메인 이슈 태그
  issues: BriefingIssue[];    // 더보기용 전체 이슈 (점수 내림차순)
}

export interface BriefingRow {
  id: string;
  childId: string | null;
  generatedDate: string;       // KST YYYY-MM-DD
  payload: BriefingPayload;
  dismissedUntil: string | null; // KST YYYY-MM-DD (이 날짜 이후에 다시 노출)
  createdAt: number;
}

// KST 기준 오늘 날짜 (YYYY-MM-DD)
export function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export async function getActiveBriefing(childId: string | null): Promise<BriefingRow | null> {
  const db = await getDatabase();
  const today = getTodayKST();
  const row = await db.getFirstAsync<{
    id: string;
    child_id: string | null;
    generated_date: string;
    payload: string;
    dismissed_until: string | null;
    created_at: number;
  }>(
    'SELECT * FROM home_briefing WHERE child_id IS ? AND generated_date = ? LIMIT 1',
    childId,
    today
  );
  if (!row) return null;
  // dismissed_until이 오늘 이후면 숨김
  if (row.dismissed_until && row.dismissed_until >= today) return null;
  try {
    return {
      id: row.id,
      childId: row.child_id,
      generatedDate: row.generated_date,
      payload: JSON.parse(row.payload),
      dismissedUntil: row.dismissed_until,
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}

export async function saveBriefing(childId: string | null, payload: BriefingPayload): Promise<void> {
  const db = await getDatabase();
  const today = getTodayKST();
  // 같은 날짜 기존 레코드는 교체
  await db.runAsync(
    'DELETE FROM home_briefing WHERE child_id IS ? AND generated_date = ?',
    childId,
    today
  );
  await db.runAsync(
    'INSERT INTO home_briefing (id, child_id, generated_date, payload, dismissed_until, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
    Crypto.randomUUID(),
    childId,
    today,
    JSON.stringify(payload),
    Date.now()
  );
}

// 오늘 브리핑 숨김(✕ 클릭) — 내일 자정 이전엔 노출 안 됨
export async function dismissBriefing(childId: string | null): Promise<void> {
  const db = await getDatabase();
  const today = getTodayKST();
  // dismissed_until = today (오늘 안 보임, 내일이면 다시 비교)
  await db.runAsync(
    'UPDATE home_briefing SET dismissed_until = ? WHERE child_id IS ? AND generated_date = ?',
    today,
    childId,
    today
  );
}

// 오래된 브리핑 정리 (30일 이상)
export async function pruneOldBriefings(): Promise<void> {
  const db = await getDatabase();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await db.runAsync('DELETE FROM home_briefing WHERE generated_date < ?', cutoff).catch(() => {});
}
