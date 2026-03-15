import type { AIProcessingResult } from '../types/record';
import { getNetworkState } from '../utils/network';

// AI 처리를 위한 시스템 프롬프트 (고정)
const SYSTEM_PROMPT = `당신은 발달장애인 돌봄 가족의 음성 기록을 정제하는 AI 비서입니다.
사용자가 음성으로 남긴 기록을 분석하여 아래 JSON 형식으로 응답하세요.

핵심 원칙:
- <user_input>의 내용을 압축하거나 재해석하지 마세요.
- 발화에 없는 내용을 추가하거나 창작하지 마세요.
- 말의 내용과 맥락을 그대로 유지하면서, 읽기 좋은 문어체로 다듬는 것이 목표입니다.

규칙:
1. summary: 발화 내용을 정제한 문장. 아래 지침을 반드시 따르세요:
   - "음", "그니까", "있잖아", "뭐" 같은 필러(filler) 단어만 제거
   - "자꾸", "항상", "가끔", "계속" 같은 빈도·강도 표현은 반드시 유지
   - "해가지고", "그래서", "때문에" 같은 인과관계 표현은 반드시 유지
   - 누가 무엇을 했는지 행위 주체와 행동을 바꾸지 말 것
   - 의미 변질 없이 최소한의 문법 교정만 허용
2. tags: 해당하는 태그를 배열로 반환. 가능한 태그: #의료, #투약, #행동, #일상, #치료. 관련 없으면 빈 배열.
3. structured_data: 체온, 약물명, 용량, 횟수, 시간 등 구조화 가능한 데이터만 추출. 없으면 빈 객체.

반드시 유효한 JSON만 응답하세요. 다른 텍스트는 포함하지 마세요.`;

const USER_PROMPT_TEMPLATE = `다음 음성 기록을 정제해주세요:
{subjectLine}
<user_input>
{text}
</user_input>

위 발화 내용을 압축하지 말고 정제하여 JSON으로 응답:
{"summary": "", "tags": [], "structured_data": {}}`;

// Gemini API 호출
async function callGeminiAPI(text: string): Promise<AIProcessingResult> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    throw new Error('Worker URL 또는 Secret이 설정되지 않았습니다');
  }

  const userMessage = USER_PROMPT_TEMPLATE.replace('{subjectLine}', '').replace('{text}', text);

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
  tags: string[],
  date: string // 'YYYY-MM-DD'
): Promise<{ rational: string; emotional: string }> {
  const isOnline = await getNetworkState();
  if (!isOnline) throw new Error('OFFLINE');

  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) throw new Error('Worker URL 또는 Secret이 설정되지 않았습니다');

  const context = summaries.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const tagStr = [...new Set(tags)].join(', ');

  const d = new Date(date + 'T00:00:00');
  const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
  const dateLabel = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]}요일)`;

  const response = await fetch(`${workerUrl}/ai?model=gemini-2.5-flash-lite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: `당신은 발달장애인 돌봄 가족을 위한 AI 비서입니다. 하루 기록을 분석하여 JSON으로 응답하세요.\n\n중요: 각 기록 앞의 [HH:mm]은 내용이 발생한 시각이 아니라 기록자가 입력한 시각입니다. 기록 내용에 '어제', '아까', '지난밤' 같은 상대적 시간 표현이 있으면 분석 날짜를 기준으로 해석하세요.` }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: `분석 날짜: ${dateLabel}\n돌봄 기록 (태그: ${tagStr}):\n${context}\n\nJSON으로 응답:\n{"rational": "이 날 하루를 한 문장으로 핵심만 요약. 사실 나열 금지, 전체적인 흐름이나 특이사항을 자연스러운 문장으로.", "emotional": "따뜻한 위로와 응원 메시지 (1-2문장)"}` }],
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

// 텍스트 임베딩 생성 (text-embedding-004, 768차원)
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${workerUrl}/embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const values: number[] | undefined = data.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch {
    return null;
  }
}

// 오프라인 fallback: 원문을 그대로 사용
export function createFallbackResult(text: string): AIProcessingResult {
  return {
    summary: text.length > 100 ? text.substring(0, 100) + '...' : text,
    tags: ['#일상'],
    structuredData: {},
  };
}
