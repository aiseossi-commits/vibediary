import { getRecordsByDateRange } from '../db/queries';
import { getNetworkState } from '../utils/network';
import {
  getActiveBriefing, saveBriefing, getTodayKST,
  type BriefingPayload, type BriefingIssue,
} from '../db/briefingDao';

const SKIP_TAGS = new Set(['#일상', '#식사', '#식단', '#발달', '#검사', '#상담', '#교육기관']);

// 이모지 허용 목록 (LLM이 이 중에서 선택)
const EMOJI_LIST = '💤🌡️🌀⚡🍽️🚽🔁👂💊😤😰';

// 내부 점수 계산용 타입 (저장/전송 안 함)
interface CandidateIssue {
  tag: string;
  score: number;
  changeScore: number;   // recentDays7 - prevDays7 (양수=증가, 음수=감소)
  count3: number;        // 최근 3일 기록 수
  count14: number;       // 최근 14일 기록 수 (필터 + 표시용)
  recentDays7: number;   // 최근 7일 내 등장 일수 (0~7)
  prevDays7: number;     // 직전 7일(8~14일 전) 등장 일수
  totalDays21: number;   // 21일 창 전체 등장 일수
  recentDates: string[]; // 최근 7일 등장 날짜 목록 (MM-DD, LLM 컨텍스트용)
}

function getSignalLabel(c: CandidateIssue): string {
  if (c.prevDays7 === 0) return '신규';
  if (c.changeScore >= 4) return '급증';
  if (c.changeScore <= -4) return '감소 중';
  return '지속';
}

// 오늘 기준 N일 전 날짜 문자열 (UTC 기준, 기존 코드와 일관성 유지)
function daysAgo(today: string, n: number): string {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - n);
  return dt.toISOString().slice(0, 10);
}

