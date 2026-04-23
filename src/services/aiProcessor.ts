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
   - 작성 순서: 먼저 발화에서 고유명사(음식·장소·약품·증상·사람)를 파악한 뒤, 그것을 모두 포함하는 문장을 작성
   - 완성된 summary만 읽어도 원본 발화의 핵심 상황을 재현할 수 있어야 함
   - "음", "그니까", "있잖아", "뭐" 같은 필러(filler) 단어만 제거
   - "자꾸", "항상", "가끔", "계속" 같은 빈도·강도 표현은 반드시 유지
   - "해가지고", "그래서", "때문에" 같은 인과관계 표현은 반드시 유지
   - 보호자의 추측·가설("~때문인지 모르겠는데", "~한 것 같아요")은 "~인지 불확실" 또는 "~한 듯" 형태로 유지
   - 누가 무엇을 했는지 행위 주체와 행동을 바꾸지 말 것
   - 의미 변질 없이 최소한의 문법 교정만 허용
   - 문체는 반드시 **~함/~음 체**로 고정 (예: "약 복용함.", "발작 2회 있었음.", "기분 좋아 보였음.")
2. tags: 아래 기준에 따라 해당하는 태그를 배열로 반환. 기준에 맞는 태그만 선택하고, 해당 없으면 빈 배열.

기본 태그 및 적용 기준:
※ 상위 태그와 해당 하위 태그를 항상 함께 부여할 것. 예: 물리치료 → ["#치료", "#물리치료"]

[치료 계열 — 전문가·치료사와 함께하는 세션]
- #치료: 하위 치료 태그가 하나라도 붙을 때 반드시 함께 부여
- #언어치료: 언어치료, 언치, 언어치료실, 말치료
- #작업치료: 작업치료, 작치, OT
- #감각통합치료: 감각통합, 감통, SI치료, 그네치료
- #ABA치료: ABA, 응용행동분석, DTT, VB
- #놀이치료: 놀이치료, 놀치, 플로어타임, PCIT
- #물리치료: 물리치료, PT, 물치
- #뇌파치료: MERT, PBM, 뇌파치료
- #한의학: 한의원, 침치료, 한약, 추나

[투약 계열 — 보호자가 먹이거나 적용하는 것]
- #투약: 하위 투약 태그가 붙을 때 반드시 함께 부여. 의약품명·용량 언급만 있어도 단독 부여 가능
- #처방약: 처방, 처방전, 병원에서 받은 약
- #보충제: 마그네슘, 비타민C, 아연, L-카르니틴, 오메가3, 유산균, 프로바이오틱스
- #동종요법: 동종요법, 레메디, 호메오파시, 포텐시
- #패치: 패치, 사각패치, 동전패치, 라이프웨이브

[신체/증상 계열]
- #의료: 병원 방문, 처방, 발작, 수술, 처치 등 의료 행위. 증상 관찰만으로는 해당 안 됨
- #배변: 배변, 배변훈련, 똥, 응가, 설사, 무른변, 변비, 소변, 지림, 빈뇨
- #수면: 잠, 입면, 낮잠, 밤잠, 새벽에 깸, 악몽, 이갈이
- #감각: 감각추구, 전정감각, 고유수용감각, 구강추구, 소리과민, 촉각회피
- #각성: 고각성, 저각성, 늘어짐, 업됨, 들뜸, 하이, 처짐
- #건강: 감기, 중이염, 열, 콧물, 기침, 장염 등 질병·신체 증상 (의료 행위 없는 경우)

[행동/정서 계열]
- #행동: 하위 행동 태그가 붙을 때 반드시 함께 부여
- #기분: 텐트럼, 멜트다운, 울음, 화남, 기분 좋음
- #상동행동: 손 흔들기, 빙빙 돌기, 반복 발화, 에코랄리아
- #자해: 머리 박기, 자해, 물기, 할퀴기
- #공격행동: 때리기, 밀치기, 꼬집기

