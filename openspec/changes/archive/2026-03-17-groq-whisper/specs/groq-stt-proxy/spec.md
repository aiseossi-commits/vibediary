## ADDED Requirements

### Requirement: Groq Whisper API 프록시
Deno Worker의 `/stt` 엔드포인트는 OpenAI Whisper API 대신 Groq Whisper API를 사용하여 STT를 처리해야 한다. Worker는 클라이언트로부터 받은 `model=whisper-1` 요청을 내부적으로 Groq 모델명(`whisper-large-v3-turbo`)으로 변환하여 `https://api.groq.com/openai/v1/audio/transcriptions`에 전달해야 한다. 인증은 `GROQ_API_KEY` 환경변수로 설정된 Bearer 토큰을 사용해야 한다.

#### Scenario: 정상 STT 요청
- **WHEN** 클라이언트가 `model=whisper-1`로 `/stt` 엔드포인트에 multipart/form-data 요청을 보낼 때
- **THEN** Worker는 모델명을 `whisper-large-v3-turbo`로 변환하여 Groq API에 전달하고, Groq 응답을 클라이언트에 그대로 반환해야 한다

#### Scenario: GROQ_API_KEY 인증
- **WHEN** Worker가 Groq API에 요청을 보낼 때
- **THEN** `Authorization: Bearer <GROQ_API_KEY>` 헤더를 사용해야 하며, `OPENAI_API_KEY` 환경변수는 STT 핸들러에서 참조하지 않아야 한다

#### Scenario: 앱 클라이언트 코드 변경 없음
- **WHEN** 앱 클라이언트(`stt.ts`)가 Worker `/stt` 엔드포인트를 호출할 때
- **THEN** 클라이언트 코드 변경 없이 동일한 요청 형식으로 동작해야 하며, Groq 응답은 OpenAI Whisper 응답과 동일한 JSON 구조를 반환해야 한다