// 최근 21일 기록에서 후보 이슈 추출
async function extractCandidates(childId: string | undefined): Promise<CandidateIssue[]> {
  const today = getTodayKST();
  const startStr = daysAgo(today, 20); // 21일 창

  const records = await getRecordsByDateRange(startStr, today, childId);
  if (records.length === 0) return [];

  // 기간 경계
  const recent3Start = daysAgo(today, 2);  // 최근 3일 (오늘 포함)
  const recent7Start = daysAgo(today, 6);  // 최근 7일
  const prev7End    = daysAgo(today, 7);   // 직전 7일 끝 (14일 전 ~ 8일 전)
  const prev7Start  = daysAgo(today, 13);  // 직전 7일 시작

  const tagDays21    = new Map<string, Set<string>>();
  const tagDays7     = new Map<string, Set<string>>();
  const tagPrevDays7 = new Map<string, Set<string>>();
  const tagCount3    = new Map<string, number>();
  const tagCount14   = new Map<string, number>();

  for (const r of records) {
    const dateStr = new Date(r.createdAt).toISOString().slice(0, 10);

    for (const t of r.tags) {
      if (SKIP_TAGS.has(t.name)) continue;

      // 21일 전체 unique 날짜
      if (!tagDays21.has(t.name)) tagDays21.set(t.name, new Set());
      tagDays21.get(t.name)!.add(dateStr);

      // 최근 7일 unique 날짜
      if (dateStr >= recent7Start) {
        if (!tagDays7.has(t.name)) tagDays7.set(t.name, new Set());
        tagDays7.get(t.name)!.add(dateStr);
      }

      // 직전 7일 (days 8~14) unique 날짜
      if (dateStr >= prev7Start && dateStr <= prev7End) {
        if (!tagPrevDays7.has(t.name)) tagPrevDays7.set(t.name, new Set());
        tagPrevDays7.get(t.name)!.add(dateStr);
      }

      // 최근 3일 기록 수
      if (dateStr >= recent3Start) {
        tagCount3.set(t.name, (tagCount3.get(t.name) ?? 0) + 1);
      }

      // 최근 14일 기록 수 (필터용: prev7Start ~ today)
      if (dateStr >= prev7Start) {
        tagCount14.set(t.name, (tagCount14.get(t.name) ?? 0) + 1);
      }
    }
  }

  const candidates: CandidateIssue[] = [];

  for (const [tag, days21] of tagDays21.entries()) {
    const count14 = tagCount14.get(tag) ?? 0;
    if (count14 < 2) continue; // 최근 14일 2회 미만 제외

    const recentDays7  = tagDays7.get(tag)?.size ?? 0;
    const prevDays7    = tagPrevDays7.get(tag)?.size ?? 0;
    const count3       = tagCount3.get(tag) ?? 0;
    const totalDays21  = days21.size;
    const changeScore  = recentDays7 - prevDays7;

    const score = changeScore * 4 + count3 * 5 + totalDays21;

    const recentDates = Array.from(tagDays7.get(tag) ?? [])
      .sort()
      .map(d => d.slice(5)); // MM-DD

    candidates.push({
      tag,
      score,
      changeScore,
      count3,
      count14,
      recentDays7,
      prevDays7,
      totalDays21,
      recentDates,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

// AI에게 한 줄 자연어 생성 요청
async function generatePrimaryLine(candidates: CandidateIssue[], childName?: string): Promise<string> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) return fallbackPrimary(candidates);

  const top = candidates.slice(0, 3);
  const summary = top.map(c => {
    const signal = getSignalLabel(c);
    const dates = c.recentDates.length > 0 ? ` (${c.recentDates.join(', ')})` : '';
    return `- ${c.tag} [${signal}]: 최근 7일 ${c.recentDays7}일 등장${dates}, 최근 3일 ${c.count3}회`;
  }).join('\n');

  const prompt = `당신은 발달장애 돌봄 가족에게 "지금 신경 써야 할 패턴"을 한 줄로 알려주는 비서입니다.

다음은 최근 기록 패턴 분석 결과입니다(점수 내림차순):
${summary}

위에서 가장 중요한 이슈 1개를 골라서, 자연스러운 한국어 한 문장(30자 이내)으로 표현하세요.
${childName ? `대상은 "${childName}"입니다.\n` : ''}
형식 규칙:
- 이모지 1개를 문장 앞에 반드시 붙이기. 반드시 아래 목록 중 하나만 선택:
  ${EMOJI_LIST}
- 한 줄만, 따옴표 없이
- 신호 유형에 맞는 표현 사용:
  [신규] → "처음", "이번 주 처음"
  [급증] → "갑자기", "집중적으로"
  [감소 중] → "줄어드는 추세"
  [지속] → "이어지고 있어요"
- 구체적 숫자 포함 (최근 N일, N회)
- 금지: 의료 조언, 진단성 표현

좋은 예: 💤 수면 문제가 이번 주 5일 연속 이어지고 있어요
좋은 예: ⚡ 행동 관련 기록이 이번 주 처음 2회 등장했어요
나쁜 예: 최근 수면이 좋지 않아 의료 상담이 필요해 보입니다.

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
    if (!res.ok) return fallbackPrimary(candidates);
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    return text || fallbackPrimary(candidates);
  } catch {
    return fallbackPrimary(candidates);
  } finally {
    clearTimeout(timeoutId);
  }
}

function fallbackPrimary(candidates: CandidateIssue[]): string {
  if (candidates.length === 0) return '';
  const top = candidates[0];
  const tagBare = top.tag.replace(/^#/, '');
  const signal = getSignalLabel(top);
  if (signal === '신규') return `${tagBare} 관련 기록이 이번 주 처음 등장했어요`;
  if (signal === '급증') return `${tagBare} 관련 기록이 최근 집중적으로 늘고 있어요`;
  if (top.recentDays7 >= 5) return `${tagBare} 관련 기록이 이번 주 ${top.recentDays7}일 이어지고 있어요`;
  return `이번 주 ${tagBare} 기록이 ${top.count14}회 있어요`;
}

// 메인 entry: 오늘 브리핑 가져오기 (없으면 생성)
export async function getOrCreateBriefing(childId: string | undefined): Promise<BriefingPayload | null> {
  const cached = await getActiveBriefing(childId ?? null);
  if (cached) return cached.payload;

  const candidates = await extractCandidates(childId);
  if (candidates.length === 0) {
    const empty: BriefingPayload = { primary: '', primaryTag: '', issues: [] };
    await saveBriefing(childId ?? null, empty);
    return null;
  }

  const isOnline = await getNetworkState();
  const primary = isOnline
    ? await generatePrimaryLine(candidates)
    : fallbackPrimary(candidates);

  // CandidateIssue → BriefingIssue 변환 (저장용)
  // durationDays: 21일 창 전체 등장 일수 (더보기 모달의 "X일째" 표시)
  const issues: BriefingIssue[] = candidates.map(c => ({
    tag: c.tag,
    durationDays: c.totalDays21,
    count: c.count14,
  }));

  const payload: BriefingPayload = {
    primary,
    primaryTag: candidates[0].tag,
    issues,
  };
  await saveBriefing(childId ?? null, payload);
  return payload;
}