[기타]
- #발달: 언어, 운동, 인지, 사회성 발달 관찰, 이정표
- #검사: ATEC, CARS, K-WISC, 언어검사, 지능검사, 윕시, 웩슬러
- #상담: 전문가·교육기관 상담, 면담
- #교육기관: 어린이집, 유치원, 학교, 특수학교, 통합반
- #식단: 식이요법, GFCF, 갭스, 저포드맵, 글루텐, 카제인
- #일상: 위 태그에 해당하지 않는 일반 일상 케어
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
      - ontology_code: 발달 영역 코드 (아래 중 가장 가까운 것 하나 선택)
        GROSS(대근육), FINE(소근육), LANG_R(수용언어), LANG_E(표현언어), COGN(인지), SOCIAL(사회성), DAILY(일상생활), SENSORY(감각처리)
      - is_milestone: 기록에 "처음", "첫", "드디어", "오늘 해냈", "새로", "성공" 등 이정표 표현이 있으면 true. 없으면 이 필드를 포함하지 않음.
   d. event_type이 "medical"이면:
      - 체온, 약물명, 용량, 횟수, 시간 등 수치 데이터 추출
   e. 평가·검사 점수가 포함된 경우 (event_type에 관계없이):
      - ATEC: ATEC_total(총점), ATEC_language(언어), ATEC_social(사회성), ATEC_sensory(감각/인지), ATEC_motor(건강/신체), assessment_date(검사일, YYYY-MM-DD)
      - CARS: CARS_total(총점), assessment_date
      - K-WISC, 언어발달검사 등: score(총점 또는 대표점수), test_name(검사명), assessment_date
      - **반드시 평면(flat) 구조로 추출. 중첩 객체 사용 금지.**

JSON 응답 예시 (behavioral_incident):
{"summary": "마트에서 과자 사달라는 요구 거절 후 드러누워 울었음.", "tags": ["#행동"], "structured_data": {"event_type": "behavioral_incident", "antecedent": "마트에서 과자 구매 거절", "behavior": "드러누워 울기", "consequence": "그냥 지나침"}}

JSON 응답 예시 (developmental):
{"summary": "오늘 처음으로 '엄마' 발화함.", "tags": ["#발달"], "structured_data": {"event_type": "developmental", "domain": "언어"}}

JSON 응답 예시 (medical):
{"summary": "저녁 체온 38.2도, 해열제 복용함.", "tags": ["#의료", "#투약", "#처방약"], "structured_data": {"event_type": "medical", "temperature": 38.2, "medication": "해열제"}}

JSON 응답 예시 (치료 세션):
{"summary": "오늘 언어치료 세션에서 두 단어 조합 연습함.", "tags": ["#치료", "#언어치료"], "structured_data": {"event_type": "daily"}}

JSON 응답 예시 (보충제):
{"summary": "아침에 마그네슘 200mg, 비타민C 복용함.", "tags": ["#투약", "#보충제"], "structured_data": {"event_type": "medical", "medication": "마그네슘 200mg, 비타민C"}}

JSON 응답 예시 (장소·음식·인과 가설 포함):
{"summary": "저녁에 장어 먹은 후 차 안에서 트림을 계속함. 장어 때문인지 불확실.", "tags": ["#건강"], "structured_data": {"event_type": "daily"}}

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
    // 빈 문자열·null·undefined 제거, 중첩 객체는 flat하게 전개, 유효하지 않은 event_type 제거
    const structuredData: Record<string, string | number | boolean> = {};
    function flattenInto(obj: Record<string, unknown>, prefix = '') {
      for (const [k, v] of Object.entries(obj)) {
        if (v === '' || v === null || v === undefined) continue;
        const key = prefix ? `${prefix}_${k}` : k;
        if (k === 'event_type' && !prefix && !validEventTypes.includes(String(v))) continue;
        if (typeof v === 'object' && !Array.isArray(v)) {
          flattenInto(v as Record<string, unknown>, key);
        } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          structuredData[key] = v;
        } else if (Array.isArray(v)) {
          structuredData[key] = v.join(', ');
        }
      }
    }
    flattenInto(rawStructured);

    return {
      summary: parsed.summary || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      structuredData,
    };
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다');
  }
}

