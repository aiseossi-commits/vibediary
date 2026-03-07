import type { AIProcessingResult } from '../types/record';
import { getNetworkState } from '../utils/network';

// AI 처리를 위한 시스템 프롬프트 (고정)
const SYSTEM_PROMPT = `당신은 발달장애인 돌봄 가족의 음성 기록을 정리하는 AI 비서입니다.
사용자가 음성으로 남긴 기록을 분석하여 아래 JSON 형식으로 응답하세요.

규칙:
1. summary: 핵심 내용을 1-2문장으로 요약 (따뜻하고 간결한 톤)
2. tags: 해당하는 태그를 배열로 반환. 가능한 태그: #의료, #투약, #행동, #일상, #치료
3. structured_data: 체온, 약물명, 용량, 횟수, 시간 등 구조화 가능한 데이터 추출
4. mood: 기록의 전반적 분위기 (positive, neutral, negative, urgent)

반드시 유효한 JSON만 응답하세요. 다른 텍스트는 포함하지 마세요.`;

const USER_PROMPT_TEMPLATE = `다음 음성 기록을 분석해주세요:

<user_input>
{text}
</user_input>

JSON 형식으로 응답:
{"summary": "", "tags": [], "structured_data": {}, "mood": ""}`;

// Gemini API 호출
async function callGeminiAPI(text: string): Promise<AIProcessingResult> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    throw new Error('Worker URL 또는 Secret이 설정되지 않았습니다');
  }

  const userMessage = USER_PROMPT_TEMPLATE.replace('{text}', text);

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
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 오류 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('AI 응답이 비어있습니다');
  }

  return parseAIResponse(content);
}

// AI 응답 JSON 파싱
function parseAIResponse(content: string): AIProcessingResult {
  try {
    // 마크다운 코드블록 제거 (Gemini Flash Lite 간헐적 래핑 대응)
    const cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON을 찾을 수 없습니다');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary: parsed.summary || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      structuredData: parsed.structured_data || {},
      mood: parsed.mood || 'neutral',
    };
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다');
  }
}

// 텍스트 처리 메인 함수
export async function processWithAI(text: string): Promise<AIProcessingResult> {
  const isOnline = await getNetworkState();

  if (!isOnline) {
    throw new Error('OFFLINE');
  }

  return callGeminiAPI(text);
}

// 일별 기록 분석 (이성 요약 + 감성 위로)
export async function analyzeDailySummary(
  summaries: string[],
  tags: string[]
): Promise<{ rational: string; emotional: string }> {
  const isOnline = await getNetworkState();
  if (!isOnline) throw new Error('OFFLINE');

  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) throw new Error('Worker URL 또는 Secret이 설정되지 않았습니다');

  const context = summaries.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const tagStr = [...new Set(tags)].join(', ');

  const response = await fetch(`${workerUrl}/ai?model=gemini-2.5-flash-lite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: '당신은 발달장애인 돌봄 가족을 위한 AI 비서입니다. 하루 기록을 분석하여 JSON으로 응답하세요.' }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: `오늘의 돌봄 기록 (태그: ${tagStr}):\n${context}\n\nJSON으로 응답:\n{"rational": "오늘의 객관적 요약 (의료/투약/행동 데이터 중심, 2-3문장)", "emotional": "따뜻한 위로와 응원 메시지 (1-2문장)"}` }],
      }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.4, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) throw new Error(`AI 오류: ${response.status}`);
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
  return {
    rational: parsed.rational || '오늘의 기록을 분석했어요.',
    emotional: parsed.emotional || '오늘도 수고하셨어요.',
  };
}

// 오프라인 fallback: 원문을 그대로 사용
export function createFallbackResult(text: string): AIProcessingResult {
  return {
    summary: text.length > 100 ? text.substring(0, 100) + '...' : text,
    tags: ['#일상'], // 기본 태그
    structuredData: {},
    mood: 'neutral',
  };
}
