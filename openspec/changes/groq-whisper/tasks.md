## 1. Deno Worker STT 핸들러 수정

- [x] 1.1 `deno-main.ts` STT 핸들러에서 `OPENAI_API_KEY` → `GROQ_API_KEY`로 교체
- [x] 1.2 STT API 엔드포인트 URL을 `https://api.groq.com/openai/v1/audio/transcriptions`로 변경
- [x] 1.3 `model=whisper-1` 요청을 `whisper-large-v3-turbo`로 내부 변환하는 로직 추가

## 2. 배포 및 검증

- [x] 2.1 main 브랜치 푸시 → Deno Deploy 자동 배포 확인
- [ ] 2.2 시뮬레이터에서 녹음 후 STT 동작 검증
