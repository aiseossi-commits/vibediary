export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-App-Secret',
        },
      });
    }

    // Secret 검증
    const secret = request.headers.get('X-App-Secret');
    if (!secret || secret !== env.APP_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/stt') {
      return handleSTT(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/ai') {
      return handleAI(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleSTT(request, env) {
  const formData = await request.formData();

  const upstreamResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
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

async function handleAI(request, env) {
  const body = await request.text();
  const url = new URL(request.url);
  // 모델 경로를 쿼리 파라미터로 받거나 고정값 사용
  const model = url.searchParams.get('model') || 'gemini-2.5-flash-lite';

  const upstreamResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
