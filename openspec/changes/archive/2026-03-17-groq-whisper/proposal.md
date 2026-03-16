## Why

현재 STT에 OpenAI Whisper를 사용하고 있어 10,000명 × 20회/일 기준 월 약 1,305만원의 비용이 발생한다. Groq Whisper Large v3 Turbo로 교체하면 동일한 모델 품질로 월 약 145만원(9배 절감)이 가능하다.

## What Changes

- Deno Worker(`cloudflare-worker/deno-main.ts`)의 STT 엔드포인트를 OpenAI API에서 Groq API로 교체
- Groq API는 OpenAI 호환 엔드포인트 제공 → 앱 클라이언트 코드 변경 없음
- 모델: `whisper-1` → `whisper-large-v3-turbo` (Groq 모델명)
- Worker의 ALLOWED_MODELS 및 STT 처리 함수 수정
- Deno 환경변수에 `GROQ_API_KEY` 추가 필요

## Capabilities

### New Capabilities
- `groq-stt-proxy`: Deno Worker에서 Groq Whisper API를 통해 STT를 처리하는 프록시 엔드포인트

### Modified Capabilities
- 없음 (앱 클라이언트 코드는 변경되지 않음)

## Impact

- `cloudflare-worker/deno-main.ts`: STT 처리 함수 교체
- Deno Deploy 환경변수: `GROQ_API_KEY` 추가 필요
- STT 품질: Whisper Large v3 Turbo는 Large v3 경량화 버전으로 짧은 한국어 발화(30초 이내)에서 품질 차이 미미
- 비용: 월 1,305만원 → 145만원 (약 1,160만원 절감)
