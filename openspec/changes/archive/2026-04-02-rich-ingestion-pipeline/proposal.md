## Why

AI 등대의 검색 품질이 낮은 근본 원인은 ingestion 시점에 기록이 충분히 구조화되지 않기 때문이다. 현재 Gemini는 요약+태그+의료수치만 추출하고(maxOutputTokens: 256), 검색 시 raw 텍스트를 매번 재해석한다. 기록 저장 시점에 Gemini가 내용을 완전히 소화하여 구조화된 형태로 저장하면, 검색 AI는 해석 없이 답변에만 집중할 수 있다.

## What Changes

- `aiProcessor.ts` 프롬프트 강화: 행동 사건 여부 분류 + ABC 추출 + 관찰 유형 분류
- `aiProcessor.ts` maxOutputTokens 256 → 700으로 상향
- `structured_data` 스키마 확장: event_type, antecedent, behavior, consequence, observation_domain 필드 추가 (TEXT 컬럼 그대로, 스키마 마이그레이션 불필요)
- `searchPipeline.ts` formatRecord 개선: 새 structured_data 필드를 컨텍스트에 포함

## Capabilities

### New Capabilities

- `rich-structured-data`: Gemini가 기록을 저장 시점에 완전히 소화 — 행동 사건이면 ABC, 의료면 수치, 발달 관찰이면 영역 분류까지 추출하여 structured_data에 저장
- `search-context-enrichment`: formatRecord가 구조화 데이터를 검색 컨텍스트에 반영하여 AI 등대 답변 정밀도 향상

### Modified Capabilities

(없음)

## Impact

- `src/services/aiProcessor.ts` — 프롬프트, 토큰 한도 변경
- `src/services/searchPipeline.ts` — formatRecord 함수 변경
- `src/types/record.ts` — AIProcessingResult 타입 확장
- 기존 기록의 structured_data는 변경 없음 (신규 기록부터 적용)
- offlineQueue 재처리 시 자동으로 새 스키마 적용
