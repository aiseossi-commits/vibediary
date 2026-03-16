// v6: Groq Whisper STT 교체
const ALLOWED_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'whisper-1', 'text-embedding-004'];
const MAX_STT_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_AI_BODY_LENGTH = 100000; // 100KB

// Rate limiting: IP당 분당 최대 요청 수
const RATE_LIMIT_PER_MINUTE = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (request.method === 'POST' && url.pathname === '/stt') {
    return handleSTT(request);
  }

  if (request.method === 'POST' && url.pathname === '/ai') {
    return handleAI(request, url);
  }

  if (request.method === 'POST' && url.pathname === '/embedding') {
    return handleEmbedding(request);
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

  const groqKey = Deno.env.get('GROQ_API_KEY');

  const upstreamResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body: formData,
  });

  const body = await upstreamResponse.text();
  return new Response(body, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleEmbedding(request: Request) {
  const body = await request.text();
  if (body.length > MAX_AI_BODY_LENGTH) {
    return new Response('Request body too large', { status: 413 });
  }

  const googleKey = Deno.env.get('GOOGLE_AI_API_KEY');
  const upstreamResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${googleKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }
  );

  const responseBody = await upstreamResponse.text();
  return new Response(responseBody, {
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
  return new Response(responseBody, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
