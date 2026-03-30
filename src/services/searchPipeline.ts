import { getAllRecordsForSearch } from '../db/queries';
import { getNetworkState } from '../utils/network';
import type { SearchResult, RecordWithTags } from '../types/record';

const SEARCH_SYSTEM_PROMPT = (today: string, childName?: string) =>
  `당신은 발달장애인 돌봄 기록을 분석해 답변하는 AI 비서입니다.
오늘: ${today}${childName ? `\n돌봄 대상: ${childName}` : ''}

아래 <records>에 모든 돌봄 기록이 포함되어 있습니다. 사용자의 질문에 대해 이 기록들을 근거로 답변하세요.

규칙:
1. 기록에 있는 사실만 답변하세요. 날짜를 언급할 때는 [YYYY-MM-DD] 형식으로 인용하세요.
2. 답변은 따뜻하고 간결하게 작성하세요.${childName ? ` 돌봄 대상은 "${childName}"으로 부르세요.` : ''}
3. 기록에 없는 내용은 절대 추측하지 마세요.
4. 관련 기록이 없으면 "해당 기록을 찾지 못했어요."라고 답하세요.
5. 반복 패턴이나 빈도가 있으면 구체적으로 언급하세요 (예: "돼지고기 6회, 땅콩 5회").
6. 답변 첫 문장에 분석한 총 기록 건수를 자연스럽게 포함하세요.
7. 이전 대화가 있으면 연속성 있게 답변하세요. "정리해줘", "요약해줘", "더 자세히" 같은 후속 질문은 이전 답변을 기반으로 답하세요.`;

function formatRecord(record: RecordWithTags): string {
  const d = new Date(record.createdAt);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tags = record.tags.map((t) => t.name).join('');
  const base = `${date} ${tags} ${record.summary}`;

  if (record.structuredData && Object.keys(record.structuredData).length > 0) {
    const data = Object.entries(record.structuredData).map(([k, v]) => `${k}:${v}`).join(',');
    return `${base} [${data}]`;
  }
  return base;
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

  const context = records.map(formatRecord).join('\n');
  const answer = await generateAnswer(query, context, records.length, conversationHistory, childName);

  return { answer };
}

async function generateAnswer(
  query: string,
  context: string,
  recordCount: number,
  conversationHistory?: { role: 'user' | 'assistant'; text: string }[],
  childName?: string
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
      text: `<records>\n${context}\n</records>\n\n<record_count>${recordCount}건</record_count>\n\n<user_query>\n${query}\n</user_query>`,
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
          systemInstruction: { parts: [{ text: SEARCH_SYSTEM_PROMPT(getToday(), childName) }] },
          contents,
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
          generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
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
