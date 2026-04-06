import { getDatabase } from '../db/database';
import {
  getSynthesisArticleByType,
  upsertSynthesisArticle,
  getLastAbsorbTime,
  insertAbsorbLog,
} from '../db/synthesisDao';
import { getNetworkState } from '../utils/network';
import type { RecordWithTags, AbsorbResult } from '../types/record';

const ABSORB_THRESHOLD = 10; // 신규 기록 최소 누적 수

// 마지막 absorb 이후 신규 기록 수 조회
async function getNewRecordCountSince(childId: string, since: number | null): Promise<number> {
  const db = await getDatabase();
  const row = since
    ? await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM records WHERE child_id = ? AND created_at > ?',
        childId, since
      )
    : await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM records WHERE child_id = ?',
        childId
      );
  return row?.count ?? 0;
}

// absorb 실행 여부 체크
export async function shouldAbsorb(childId: string): Promise<boolean> {
  const lastAbsorb = await getLastAbsorbTime(childId);
  const newCount = await getNewRecordCountSince(childId, lastAbsorb);
  return newCount >= ABSORB_THRESHOLD;
}

// 최근 N일 기록 조회 (absorb용 raw rows)
async function getRecentRecordsForAbsorb(childId: string, days: number): Promise<RecordWithTags[]> {
  const db = await getDatabase();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM records WHERE child_id = ? AND created_at >= ? ORDER BY created_at ASC',
    childId, since
  );
  return rows.map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    audioPath: row.audio_path,
    rawText: row.raw_text,
    summary: row.summary,
    structuredData: (() => { try { return row.structured_data ? JSON.parse(row.structured_data) : null; } catch { return null; } })(),
    isSynced: row.is_synced === 1,
    aiPending: row.ai_pending === 1,
    source: row.source ?? undefined,
    childId: row.child_id ?? null,
    tags: [],
  }));
}

// developmental 기록만 조회 (전체 기간)
async function getDevelopmentalRecords(childId: string): Promise<RecordWithTags[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM records WHERE child_id = ? AND structured_data LIKE '%"event_type":"developmental"%' ORDER BY created_at ASC`,
    childId
  );
  return rows.map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    audioPath: row.audio_path,
    rawText: row.raw_text,
    summary: row.summary,
    structuredData: (() => { try { return row.structured_data ? JSON.parse(row.structured_data) : null; } catch { return null; } })(),
    isSynced: row.is_synced === 1,
    aiPending: row.ai_pending === 1,
    source: row.source ?? undefined,
    childId: row.child_id ?? null,
    tags: [],
  }));
}

// milestone 기록만 조회 (전체 기간)
async function getMilestoneRecords(childId: string): Promise<RecordWithTags[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM records WHERE child_id = ? AND structured_data LIKE '%"is_milestone":true%' ORDER BY created_at ASC`,
    childId
  );
  return rows.map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    audioPath: row.audio_path,
    rawText: row.raw_text,
    summary: row.summary,
    structuredData: (() => { try { return row.structured_data ? JSON.parse(row.structured_data) : null; } catch { return null; } })(),
    isSynced: row.is_synced === 1,
    aiPending: row.ai_pending === 1,
    source: row.source ?? undefined,
    childId: row.child_id ?? null,
    tags: [],
  }));
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatRecordLine(r: RecordWithTags): string {
  const sd = r.structuredData;
  const base = `[${formatDate(r.createdAt)}] ${r.summary}`;
  if (!sd) return base;
  if (sd.event_type === 'developmental') {
    const parts: string[] = [];
    if (sd.domain) parts.push(`영역:${sd.domain}`);
    if (sd.ontology_code) parts.push(`코드:${sd.ontology_code}`);
    if (sd.is_milestone) parts.push('이정표');
    return parts.length > 0 ? `${base} (${parts.join(', ')})` : base;
  }
  return base;
}

// --- AI 호출 공통 함수 ---
async function callAbsorbAI(prompt: string): Promise<string> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) throw new Error('Worker 설정 없음');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${workerUrl}/ai?model=gemini-2.5-flash-lite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.3 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`AI 오류 ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- 프롬프트 빌더 ---
function buildWeeklyOverviewPrompt(records: RecordWithTags[]): string {
  const lines = records.map(formatRecordLine).join('\n');
  return `당신은 발달장애 아동 돌봄 기록을 분석하는 AI입니다.
아래는 최근 14일간의 돌봄 기록입니다. 이를 바탕으로 주간 요약 아티클을 작성하세요.

작성 규칙:
- 문체: 관찰자 시점, 3인칭, 객관적 사실만 서술
- 추측, 진단, 조언 금지
- 반복 패턴이 있으면 구체적 횟수와 함께 언급
- 길이: 15~40줄
- 섹션: ## 이번 주 주요 기록, ## 패턴 및 빈도, ## 특이사항 순서로 작성

기록:
${lines}

