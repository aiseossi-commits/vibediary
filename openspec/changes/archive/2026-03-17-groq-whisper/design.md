## Context

현재 Deno Worker(`cloudflare-worker/deno-main.ts`)의 `/stt` 엔드포인트는 OpenAI Whisper API를 호출한다. Groq는 동일한 Whisper 모델을 OpenAI 호환 API로 제공하므로, Worker에서 API 엔드포인트 URL과 인증 키만 교체하면 앱 클라이언트 코드 변경 없이 전환 가능하다.

## Goals / Non-Goals

**Goals:**
- Deno Worker STT 엔드포인트를 Groq Whisper Large v3 Turbo로 교체
- 앱 클라이언트(`stt.ts`) 코드 변경 없음
- STT 품질 유지 (한국어 30초 이내 발화)

**Non-Goals:**
- iOS 네이티브 STT 변경 (이미 무료)
- Android 네이티브 STT 추가
- 모델 파라미터 튜닝

## Decisions

**1. Groq Whisper Large v3 Turbo 선택**
- Large v3 vs Turbo: Turbo는 Large v3의 경량화 버전으로 속도↑ 비용↓
- 30초 이내 짧은 한국어 발화에서 품질 차이 미미
- 가격: $0.04/시간 (OpenAI $0.006/분 대비 9배 저렴)

**2. Worker 내 모델명 하드코딩**
- 클라이언트에서 `model=whisper-1`로 요청 → Worker에서 Groq 모델명(`whisper-large-v3-turbo`)으로 내부 변환
- 이유: 앱 클라이언트 코드 수정 없이 투명하게 교체 가능, 향후 모델 변경 시 Worker만 수정

**3. Groq API 엔드포인트**
- URL: `https://api.groq.com/openai/v1/audio/transcriptions`
- 인증: `Authorization: Bearer <GROQ_API_KEY>`
- 요청 형식: OpenAI Whisper와 동일 (multipart/form-data)

## Risks / Trade-offs

- **STT 정확도 차이** → Turbo가 Large v3보다 미세하게 낮을 수 있음. 현재 앱의 `no_speech_prob` 필터, 할루시네이션 방지 로직이 동일하게 작동하므로 완화됨.
- **Groq 서비스 장애** → 현재 OpenAI도 단일 장애점. 추후 fallback 고려 가능하나 현재는 비용 최적화가 우선.
- **Rate Limit** → Groq 무료 티어: 분당 20회 / 시간 2,000회. 유료 전환 시 제한 완화됨.

## Migration Plan

1. Deno Deploy 대시보드에서 `GROQ_API_KEY` 환경변수 추가
2. `deno-main.ts` STT 핸들러 수정 (OPENAI_API_KEY → GROQ_API_KEY, URL 교체, 모델명 변환)
3. Deno Deploy 자동 배포 (main 브랜치 푸시)
4. 시뮬레이터/실제 디바이스에서 녹음 테스트
5. 문제 발생 시: `deno-main.ts`를 이전 커밋으로 되돌리고 재배포 (롤백 5분 이내)
