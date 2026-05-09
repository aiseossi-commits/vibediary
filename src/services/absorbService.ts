import { getDatabase } from '../db/database';
import {
  getWikiPages,
  upsertWikiPage,
  getLastAbsorbTime,
  insertAbsorbLog,
} from '../db/wikiDao';
import { getNetworkState } from '../utils/network';
import { mapRowToRecordWithTags } from '../db/recordMapper';
import type { RecordWithTags, AbsorbResult, WikiPageType } from '../types/record';

const ABSORB_THRESHOLD = 10;

// ─── Wiki 스키마 상수 (Karpathy LLM Wiki 패턴의 Schema 문서) ───────────────
const WIKI_SCHEMA = `
위키 구조 규칙 (반드시 준수):

slug 체계:
- wiki-index         : 전체 페이지 목차 (항상 생성)
- overview/weekly    : 최근 14일 기록 요약
- timeline/milestones: is_milestone 기록 타임라인
- entity/food/{이름} : 특정 음식에 대한 반응·빈도 (예: entity/food/돼지고기)
- entity/behavior/{이름}: 특정 행동 패턴 ABC (예: entity/behavior/자해행동)
- entity/therapy/{이름} : 치료·처방 진행 (예: entity/therapy/OT)

타입별 작성 규칙:
- overview/weekly: ## 이번 주 주요 기록 / ## 패턴 및 빈도 / ## 특이사항 섹션 포함. 반복 패턴은 횟수와 함께 서술.
- timeline/milestones: 날짜 오름차순 타임라인. 각 항목: "- [YYYY-MM-DD] 영역: 내용"
- entity 페이지: 해당 토픽에 대한 모든 관련 기록을 날짜별로 정리. 반복 패턴·빈도 포함.

entity 생성 조건:
- 특정 토픽이 기록에 3회 이상 등장할 때만 entity 페이지 생성
- 기존 entity 페이지가 있으면 새 기록을 통합(merge)하여 업데이트

공통 규칙:
- 기록에 있는 사실만 서술. 추측·진단·조언 금지.
- 날짜는 [YYYY-MM-DD] 형식으로 인용.
- 기존 페이지의 slug를 재사용하여 연속성 유지.
`;

// ─── 마지막 absorb 이후 신규 기록 수 ────────────────────────────────────────
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

export async function shouldAbsorb(childId: string): Promise<boolean> {
  const lastAbsorb = await getLastAbsorbTime(childId);
  const newCount = await getNewRecordCountSince(childId, lastAbsorb);
  return newCount >= ABSORB_THRESHOLD;
}

export async function getAbsorbProgress(childId: string): Promise<{ ready: boolean; current: number; needed: number }> {
  const lastAbsorb = await getLastAbsorbTime(childId);
  const current = await getNewRecordCountSince(childId, lastAbsorb);
  return { ready: current >= ABSORB_THRESHOLD, current, needed: ABSORB_THRESHOLD };
}

// ─── 기록 조회 ───────────────────────────────────────────────────────────────
async function getRecordsSinceLastAbsorb(childId: string, since: number | null): Promise<RecordWithTags[]> {
  const db = await getDatabase();
  const rows = since
    ? await db.getAllAsync<any>(
        'SELECT * FROM records WHERE child_id = ? AND created_at > ? ORDER BY created_at ASC',
        childId, since
      )
    : await db.getAllAsync<any>(
        'SELECT * FROM records WHERE child_id = ? ORDER BY created_at ASC',
        childId
      );
  return rows.map((row: any) => mapRowToRecordWithTags(row));
}

