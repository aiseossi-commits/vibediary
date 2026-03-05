const ALLOWED_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'whisper-1'];
const MAX_STT_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_AI_BODY_LENGTH = 100000; // 100KB

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

  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/stt') {
    return handleSTT(request);
  }

  if (request.method === 'POST' && url.pathname === '/ai') {
    return handleAI(request, url);
  }

  return new Response('Not Found', { status: 404 });
});

async function handleSTT(request: Request) {
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_STT_SIZE) {
    return new Response('File too large', { status: 413 });
  }

  const formData = await request.formData();
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  const upstreamResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
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
