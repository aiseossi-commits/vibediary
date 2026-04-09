import { getWikiPages } from '../db/wikiDao';
import { getNetworkState } from '../utils/network';
import type { LintResult, LintIssue } from '../types/record';

const STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export async function runLint(childId: string): Promise<LintResult> {
  const pages = await getWikiPages(childId);

  if (pages.length === 0) {
    return { issues: [], suggestions: ['위키가 아직 없어요. absorb를 먼저 실행해보세요.'] };
  }

  const issues: LintIssue[] = [];
  const now = Date.now();

  // 1. stale 감지: 30일 이상 미갱신 (AI 호출 없이 클라이언트 판단)
  for (const page of pages) {
    if (now - page.updatedAt > STALE_THRESHOLD_MS) {
      issues.push({ slug: page.slug, reason: `30일 이상 미갱신 (마지막: ${formatDate(page.updatedAt)})` });
    }
  }

  // 2. orphan 감지: wiki-index에 없는 slug
  const indexPage = pages.find(p => p.slug === 'wiki-index');
  if (indexPage) {
    const indexBody = indexPage.body;
    const nonIndexPages = pages.filter(p => p.slug !== 'wiki-index');
    for (const page of nonIndexPages) {
      if (!indexBody.includes(page.slug)) {
        issues.push({ slug: page.slug, reason: '위키 인덱스에 등록되지 않은 고아 페이지' });
      }
    }
  }

  // 3. AI 호출로 content gaps / missing cross-refs 감지
  const suggestions: string[] = [];
  const isOnline = await getNetworkState();
  if (isOnline) {
    try {
      const aiSuggestions = await getAISuggestions(childId, pages);
      suggestions.push(...aiSuggestions);
    } catch {
      suggestions.push('AI 건강 체크를 완료하지 못했어요. 나중에 다시 시도해보세요.');
    }
  } else {
    suggestions.push('오프라인 상태로 AI 건강 체크는 건너뜠어요.');
  }

  return { issues, suggestions };
}

async function getAISuggestions(_childId: string, pages: ReturnType<typeof getWikiPages> extends Promise<infer T> ? T : never): Promise<string[]> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) return [];

  const pagesSummary = pages
    .map(p => `slug: ${p.slug}\n제목: ${p.title}\n마지막 갱신: ${formatDate(p.updatedAt)}\n본문 일부: ${p.body.slice(0, 200)}`)
    .join('\n\n---\n\n');

  const prompt = `당신은 발달장애 아동 돌봄 위키의 건강을 점검하는 AI입니다.
아래 위키 페이지들을 검토하고 개선 제안을 작성하세요.

위키 페이지 목록:
${pagesSummary}

점검 항목:
1. 중요한 토픽인데 독립 페이지가 없는 것 (예: 자주 언급되는 음식, 행동, 치료)
2. 페이지 간 cross-reference가 누락된 것
3. 내용이 너무 단순하거나 업데이트가 필요한 것

출력 형식: 각 제안을 한 줄씩, 최대 5개. 없으면 "위키 상태가 양호합니다."`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${workerUrl}/ai?model=gemini-2.5-flash-lite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.3 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return text.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