async function getMilestoneRecords(childId: string): Promise<RecordWithTags[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM records WHERE child_id = ? AND structured_data LIKE '%"is_milestone":true%' ORDER BY created_at ASC`,
    childId
  );
  return rows.map((row: any) => mapRowToRecordWithTags(row));
}

// ─── 포맷 헬퍼 ───────────────────────────────────────────────────────────────
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
  if (sd.event_type === 'behavioral_incident') {
    const parts: string[] = [];
    if (sd.antecedent) parts.push(`A:${sd.antecedent}`);
    if (sd.behavior) parts.push(`B:${sd.behavior}`);
    if (sd.consequence) parts.push(`C:${sd.consequence}`);
    return parts.length > 0 ? `${base} [${parts.join(', ')}]` : base;
  }
  return base;
}

// ─── AI 호출 ─────────────────────────────────────────────────────────────────
async function callAbsorbAI(prompt: string): Promise<string> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) throw new Error('Worker 설정 없음');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${workerUrl}/ai?model=gemini-2.5-flash-lite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4000, temperature: 0.3 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI 오류 ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── 메인 absorb 프롬프트 ────────────────────────────────────────────────────
function buildAbsorbPrompt(
  newRecords: RecordWithTags[],
  existingPages: { slug: string; title: string; body: string }[]
): string {
  const recordLines = newRecords.map(formatRecordLine).join('\n');
  const existingPagesText = existingPages.length > 0
    ? existingPages.map(p => `=== ${p.slug} ===\n제목: ${p.title}\n${p.body}`).join('\n\n')
    : '(없음)';

  return `당신은 발달장애 아동 돌봄 기록 위키를 관리하는 AI입니다.
아래 위키 구조 규칙과 기존 위키 페이지를 참고하여 새 기록을 통합한 위키를 업데이트하세요.

${WIKI_SCHEMA}

=== 기존 위키 페이지 ===
${existingPagesText}

=== 신규 기록 ===
${recordLines}

=== 출력 형식 (반드시 준수) ===
아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 순수 JSON만 출력하세요.

{
  "pages": [
    {
      "slug": "slug 문자열",
      "title": "페이지 제목",
      "type": "overview | timeline | entity",
      "body": "마크다운 본문",
      "cross_refs": ["참조하는 slug 목록"],
      "visual_data": null
    }
  ],
  "index": "## Wiki Index\\n- [제목](slug)\\n한줄 설명\\n..."
}

규칙:
- pages 배열에 wiki-index는 포함하지 마세요 (index 필드로 별도 제공)
- 기존 페이지는 slug를 동일하게 유지하고 새 기록을 통합하여 업데이트
- overview/weekly와 timeline/milestones는 항상 포함
- visual_data는 overview/weekly 페이지에만 설정: {"patterns":[{"emoji":"이모지","label":"패턴명","count":숫자}, ...]}
  패턴 3~6개 추출 (수면/식사/행동/감정 등 반복되는 항목)
  각 pattern 항목은 emoji(문자열) + label(문자열) + count(숫자) 세 필드만 가질 것
- 기록이 없으면 해당 섹션은 "기록 없음"으로 작성`;
}

// ─── JSON 파싱 ───────────────────────────────────────────────────────────────
interface AbsorbAIResponse {
  pages: {
    slug: string;
    title: string;
    type: string;
    body: string;
    cross_refs?: string[];
    visual_data?: string | Record<string, unknown> | null;
  }[];
  index: string;
}

// AI가 visual_data를 객체 리터럴로 반환하든 문자열로 반환하든 DB에는 JSON 문자열로 저장
function normalizeVisualData(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try { JSON.parse(trimmed); return trimmed; } catch { return null; }
  }
  if (typeof raw === 'object') {
    try { return JSON.stringify(raw); } catch { return null; }
  }
  return null;
}

// VISUAL_DATA: prefix 이후의 balanced {} 블록 추출 (개행 포함 허용)
// fallback absorb + 레거시 깨진 데이터 정화용으로 공용 사용
export function extractVisualDataBlock(raw: string): { visualData: string | null; body: string } {
  const idx = raw.indexOf('VISUAL_DATA:');
  if (idx === -1) return { visualData: null, body: raw.trim() };

  const braceStart = raw.indexOf('{', idx + 'VISUAL_DATA:'.length);
  if (braceStart === -1) return { visualData: null, body: raw.trim() };

  let depth = 0;
  let inString = false;
  let escape = false;
  let braceEnd = -1;
  for (let i = braceStart; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { braceEnd = i; break; }
    }
  }
  if (braceEnd === -1) return { visualData: null, body: raw.trim() };

  const jsonStr = raw.slice(braceStart, braceEnd + 1);
  try { JSON.parse(jsonStr); }
  catch { return { visualData: null, body: raw.trim() }; }

  const before = raw.slice(0, idx).trim();
  const after = raw.slice(braceEnd + 1).replace(/^\s*(?:---)?\s*/, '').trim();
  const body = [before, after].filter(Boolean).join('\n').trim();
  return { visualData: jsonStr, body };
}

function parseAbsorbResponse(raw: string): AbsorbAIResponse | null {
  try {
    const match = raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/(\{[\s\S]*\})/);
    const jsonStr = match ? match[1] : raw.trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed.pages) || typeof parsed.index !== 'string') return null;
    return parsed as AbsorbAIResponse;
  } catch {
    return null;
  }
}

// ─── Fallback: 최소 overview/weekly + timeline/milestones ───────────────────
async function runFallbackAbsorb(
  childId: string,
  newRecords: RecordWithTags[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  try {
    const lines = newRecords.map(formatRecordLine).join('\n');
    const prompt = `당신은 발달장애 아동 돌봄 기록을 분석하는 AI입니다.
아래 최근 기록들을 바탕으로 주간 요약을 작성하세요.

출력 형식 (반드시 이 순서·구조 준수):
1. 첫 줄: VISUAL_DATA:{"patterns":[{"emoji":"이모지","label":"패턴명","count":숫자}, ...]}
   - 반드시 한 줄로 출력 (JSON 내부에 개행 금지)
   - patterns는 3~6개의 반복 패턴(수면/식사/행동/감정 등)
   - 각 항목은 emoji(문자열) + label(문자열) + count(숫자) 세 필드만
   - 추출할 패턴이 없으면 VISUAL_DATA:{"patterns":[]}
2. 둘째 줄: ---
3. 셋째 줄부터 마크다운 본문:
   ## 이번 주 주요 기록
   ## 패턴 및 빈도
   ## 특이사항

기록:
${lines}`;
    const raw = await callAbsorbAI(prompt);
    const { visualData, body } = extractVisualDataBlock(raw);
    const result = await upsertWikiPage({
      childId, slug: 'overview/weekly', title: `주간 요약 (${formatDate(Date.now())})`,
      type: 'overview', body, visualData, sourceRecordIds: newRecords.map(r => r.id),
    });
    if (result === 'created') created++; else updated++;
  } catch (e) {
    console.warn('[Absorb fallback] overview/weekly 실패:', e);
  }

  try {
    const milestones = await getMilestoneRecords(childId);
    if (milestones.length > 0) {
      const lines = milestones.map(r => `[${formatDate(r.createdAt)}] ${r.summary}`).join('\n');
      const prompt = `당신은 발달장애 아동의 성장 이정표를 기록하는 AI입니다.
아래 이정표 기록들을 날짜 오름차순 타임라인으로 작성하세요.
각 항목: "- [YYYY-MM-DD] 영역: 내용"

이정표 기록:
${lines}`;
      const body = await callAbsorbAI(prompt);
      const result = await upsertWikiPage({
        childId, slug: 'timeline/milestones', title: '발달 이정표',
        type: 'timeline', body, sourceRecordIds: milestones.map(r => r.id),
      });
      if (result === 'created') created++; else updated++;
    }
  } catch (e) {
    console.warn('[Absorb fallback] timeline/milestones 실패:', e);
  }

  return { created, updated };
}

// ─── 메인 runAbsorb ──────────────────────────────────────────────────────────
export async function runAbsorb(childId: string): Promise<AbsorbResult> {
  const isOnline = await getNetworkState();
  if (!isOnline) throw new Error('OFFLINE');

  const lastAbsorb = await getLastAbsorbTime(childId);
  const newRecords = await getRecordsSinceLastAbsorb(childId, lastAbsorb);

  if (newRecords.length === 0) {
    return { absorbedCount: 0, articlesCreated: 0, articlesUpdated: 0 };
  }

  const existingPages = await getWikiPages(childId);
  const existingPageSummaries = existingPages
    .filter(p => p.slug !== 'wiki-index')
    .map(p => ({ slug: p.slug, title: p.title, body: p.body }));

  let articlesCreated = 0;
  let articlesUpdated = 0;
  let usedFallback = false;

  try {
    const prompt = buildAbsorbPrompt(newRecords, existingPageSummaries);
    const raw = await callAbsorbAI(prompt);
    const parsed = parseAbsorbResponse(raw);

    if (!parsed) {
      console.warn('[Absorb] JSON 파싱 실패 → fallback');
      usedFallback = true;
    } else {
      const validTypes: WikiPageType[] = ['overview', 'timeline', 'entity', 'wiki-index'];
      for (const page of parsed.pages) {
        try {
          const pageType: WikiPageType = validTypes.includes(page.type as WikiPageType)
            ? (page.type as WikiPageType)
            : 'overview';
          const result = await upsertWikiPage({
            childId,
            slug: page.slug,
            title: page.title,
            type: pageType,
            body: page.body,
            crossRefs: page.cross_refs ?? null,
            visualData: normalizeVisualData(page.visual_data),
          });
          if (result === 'created') articlesCreated++; else articlesUpdated++;
        } catch (e) {
          console.warn(`[Absorb] 페이지 저장 실패 (${page.slug}):`, e);
        }
      }

      // wiki-index 페이지 upsert
      try {
        const result = await upsertWikiPage({
          childId,
          slug: 'wiki-index',
          title: '위키 인덱스',
          type: 'wiki-index',
          body: parsed.index,
        });
        if (result === 'created') articlesCreated++; else articlesUpdated++;
      } catch (e) {
        console.warn('[Absorb] wiki-index 저장 실패:', e);
      }
    }
  } catch (e) {
    console.warn('[Absorb] AI 호출 실패 → fallback:', e);
    usedFallback = true;
  }

  if (usedFallback) {
    const fb = await runFallbackAbsorb(childId, newRecords);
    articlesCreated += fb.created;
    articlesUpdated += fb.updated;
  }

  const absorbResult: AbsorbResult = {
    absorbedCount: newRecords.length,
    articlesCreated,
    articlesUpdated,
  };
  await insertAbsorbLog(childId, absorbResult);

  return absorbResult;
}

// ─── 항해일지 수동 생성 ───────────────────────────────────────────────────────

export type VoyageReportType = 'weekly' | 'monthly' | 'sleep' | 'food' | 'behavior';

export const VOYAGE_REPORT_OPTIONS: { type: VoyageReportType; label: string; description: string; days: number }[] = [
  { type: 'weekly',   label: '최근 7일 요약',      description: '지난 일주일의 기록을 종합합니다',      days: 7  },
  { type: 'monthly',  label: '최근 한달 종합',      description: '한달치 패턴과 변화를 분석합니다',      days: 30 },
  { type: 'sleep',    label: '수면 인사이트',       description: '수면 관련 기록을 집중 분석합니다',     days: 30 },
  { type: 'food',     label: '음식 반응 분석',      description: '식이 반응과 선호도를 정리합니다',      days: 30 },
  { type: 'behavior', label: '행동 패턴 분석',      description: '반복 행동과 감정 패턴을 분석합니다',   days: 30 },
];

async function getRecordsForPeriod(childId: string, days: number): Promise<RecordWithTags[]> {
  const db = await getDatabase();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM records WHERE child_id = ? AND created_at >= ? ORDER BY created_at ASC',
    childId, since
  );
  return rows.map((row: any) => mapRowToRecordWithTags(row));
}

function buildVoyagePrompt(type: VoyageReportType, records: RecordWithTags[]): { prompt: string; title: string } {
  const recordLines = records.map(formatRecordLine).join('\n');
  const dateStr = formatDate(Date.now());

  const configs: Record<VoyageReportType, { title: string; instruction: string }> = {
    weekly: {
      title: `주간 요약 (${dateStr})`,
      instruction: `지난 7일간의 기록을 종합한 주간 요약을 작성하세요.
섹션: ## 이번 주 주요 기록 / ## 패턴 및 빈도 / ## 특이사항
반복 패턴은 횟수와 함께 서술하세요.`,
    },
    monthly: {
      title: `한달 종합 인사이트 (${dateStr})`,
      instruction: `지난 30일간의 기록을 종합 분석하세요.
섹션: ## 이달의 주요 변화 / ## 반복 패턴 / ## 성장 & 주목할 점 / ## 다음 달 주목 사항`,
    },
    sleep: {
      title: `수면 인사이트 (${dateStr})`,
      instruction: `수면 관련 기록을 분석하세요.
수면 시간, 입면 어려움, 야간 각성, 낮잠 패턴을 정리하세요.
수면 관련 기록이 충분하지 않으면 "수면 관련 기록이 충분하지 않습니다."로 작성하세요.`,
    },
    food: {
      title: `음식 반응 분석 (${dateStr})`,
      instruction: `음식 및 식이 관련 기록을 분석하세요.
선호 음식, 거부 음식, 새로운 도전, 식사 거부 패턴을 정리하세요.
음식 관련 기록이 충분하지 않으면 "음식 관련 기록이 충분하지 않습니다."로 작성하세요.`,
    },
    behavior: {
      title: `행동 패턴 분석 (${dateStr})`,
      instruction: `행동·감정 패턴을 분석하세요.
반복 행동, 자해·공격 행동, 감정 조절 패턴, ABC 분석을 정리하세요.
행동 관련 기록이 충분하지 않으면 "행동 관련 기록이 충분하지 않습니다."로 작성하세요.`,
    },
  };

  const { title, instruction } = configs[type];
  const prompt = `당신은 발달장애 아동 돌봄 기록을 분석하는 AI입니다.
아래 기록들을 바탕으로 다음 분석을 수행하세요.

${instruction}

기록 (${records.length}건):
${recordLines}

출력: 마크다운 본문만, 다른 설명 없이.`;

  return { prompt, title };
}

export async function generateVoyageReport(childId: string, type: VoyageReportType): Promise<void> {
  const isOnline = await getNetworkState();
  if (!isOnline) throw new Error('OFFLINE');

  const option = VOYAGE_REPORT_OPTIONS.find(o => o.type === type)!;
  const records = await getRecordsForPeriod(childId, option.days);
  if (records.length === 0) throw new Error('NO_RECORDS');

  const { prompt, title } = buildVoyagePrompt(type, records);
  const body = await callAbsorbAI(prompt);

  const slug = `voyage/${type}/${formatDate(Date.now())}`;
  await upsertWikiPage({
    childId,
    slug,
    title,
    type: 'overview',
    body,
    sourceRecordIds: records.map(r => r.id),
  });
}
