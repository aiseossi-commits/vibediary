import type { AIProcessingResult } from '../types/record';
import { getNetworkState } from '../utils/network';

function buildSystemPrompt(extraTags: string[]): string {
  const customTagSection = extraTags.length > 0
    ? `\n커스텀 태그 (사용자 정의, 기본 태그와 함께 추가 적용 가능):\n${extraTags.map(t => `- ${t}: 기록 내용이 이 태그 이름과 명확히 관련되면 추가로 부여. 기본 태그를 대체하지 않음`).join('\n')}\n`
    : '';

  return `당신은 발달장애인 돌봄 가족의 음성 기록을 정제하는 AI 비서입니다.
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
   - 문체는 반드시 **~함/~음 체**로 고정 (예: "약 복용함.", "발작 2회 있었음.", "기분 좋아 보였음.")
2. tags: 아래 기준에 따라 해당하는 태그를 배열로 반환. 기준에 맞는 태그만 선택하고, 해당 없으면 빈 배열.

기본 태그 및 적용 기준:
- #발달: 언어, 운동, 인지, 사회성 등 발달 영역 관찰 또는 성장 이정표 (예: 첫 발화, 새로운 기술 습득)
- #행동: 텐트럼, 거부, 자해, 공격, 상동행동 등 도전적 행동이 포함된 경우
- #치료: 언어치료, 작업치료, ABA 등 치료 세션 기록
- #의료: 투약, 병원 방문, 처치 등 의료 행위 (단순 체온 관찰·신체 증상만 있으면 해당 안 됨)
- #투약: 약 복용 기록 (의약품명 또는 용량이 포함된 경우)
- #일상: 위에 해당하지 않는 일상 케어 (식사, 수면, 외출 등)
${customTagSection}
3. structured_data: 아래 지침에 따라 구조화 가능한 데이터를 추출. 없으면 빈 객체.
   ※ event_type은 structured_data 추출 전략이며 태그 선택과 독립적으로 결정됨.
   a. event_type 분류 (반드시 포함):
      - "behavioral_incident": 문제 행동(텐트럼, 거부, 자해, 공격 등)이 포함된 경우
      - "medical": 체온, 투약, 발작 등 의료 관련 기록
      - "developmental": 언어, 사회성, 인지, 운동 등 발달 영역 관찰
      - "daily": 위 유형에 해당하지 않는 일상 기록
   b. event_type이 "behavioral_incident"이면:
      - antecedent: 행동을 유발한 선행 사건/상황 (A)
      - behavior: 아이가 보인 구체적 행동 (B)
      - consequence: 결과 또는 보호자 반응 (C)
      - ABC를 명확히 구분하기 어려우면 해당 필드는 생략 (빈 문자열 사용 금지)
   c. event_type이 "developmental"이면:
      - domain: 관찰된 발달 영역 (예: "언어", "사회성", "인지", "운동", "자조")
   d. event_type이 "medical"이면:
      - 체온, 약물명, 용량, 횟수, 시간 등 수치 데이터 추출

JSON 응답 예시 (behavioral_incident):
{"summary": "마트에서 과자 사달라는 요구 거절 후 드러누워 울었음.", "tags": ["#행동"], "structured_data": {"event_type": "behavioral_incident", "antecedent": "마트에서 과자 구매 거절", "behavior": "드러누워 울기", "consequence": "그냥 지나침"}}

JSON 응답 예시 (developmental):
{"summary": "오늘 처음으로 '엄마' 발화함.", "tags": ["#발달"], "structured_data": {"event_type": "developmental", "domain": "언어"}}

JSON 응답 예시 (medical):
{"summary": "저녁 체온 38.2도, 해열제 복용함.", "tags": ["#의료", "#투약"], "structured_data": {"event_type": "medical", "temperature": 38.2, "medication": "해열제"}}

반드시 유효한 JSON만 응답하세요. 다른 텍스트는 포함하지 마세요.`;
}

const USER_PROMPT_TEMPLATE = `다음 음성 기록을 정제해주세요:
<user_input>
{text}
</user_input>

위 발화 내용을 압축하지 말고 정제하여 JSON으로 응답:
{"summary": "", "tags": [], "structured_data": {}}`;

// Gemini API 호출
async function callGeminiAPI(text: string, extraTags: string[] = []): Promise<AIProcessingResult> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    throw new Error('Worker URL 또는 Secret이 설정되지 않았습니다');
  }

  const userMessage = USER_PROMPT_TEMPLATE.replace('{text}', text);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  let response: Response;
  try {
    response = await fetch(
      `${workerUrl}/ai?model=gemini-2.5-flash-lite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Secret': workerSecret,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(extraTags) }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userMessage }],
            },
          ],
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
          generationConfig: {
            maxOutputTokens: 700,
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI] Gemini 오류 ${response.status}:`, errorText.substring(0, 300));
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

    const rawStructured = parsed.structured_data || {};
    const validEventTypes = ['behavioral_incident', 'medical', 'developmental', 'daily'];
    // 빈 문자열 필드 제거 + 유효하지 않은 event_type 제거
    const structuredData: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(rawStructured)) {
      if (v === '' || v === null || v === undefined) continue;
      if (k === 'event_type' && !validEventTypes.includes(String(v))) continue;
      structuredData[k] = v as string | number;
    }

    return {
      summary: parsed.summary || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      structuredData,
    };
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다');
  }
}

// 텍스트 처리 메인 함수
export async function processWithAI(text: string, extraTags: string[] = []): Promise<AIProcessingResult> {
  const isOnline = await getNetworkState();

  if (!isOnline) {
    throw new Error('OFFLINE');
  }

  return callGeminiAPI(text, extraTags);
}

// 오프라인 fallback: 원문을 그대로 사용
export function createFallbackResult(text: string): AIProcessingResult {
  return {
    summary: text.length > 100 ? text.substring(0, 100) + '...' : text,
    tags: ['#일상'],
    structuredData: {},
  };
}

// Deno Deploy warm 핑 (cold start 방지)
let lastPingAt = 0;
const PING_INTERVAL = 4 * 60 * 1000; // 4분

export async function warmDeno(): Promise<void> {
  if (Date.now() - lastPingAt < PING_INTERVAL) return;
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`${workerUrl}/health`, {
      headers: { 'X-App-Secret': workerSecret },
      signal: controller.signal,
    });
    lastPingAt = Date.now();
  } catch {
    // 핑 실패는 무시
  } finally {
    clearTimeout(timeoutId);
  }
}