위 기록을 바탕으로 주간 요약을 작성하세요. 마크다운 형식으로 작성하세요.`;
}

function buildDevelopmentalDomainPrompt(records: RecordWithTags[], existingBody?: string): string {
  const lines = records.map(formatRecordLine).join('\n');
  const existing = existingBody ? `\n기존 발달 아티클 (갱신 대상):\n${existingBody}\n` : '';
  return `당신은 발달장애 아동의 발달 관찰 기록을 분석하는 AI입니다.
아래 발달 관찰 기록들을 종합하여 발달 성장 아티클을 작성하세요.${existing}

작성 규칙:
- 문체: 관찰자 시점, 날짜와 함께 사실만 서술
- 발달 영역(언어/사회성/인지/운동/자조/감각)별로 섹션 구분
- 이정표는 "[YYYY-MM-DD] 처음으로 ~" 형식으로 강조
- 추측, 진단, 조언 금지
- 길이: 20~60줄

발달 관찰 기록:
${lines}

발달 성장 아티클을 마크다운 형식으로 작성하세요.`;
}

function buildMilestoneTimelinePrompt(records: RecordWithTags[], existingBody?: string): string {
  const lines = records.map(r => `[${formatDate(r.createdAt)}] ${r.summary}`).join('\n');
  const existing = existingBody ? `\n기존 이정표 타임라인 (갱신 대상):\n${existingBody}\n` : '';
  return `당신은 발달장애 아동의 성장 이정표를 기록하는 AI입니다.
아래는 이정표로 표시된 기록들입니다.${existing}

작성 규칙:
- 날짜 오름차순으로 타임라인 나열
- 각 항목: "- [YYYY-MM-DD] 영역: 내용" 형식
- 추측 없이 기록된 사실만 서술
- 기존 아티클이 있으면 새 이정표를 추가하여 통합

이정표 기록:
${lines}

이정표 타임라인을 마크다운 형식으로 작성하세요.`;
}

// --- 본문 품질 체크 ---
function isBodyQualityOk(body: string): boolean {
  return body.trim().split('\n').length >= 10;
}

// --- 메인 absorb 실행 ---
export async function runAbsorb(childId: string): Promise<AbsorbResult> {
  const isOnline = await getNetworkState();
  if (!isOnline) throw new Error('OFFLINE');

  let articlesCreated = 0;
  let articlesUpdated = 0;

  // 1. weekly_overview
  try {
    const recentRecords = await getRecentRecordsForAbsorb(childId, 14);
    if (recentRecords.length > 0) {
      const prompt = buildWeeklyOverviewPrompt(recentRecords);
      const body = await callAbsorbAI(prompt);
      if (isBodyQualityOk(body)) {
        const now = Date.now();
        const result = await upsertSynthesisArticle({
          childId,
          type: 'weekly_overview',
          title: `주간 요약 (${formatDate(now)})`,
          body,
          sourceRecordIds: recentRecords.map(r => r.id),
          periodStart: recentRecords[0]?.createdAt,
          periodEnd: recentRecords[recentRecords.length - 1]?.createdAt,
        });
        if (result === 'created') articlesCreated++; else articlesUpdated++;
      }
    }
  } catch (e) {
    console.warn('[Absorb] weekly_overview 실패:', e);
  }

  // 2. developmental_domain
  try {
    const devRecords = await getDevelopmentalRecords(childId);
    if (devRecords.length >= 3) {
      const existing = await getSynthesisArticleByType(childId, 'developmental_domain');
      const prompt = buildDevelopmentalDomainPrompt(devRecords, existing?.body);
      const body = await callAbsorbAI(prompt);
      if (isBodyQualityOk(body)) {
        const result = await upsertSynthesisArticle({
          childId,
          type: 'developmental_domain',
          title: '발달 성장 기록',
          body,
          sourceRecordIds: devRecords.map(r => r.id),
        });
        if (result === 'created') articlesCreated++; else articlesUpdated++;
      }
    }
  } catch (e) {
    console.warn('[Absorb] developmental_domain 실패:', e);
  }

  // 3. milestone_timeline
  try {
    const milestoneRecords = await getMilestoneRecords(childId);
    if (milestoneRecords.length > 0) {
      const existing = await getSynthesisArticleByType(childId, 'milestone_timeline');
      const prompt = buildMilestoneTimelinePrompt(milestoneRecords, existing?.body);
      const body = await callAbsorbAI(prompt);
      if (isBodyQualityOk(body)) {
        const result = await upsertSynthesisArticle({
          childId,
          type: 'milestone_timeline',
          title: '발달 이정표',
          body,
          sourceRecordIds: milestoneRecords.map(r => r.id),
        });
        if (result === 'created') articlesCreated++; else articlesUpdated++;
      }
    }
  } catch (e) {
    console.warn('[Absorb] milestone_timeline 실패:', e);
  }

  // absorb 기록 수 집계
  const lastAbsorb = await getLastAbsorbTime(childId);
  const absorbedCount = await getNewRecordCountSince(childId, lastAbsorb);

  const absorbResult: AbsorbResult = { absorbedCount, articlesCreated, articlesUpdated };
  await insertAbsorbLog(childId, absorbResult);

  return absorbResult;
}
