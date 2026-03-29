## Why

`raw_text`만 임베딩 소스로 사용하면 "류코보린 20mg증량" 같은 짧은 의학 텍스트는 임베딩 품질이 낮아 AI 등대 검색에서 누락된다. `raw_text`와 AI `summary`를 합친 텍스트로 임베딩하면 약물명·수치의 정확성과 의미적 풍부함을 동시에 확보할 수 있다.

## What Changes

- `recordPipeline.ts`: 임베딩 소스를 `raw_text` 단독 → `raw_text + summary` 합성 텍스트로 변경
- `offlineQueue.ts`: 오프라인 큐 재처리 시 동일한 합성 텍스트로 임베딩 생성
- `SettingsScreen.tsx`: 재색인 버튼도 동일한 합성 텍스트 방식으로 업데이트

## Capabilities

### New Capabilities

- `embedding-source-composition`: raw_text와 summary를 합성하여 임베딩 소스 텍스트를 생성하는 로직

### Modified Capabilities

- `voyage-log`: 검색(AI 등대) 기반 기록 탐색의 임베딩 품질 요건 변경

## Impact

- `src/services/recordPipeline.ts` — `generateEmbedding()` 호출 인자 변경
- `src/services/offlineQueue.ts` — 동일
- `src/screens/SettingsScreen.tsx` — 재색인 로직 동일 방식으로 업데이트
- 임베딩 API 호출 횟수 변화 없음, 입력 텍스트 길이 소폭 증가 (토큰 비용 미미)
- 기존 저장된 임베딩은 재색인 전까지 구버전 유지 (하위호환 문제 없음)