// 태그만 추출 (재태깅 전용 — 경량 프롬프트)
function buildTagsOnlyPrompt(extraTags: string[]): string {
  const customTagSection = extraTags.length > 0
    ? `\n커스텀 태그 (사용자 정의):\n${extraTags.map(t => `- ${t}`).join('\n')}\n`
    : '';

  return `발달장애인 돌봄 기록에서 해당하는 태그만 골라 JSON 배열로 반환하세요.
태그가 없으면 빈 배열 반환. 다른 텍스트 없이 JSON만 응답.

※ 상위+하위 태그 항상 함께: 예) 물리치료 → ["#치료","#물리치료"]

[치료] #치료 / #언어치료 #작업치료 #감각통합치료 #ABA치료 #놀이치료 #물리치료 #뇌파치료 #한의학
[투약] #투약 / #처방약 #보충제 #동종요법 #패치
[신체] #의료 #배변 #수면 #감각 #각성 #건강
[행동] #행동 / #기분 #상동행동 #자해 #공격행동
[기타] #발달 #검사 #상담 #교육기관 #식단 #일상
${customTagSection}
응답 형식: {"tags": ["#태그1", "#태그2"]}`;
}

export async function getTagsOnly(text: string, extraTags: string[] = []): Promise<string[]> {
  const isOnline = await getNetworkState();
  if (!isOnline) throw new Error('OFFLINE');

  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) throw new Error('Worker URL 또는 Secret이 설정되지 않았습니다');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(
      `${workerUrl}/ai?model=gemini-2.5-flash-lite`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildTagsOnlyPrompt(extraTags) }] },
          contents: [{ role: 'user', parts: [{ text: `<user_input>\n${text}\n</user_input>` }] }],
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
          generationConfig: { maxOutputTokens: 150, temperature: 0.1, responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) throw new Error(`Gemini API 오류 (${response.status})`);

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return [];

  try {
    const cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed.tags) ? parsed.tags : [];
  } catch {
    return [];
  }
}

// AI 입력 모드: 날짜별 기록 분리
export type ParsedEntry = {
  date: string;
  time?: string;
  text: string;
  childName?: string;
  eventHint?: string;
};

export async function parseMultiEntries(
  transcript: string,
  today: string,
  todayWeekday: string,
  childrenNames?: string[]
): Promise<ParsedEntry[]> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) throw new Error('NO_WORKER');

  const childNameSection = childrenNames && childrenNames.length > 0
    ? `\n아이 이름 인식:\n가능한 이름: ${childrenNames.join(', ')}\n발화에 이름이 포함되면 해당 항목에 "childName" 추가. 없으면 생략.\n`
    : '';

  const systemPrompt = `오늘: ${today} (${todayWeekday})
음성 기록에서 항목별 JSON 배열로 추출하세요.

날짜 규칙:
1. 날짜 명시 시 해당 날짜. 연도 생략 시 오늘 기준 가장 최근 해당 날짜.
2. 날짜 없으면 오늘(${today}) 사용.
3. 요일 표현("월요일에", "이번주 월수금"): 오늘 기준 가장 최근 해당 요일로 계산. 복수 요일은 각각 별도 항목.
4. 범위 표현("이번주 내내", "월~금"): 해당 기간 각 날짜를 별도 항목으로 생성.
5. 미래 날짜 생성 금지 — 오늘(${today}) 이후 날짜는 지난 주 동일 날짜 사용.
6. text에는 날짜·시간 표현 제거 후 핵심 내용만 유지.

시간 규칙:
- "아침 7시", "오전 7시" → "07:00", "오후 3시" → "15:00", "밤 10시" → "22:00", "새벽 2시" → "02:00"
- 시간 표현이 없으면 time 필드 생략.
${childNameSection}
이벤트 감지:
발열/고열, 발작/경련, 수면 문제(못 잠/불면), 공격행동 시작이 감지되면 "eventHint" 추가 (예: "발열", "발작", "수면문제", "공격행동").
치료 방문·투약·병원 방문은 eventHint 없음.

반드시 이 형식만 반환 (다른 설명 없이, time·childName·eventHint는 해당 시만 포함):
[{"date":"YYYY-MM-DD","text":"..."}]`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(
      `${workerUrl}/ai?model=gemini-2.5-flash-lite`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: `<user_input>\n${transcript}\n</user_input>` }] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.1, responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) throw new Error(`API 오류 (${response.status})`);
  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('PARSE_ERROR');
  const entries: ParsedEntry[] = JSON.parse(match[0]);
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('EMPTY');
  return entries;
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
