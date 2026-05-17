import { getAllRecordsForSearch } from '../db/queries';
import { getWikiPages } from '../db/wikiDao';
import { getNetworkState } from '../utils/network';
import type { SearchResult, RecordWithTags, WikiPage } from '../types/record';

const SEARCH_SYSTEM_PROMPT = (today: string, childName?: string, hasWiki?: boolean) =>
  `당신은 발달장애 돌봄 기록을 읽고 **패턴을 발견해 알려주는 분석가**입니다.
데이터를 정리해서 보여주는 게 아니라, 의미 있는 패턴·변화·이상 신호를 찾아 알려주는 게 목적입니다.

오늘: ${today}${childName ? `\n돌봄 대상: ${childName}` : ''}
${hasWiki ? `
<wiki>: AI가 기록들을 분석해 합성한 위키 페이지(패턴·발달 궤적·토픽별 요약)
<records>: 원본 기록
wiki의 인사이트를 우선 활용하고, 구체적 사례는 records에서 인용. 상충하면 records 우선.
` : `<records>에 모든 돌봄 기록이 포함되어 있습니다.
`}
**쿼리 유형 판별 (먼저 파악하고 답변 방식 결정)**

- **날짜 조회형**: "언제 X가 있었어?", "X난 날", "몇 번 있었어?" → 해당하는 날짜·횟수를 **빠짐없이** 나열. 요약·패턴화 금지.
- **패턴 분석형**: "X 패턴이 어때?", "최근 어떤지", "변화가 있어?" → 아래 원칙 적용.

**패턴 분석형 답변 원칙**

1. **두괄식**: 핵심 발견·결론을 먼저 1~2문장. 헤더 없이 본문으로 시작.
2. **단순 나열 금지**: "1월 5일 X, 1월 8일 Y, 1월 12일 Z" 같은 날짜순 나열 금지.
3. **패턴 단위로 묶기**: 시간/날짜 순서가 아니라 주제·변화·맥락 단위.
4. **인용은 핵심 근거에만**: 모든 항목에 [YYYY-MM-DD] 붙이지 말고, 가장 중요한 사례 2~3개에만.

**공통 원칙**

- **추측 금지**: 기록에 없으면 답하지 마세요. 관련 기록 0건이면 "해당 기록을 찾지 못했어요."만 답하세요.${childName ? ` 돌봄 대상은 "${childName}"으로 부르세요.` : ''}

**답변 형식 (두괄식 + 근거 분리)**
- 결론을 먼저 1~2문장으로 헤더 없이 작성.
- 자세한 근거가 있고 결론과 분리할 가치가 있으면 다음 줄부터 정확히 이 헤더로 시작:
  ## 근거
  - 그 아래에 패턴·인용·구체 사례 서술. 자유 형식.
- 짧은 답변이거나 결론만으로 충분하면 ## 근거 섹션 **생략**.

**예시**

❌ 나쁜 답변:
"5월 1일 발열 38도, 5월 3일 발열 38.5도, 5월 5일 발열 38.2도가 기록됐어요."

✓ 좋은 답변:
"5월 첫째 주 내내 38도대 발열이 이어졌어요. 일주일 후 정상화됐습니다.

## 근거
주로 저녁에 체온이 올라갔고(38~38.5도), 새벽에는 정상이었어요. 가장 높았던 건 5월 3일 [2025-05-03] 38.5도. 해열제는 두 번 사용했고 그 외엔 미온수 마사지로 관리했습니다."

❌ 나쁜 답변:
"4월 2일 마그네슘, 4월 3일 비타민C, 4월 4일 마그네슘+오메가3, 4월 5일 비타민C..."

✓ 좋은 답변:
"이번 달은 마그네슘·비타민C 위주로 평소 패턴 유지 중입니다."

이전 대화가 있으면 연속성 있게. "정리해줘"/"더 자세히" 같은 후속 질문은 이전 답변을 기반으로 답하세요.`;

