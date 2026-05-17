// v6.5: /stats 엔드포인트 추가 (일별 API 호출 카운터)
const ALLOWED_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'whisper-1'];
const MAX_STT_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_AI_BODY_LENGTH = 100000; // 100KB

// Rate limiting: IP당 분당 최대 요청 수
const RATE_LIMIT_PER_MINUTE = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Deno KV 일별 API 호출 카운터
const kv = await Deno.openKv();

function todayKST(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().split('T')[0];
}

async function incrementStat(endpoint: 'stt' | 'ai'): Promise<void> {
  const key = ['stats', todayKST(), endpoint];
  const current = await kv.get<number>(key);
  await kv.set(key, (current.value ?? 0) + 1, { expireIn: 30 * 24 * 3600_000 }); // 30일 보존
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  if (entry.count >= RATE_LIMIT_PER_MINUTE) {
    return true;
  }

  entry.count++;
  return false;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-App-Secret',
      },
    });
  }

  const secret = request.headers.get('X-App-Secret');
  const appSecret = Deno.env.get('APP_SECRET');
  if (!secret || secret !== appSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(ip)) {
    return new Response('Too Many Requests', { status: 429 });
  }

  const url = new URL(request.url);

  if (url.pathname === '/health') {
    return new Response('ok', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  if (request.method === 'GET' && url.pathname === '/version') {
    return new Response(JSON.stringify({
      ios: '1.0.4',
      android: '1.0.4',
      force: false,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (request.method === 'POST' && url.pathname === '/stt') {
    return handleSTT(request);
  }

  if (request.method === 'POST' && url.pathname === '/ai') {
    return handleAI(request, url);
  }

  if (request.method === 'GET' && url.pathname === '/stats') {
    return handleStats();
  }

  if (url.pathname === '/embedding') {
    return new Response('Gone', { status: 410 });
  }

  return new Response('Not Found', { status: 404 });
});

async function handleSTT(request: Request) {
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_STT_SIZE) {
    return new Response('File too large', { status: 413 });
  }

  const formData = await request.formData();
  const model = formData.get('model');
  if (model && model !== 'whisper-1') {
    return new Response('Invalid STT model', { status: 400 });
  }

  // 클라이언트의 whisper-1 요청을 Groq 모델명으로 변환
  formData.set('model', 'whisper-large-v3-turbo');
  formData.set('temperature', '0');

  const groqKey = Deno.env.get('GROQ_API_KEY');

  const upstreamResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body: formData,
  });

  const body = await upstreamResponse.text();
  if (upstreamResponse.ok) {
    incrementStat('stt').catch(() => {});
  }
  return new Response(body, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleAI(request: Request, url: URL) {
  const body = await request.text();
  if (body.length > MAX_AI_BODY_LENGTH) {
    return new Response('Request body too large', { status: 413 });
  }

  const model = url.searchParams.get('model') || 'gemini-2.5-flash-lite';
  if (!ALLOWED_MODELS.includes(model)) {
    return new Response('Invalid model', { status: 400 });
  }

  const googleKey = Deno.env.get('GOOGLE_AI_API_KEY');

  const upstreamResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }
  );

  const responseBody = await upstreamResponse.text();
  if (upstreamResponse.ok) {
    incrementStat('ai').catch(() => {});
  }
  return new Response(responseBody, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleStats(): Promise<Response> {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(Date.now() + 9 * 3600_000 - i * 86400_000).toISOString().split('T')[0]);
  }

  const result: Record<string, { stt: number; ai: number }> = {};
  for (const day of days) {
    const [sttRes, aiRes] = await Promise.all([
      kv.get<number>(['stats', day, 'stt']),
      kv.get<number>(['stats', day, 'ai']),
    ]);
    result[day] = { stt: sttRes.value ?? 0, ai: aiRes.value ?? 0 };
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
