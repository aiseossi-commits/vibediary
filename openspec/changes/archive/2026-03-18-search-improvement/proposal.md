## Why

AI 등대 검색이 일부 기록을 누락하고, 관련 기록이 여러 건일 때 패턴을 파악하지 못해 돌봄 가족에게 잘못된 또는 불완전한 정보를 제공한다. 오프라인 저장 기록의 embedding 누락 버그와 top-5 제한이 원인이다.

## What Changes

- **버그 수정**: offlineQueue에서 AI 처리 완료 후 embedding을 생성하지 않아 해당 기록이 벡터 검색에서 영구 제외되는 문제 수정
- **검색 범위 확대**: vectorSearch topK 5 → 유사도 threshold(0.3) 이상 전체, 최대 50건 cap
- **답변 품질 개선**: LLM 프롬프트를 패턴/빈도 분석형으로 개선, maxOutputTokens 300 → 600
- **context 포맷 최적화**: 기록당 전달 데이터를 compact하게 정리해 토큰 절약
- **분석 범위 표시**: 답변에 "N건 분석" 명시 (앱의 top-50 한계를 설계된 동작으로 안내)

## Capabilities

### New Capabilities

- `search-pattern-analysis`: 여러 기록에서 반복 패턴과 빈도를 분석해 인사이트를 제공하는 검색 답변 기능

### Modified Capabilities

(없음 — 기존 search 스펙 없음)

## Impact

- `src/services/searchPipeline.ts` — topK, 프롬프트, context 포맷, maxOutputTokens
- `src/services/vectorSearch.ts` — threshold 필터 추가
- `src/services/offlineQueue.ts` — embedding 생성 추가
