import { detectTagsFromQuery, vectorSearch, getTagIdsByNames } from './vectorSearch';
import { getRecordById } from '../db/recordsDao';
import { getNetworkState } from '../utils/network';
import type { SearchResult, RecordWithTags } from '../types/record';

// 검색 답변 생성 시스템 프롬프트
const SEARCH_SYSTEM_PROMPT = `당신은 발달장애인 돌봄 기록을 검색해 답변하는 AI 비서입니다.
사용자의 질문에 대해 제공된 기록들을 근거로 답변하세요.

규칙:
1. 기록에 있는 사실만 답변하세요
2. 답변은 따뜻하고 간결하게 작성하세요
3. 관련 기록의 날짜를 언급하세요
4. 기록에 없는 내용은 추측하지 마세요`;

// 3단계 검색 파이프라인
export async function searchRecords(
  query: string,
  queryEmbedding: number[] | null,
  filterTagNames?: string[]
): Promise<SearchResult> {
  // 1단계: 태그 자동 감지 (사용자 필터 + 자동 감지)
  const autoDetectedTags = detectTagsFromQuery(query);
  const allFilterTags = [...new Set([...(filterTagNames || []), ...autoDetectedTags])];
  const filterTagIds = allFilterTags.length > 0 ? await getTagIdsByNames(allFilterTags) : undefined;

  // 2단계: 벡터 유사도 검색 (임베딩이 있을 때)
  let topRecordIds: string[] = [];

  if (queryEmbedding) {
    const vectorResults = await vectorSearch(queryEmbedding, 5, filterTagIds);
    topRecordIds = vectorResults.map((r) => r.id);
  }

  // 임베딩이 없으면 태그 필터링된 최근 기록 사용
  if (topRecordIds.length === 0) {
    const { getRecordsByTags } = await import('../db/queries');
    const { getAllRecords } = await import('../db/recordsDao');
    let fallbackRecords: RecordWithTags[];

    if (filterTagIds && filterTagIds.length > 0) {
      fallbackRecords = await getRecordsByTags(filterTagIds, 5);
    } else {
      fallbackRecords = await getAllRecords(5);
    }

    topRecordIds = fallbackRecords.map((r) => r.id);
  }

  // 전체 기록 데이터 로드
  const sourceRecords: RecordWithTags[] = [];
  for (const id of topRecordIds) {
    const record = await getRecordById(id);
    if (record) sourceRecords.push(record);
  }

  if (sourceRecords.length === 0) {
    return {
      answer: '관련 기록을 찾지 못했어요.',
      sourceRecords: [],
    };
  }

  // 3단계: LLM 답변 생성
  const isOnline = await getNetworkState();
  if (!isOnline) {
    // 오프라인: 기록만 반환 (LLM 답변 없이)
    return {
      answer: '오프라인 상태에서는 관련 기록만 보여드려요.',
      sourceRecords,
    };
  }

  const answer = await generateAnswer(query, sourceRecords);

  return {
    answer,
    sourceRecords,
  };
}

// LLM 답변 생성 (Gemini 2.5 Flash Lite)
async function generateAnswer(query: string, records: RecordWithTags[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return '기록을 찾았지만 AI 답변을 생성할 수 없습니다.';
  }

  // 컨텍스트 구성 (토큰 절약: summary + structured_data만)
  const context = records
    .map((r) => {
      const date = new Date(r.createdAt).toLocaleDateString('ko-KR');
      const tags = r.tags.map((t) => t.name).join(' ');
      const data = r.structuredData
        ? Object.entries(r.structuredData)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        : '';
      return `[${date}] ${tags} ${r.summary}${data ? ` (${data})` : ''}`;
    })
    .join('\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SEARCH_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: `질문: ${query}\n\n관련 기록:\n${context}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 300,
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
