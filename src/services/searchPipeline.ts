import { detectTagsFromQuery, vectorSearch, getTagIdsByNames } from './vectorSearch';
import { getRecordById } from '../db/recordsDao';
import { getNetworkState } from '../utils/network';
import type { SearchResult, ScoredRecord, RecordWithTags } from '../types/record';

// 유사도 임계값 — 이상이면 full 포맷, 미만이면 summary만
const CONTEXT_FULL_THRESHOLD = 0.6;

// 검색 답변 생성 시스템 프롬프트
const SEARCH_SYSTEM_PROMPT = `당신은 발달장애인 돌봄 기록을 검색해 답변하는 AI 비서입니다.
사용자의 질문에 대해 제공된 기록들을 근거로 답변하세요.

규칙:
1. 기록에 있는 사실만 답변하세요. 모든 문장에는 반드시 근거 기록의 날짜를 [YYYY-MM-DD] 형식으로 인용하세요.
2. 답변은 따뜻하고 간결하게 작성하세요.
3. 인용할 근거 기록이 없는 내용은 절대 작성하지 마세요. 추측, 일반 상식, 의학 조언 금지.
4. context의 기록이 질문과 직접 관련이 없다면 "제공된 기록에서 관련 정보를 찾지 못했어요."라고 답하세요.
5. 여러 기록에서 반복되는 패턴이나 빈도가 있으면 반드시 언급하세요 (예: "돼지고기 6회, 땅콩 5회").
6. 첫 문장에 분석한 총 기록 건수를 자연스럽게 포함하세요 (예: "관련 기록 11건을 살펴봤어요.")`;

// 3단계 검색 파이프라인
export async function searchRecords(
  query: string,
  queryEmbedding: number[] | null,
  filterTagNames?: string[],
  childId?: string,
  conversationHistory?: { role: 'user' | 'assistant'; text: string }[]
): Promise<SearchResult> {
  // 1단계: 태그 자동 감지 (사용자 필터 + 자동 감지)
  const autoDetectedTags = detectTagsFromQuery(query);
  const allFilterTags = [...new Set([...(filterTagNames || []), ...autoDetectedTags])];
  const filterTagIds = allFilterTags.length > 0 ? await getTagIdsByNames(allFilterTags) : undefined;

  // 2단계: 벡터 유사도 검색 (임베딩이 있을 때)
  const scoredRecords: { record: RecordWithTags; score: number }[] = [];

  if (queryEmbedding) {
    const vectorResults = await vectorSearch(queryEmbedding, filterTagIds, childId);
    for (const vr of vectorResults) {
      const record = await getRecordById(vr.id);
      if (record) scoredRecords.push({ record, score: vr.score });
    }
  }

  // sourceRecords 구성 (score 포함)
  const sourceRecords: ScoredRecord[] =
    scoredRecords.map(({ record, score }) => ({ ...record, score }));

  if (sourceRecords.length === 0) {
    return {
      answer: '관련 기록을 찾지 못했어요.',
      sourceRecords: [],
    };
  }

  // 평균 유사도 거부 — 근거가 약하면 솔직히 모른다고 답변
  const avgScore = scoredRecords.length > 0
    ? scoredRecords.reduce((sum, r) => sum + r.score, 0) / scoredRecords.length
    : 0;
  if (avgScore < 0.5) {
    return {
      answer: '관련 기록이 충분하지 않아 정확한 답변을 드리기 어려워요. 다른 키워드로 다시 질문해 보세요.',
      sourceRecords: [],
    };
  }

  // 3단계: LLM 답변 생성
  const isOnline = await getNetworkState();
  if (!isOnline) {
    return {
      answer: '오프라인 상태에서는 관련 기록만 보여드려요.',
      sourceRecords,
    };
  }

  const answer = await generateAnswer(query, scoredRecords, sourceRecords.length, conversationHistory);

  return {
    answer,
    sourceRecords,
  };
}

// LLM 답변 생성 (Gemini 2.5 Flash Lite via Worker proxy)
async function generateAnswer(
  query: string,
  scoredRecords: { record: RecordWithTags; score: number }[],
  recordCount: number,
  conversationHistory?: { role: 'user' | 'assistant'; text: string }[]
): Promise<string> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    return '기록을 찾았지만 AI 답변을 생성할 수 없습니다.';
  }

  // 컨텍스트 구성 — 유사도 기반 압축
  // score >= 0.6: full 포맷 (날짜 #태그 요약 [키:값])
  // score < 0.6 또는 fallback: summary만
  const formatRecord = (record: RecordWithTags, score?: number): string => {
    const d = new Date(record.createdAt);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const tags = record.tags.map((t) => t.name).join('');
    const summary = `${date} ${tags} ${record.summary}`;

    if (score !== undefined && score >= CONTEXT_FULL_THRESHOLD && record.structuredData) {
      const data = Object.entries(record.structuredData)
        .map(([k, v]) => `${k}:${v}`)
        .join(',');
      return `${summary} [${data}]`;
    }
    return summary;
  };

  const context = scoredRecords
    .map(({ record, score }) => formatRecord(record, score))
    .join('\n');

  // 슬라이딩 윈도우: 이전 대화 컨텍스트 구성
  const history = conversationHistory ?? [];
  const contents: { role: string; parts: { text: string }[] }[] = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  // 현재 질문 + 기록 컨텍스트 추가
  contents.push({
    role: 'user',
    parts: [{ text: `<user_query>\n${query}\n</user_query>\n\n<record_count>${recordCount}건 분석</record_count>\n\n<context>\n${context}\n</context>` }],
  });

  try {
    const response = await fetch(
      `${workerUrl}/ai?model=gemini-2.5-flash-lite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Secret': workerSecret,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SEARCH_SYSTEM_PROMPT }],
          },
          contents,
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      return '답변 생성 중 오류가 발생했어요.';
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '답변을 생성하지 못했어요.';
  } catch {
    return '답변 생성 중 오류가 발생했어요.';
  }
}
