import { getRecordsByDateRange } from '../db/queries';
import { getNetworkState } from '../utils/network';
import {
  getActiveBriefing, saveBriefing, getTodayKST,
  type BriefingPayload, type BriefingIssue,
} from '../db/briefingDao';

// 단일 사용자 태그(=후보가 되는 태그). 일상/일반은 제외 — 이슈성이 아님
const SKIP_TAGS = new Set(['#일상', '#식사', '#식단', '#발달', '#검사', '#상담', '#교육기관']);

// 점수 함수: durationDays * 2 + count
function scoreIssue(issue: BriefingIssue): number {
  return issue.durationDays * 2 + issue.count;
}

// 최근 14일 기록에서 후보 이슈 추출
async function extractCandidates(childId: string | undefined): Promise<BriefingIssue[]> {
  const today = getTodayKST();
  const start = new Date(today);
  start.setDate(start.getDate() - 13);
  const startStr = start.toISOString().slice(0, 10);

  const records = await getRecordsByDateRange(startStr, today, childId);
  if (records.length === 0) return [];

  // 태그별 등장 일자 집합 + 빈도
  const tagDays = new Map<string, Set<string>>();
  const tagCount = new Map<string, number>();
  for (const r of records) {
    const dateStr = new Date(r.createdAt).toISOString().slice(0, 10);
    for (const t of r.tags) {
      if (SKIP_TAGS.has(t.name)) continue;
      if (!tagDays.has(t.name)) tagDays.set(t.name, new Set());
      tagDays.get(t.name)!.add(dateStr);
      tagCount.set(t.name, (tagCount.get(t.name) ?? 0) + 1);
    }
  }

  // 진행일수 계산: 각 태그의 가장 최근 등장일까지의 연속 등장 일수
  const issues: BriefingIssue[] = [];
  for (const [tag, days] of tagDays.entries()) {
    const sortedDays = Array.from(days).sort();
    const firstDay = sortedDays[0];
    const firstDate = new Date(firstDay);
    const todayDate = new Date(today);
    const durationDays = Math.floor((todayDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    issues.push({
      tag,
      durationDays,
      count: tagCount.get(tag) ?? 0,
    });
  }

  // 임계값: 빈도 2 미만은 후보 제외 (단발성 노이즈)
  return issues.filter(i => i.count >= 2).sort((a, b) => scoreIssue(b) - scoreIssue(a));
}

// AI에게 한 줄 자연어 생성 요청
async function generatePrimaryLine(issues: BriefingIssue[], childName?: string): Promise<string> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) return fallbackPrimary(issues);

  const top = issues.slice(0, 3);
  const summary = top.map(i =>
    `- ${i.tag}: 진행 ${i.durationDays}일, 빈도 ${i.count}회`
  ).join('\n');

  const prompt = `당신은 발달장애 돌봄 가족에게 "오늘 신경 쓸 패턴"을 한 줄로 알려주는 비서입니다.

다음은 최근 14일 기록에서 추출한 이슈 후보입니다(점수 내림차순):
${summary}

위에서 가장 중요한 이슈 1개를 골라서, 자연스러운 한국어 한 문장(30자 이내)으로 표현하세요.
${childName ? `대상은 "${childName}"입니다.\n` : ''}
형식 규칙:
- 따옴표 없이, 한 문장만
- "최근 N일째", "이번 주 N회" 같이 구체적 숫자 포함
- 이모지 1개만 문장 시작에 (선택)
- 금지: 의료 조언, 진단성 표현 ("심각합니다", "위험합니다"). 관찰만.

좋은 예: 💧 수면 문제가 5일째 이어지고 있어요
좋은 예: 🌡️ 이번 주 발열 기록 4회 있었어요
나쁜 예: "최근 수면이 좋지 않아 의료 상담이 필요해 보입니다."

응답: 한 문장만, 다른 설명 없이.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${workerUrl}/ai?model=gemini-2.5-flash-lite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt }] },
        contents: [{ role: 'user', parts: [{ text: '한 줄 답변:' }] }],
        generationConfig: { maxOutputTokens: 60, temperature: 0.4 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return fallbackPrimary(issues);
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    return text || fallbackPrimary(issues);
  } catch {
    return fallbackPrimary(issues);
  } finally {
    clearTimeout(timeoutId);
  }
}

// AI 호출 실패 시 단순 fallback
function fallbackPrimary(issues: BriefingIssue[]): string {
  if (issues.length === 0) return '';
  const top = issues[0];
  const tagBare = top.tag.replace(/^#/, '');
  if (top.durationDays >= 3) return `${tagBare} 관련 기록이 ${top.durationDays}일째 이어지고 있어요`;
  return `이번 주 ${tagBare} 기록이 ${top.count}회 있어요`;
}

// 메인 entry: 오늘 브리핑 가져오기 (없으면 생성)
export async function getOrCreateBriefing(childId: string | undefined): Promise<BriefingPayload | null> {
  const cached = await getActiveBriefing(childId ?? null);
  if (cached) return cached.payload;

  const issues = await extractCandidates(childId);
  if (issues.length === 0) {
    // 표시할 이슈 없음 — 빈 payload 캐시 (오늘 다시 시도 방지)
    const empty: BriefingPayload = { primary: '', primaryTag: '', issues: [] };
    await saveBriefing(childId ?? null, empty);
    return null;
  }

  const isOnline = await getNetworkState();
  let primary: string;
  if (isOnline) {
    primary = await generatePrimaryLine(issues);
  } else {
    primary = fallbackPrimary(issues);
  }

  const payload: BriefingPayload = {
    primary,
    primaryTag: issues[0].tag,
    issues,
  };
  await saveBriefing(childId ?? null, payload);
  return payload;
}