function formatRecord(record: RecordWithTags): string {
  const d = new Date(record.createdAt);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tags = record.tags.map((t) => t.name).join('');
  const base = `${date} ${tags} ${record.summary}`;

  const sd = record.structuredData;
  if (!sd || Object.keys(sd).length === 0) return base;

  const eventType = sd.event_type;

  if (eventType === 'behavioral_incident') {
    const parts: string[] = [];
    if (sd.antecedent) parts.push(`A:${sd.antecedent}`);
    if (sd.behavior) parts.push(`B:${sd.behavior}`);
    if (sd.consequence) parts.push(`C:${sd.consequence}`);
    if (parts.length > 0) return `${base} [${parts.join(', ')}]`;
  }

  if (eventType === 'developmental') {
    const parts: string[] = [];
    if (sd.domain) parts.push(`domain:${sd.domain}`);
    parts.push('type:발달관찰');
    return `${base} [${parts.join(', ')}]`;
  }

  const data = Object.entries(sd)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  return data ? `${base} [${data}]` : base;
}

function formatWikiPage(page: WikiPage): string {
  return `[${page.title}]\n${page.body}`;
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function searchRecords(
  query: string,
  childId?: string,
  conversationHistory?: { role: 'user' | 'assistant'; text: string }[],
  childName?: string
): Promise<SearchResult> {
  const isOnline = await getNetworkState();
  if (!isOnline) {
    return { answer: '오프라인 상태에서는 AI 등대를 사용할 수 없어요.' };
  }

  const records = await getAllRecordsForSearch(childId);

  if (records.length === 0) {
    return { answer: '아직 기록이 없어요. 녹음이나 텍스트로 기록을 남겨보세요.' };
  }

  const wikiPages = childId ? await getWikiPages(childId).catch(() => []) : [];
  const hasWiki = wikiPages.length > 0;

  let contextText: string;
  if (hasWiki) {
    // wiki-index를 선두에 배치
    const indexPage = wikiPages.find(p => p.slug === 'wiki-index');
    const otherPages = wikiPages.filter(p => p.slug !== 'wiki-index');
    const orderedPages = indexPage ? [indexPage, ...otherPages] : otherPages;

    const wikiContext = orderedPages.map(formatWikiPage).join('\n\n---\n\n');
    const rawContext = records.map(formatRecord).join('\n');
    contextText = `<wiki>\n${wikiContext}\n</wiki>\n\n<records>\n${rawContext}\n</records>`;
  } else {
    contextText = records.map(formatRecord).join('\n');
  }

  const answer = await generateAnswer(query, contextText, records.length, conversationHistory, childName, hasWiki);

  // 사진이 있는 기록의 URL 추출 (등대 갤러리 응답용)
  const photoUrls = records
    .filter(r => r.photoUrl)
    .map(r => r.photoUrl as string)
    .slice(0, 10);

  return { answer, photo_urls: photoUrls.length > 0 ? photoUrls : undefined };
}

async function generateAnswer(
  query: string,
  context: string,
  recordCount: number,
  conversationHistory?: { role: 'user' | 'assistant'; text: string }[],
  childName?: string,
  hasWiki?: boolean
): Promise<string> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    return '기록을 찾았지만 AI 답변을 생성할 수 없습니다.';
  }

  const history = conversationHistory ?? [];
  const contents: { role: string; parts: { text: string }[] }[] = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  contents.push({
    role: 'user',
    parts: [{
      text: `${context}\n\n<record_count>${recordCount}건</record_count>\n\n<user_query>\n${query}\n</user_query>`,
    }],
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `${workerUrl}/ai?model=gemini-2.5-flash-lite`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SEARCH_SYSTEM_PROMPT(getToday(), childName, hasWiki) }] },
          contents,
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.5 },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) return '답변 생성 중 오류가 발생했어요.';
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '답변을 생성하지 못했어요.';
  } catch {
    return '답변 생성 중 오류가 발생했어요.';
  }
}
