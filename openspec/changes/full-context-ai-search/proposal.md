## Why

AI 등대 검색이 "3월에 무슨일이 있었지?"처럼 날짜·집계·맥락 기반 질문에 답하지 못한다. 근본 원인은 벡터 유사도 검색이 "관련 기록을 미리 선별"해야 하는 구조인데, 날짜나 집계 질문은 유사도로 선별할 수 없기 때문이다. Gemini 2.5 Flash Lite의 컨텍스트 윈도우(1M 토큰)가 이 앱의 전체 기록(수년치 ~15만 토큰)을 수용할 수 있으므로, 검색 단계 자체를 없애고 전체 기록을 LLM에게 직접 전달하는 방식으로 전환한다.

## What Changes

- **BREAKING** 벡터 임베딩 생성 제거: 기록 추가/수정 시 `generateEmbedding()` 호출 중단
- **BREAKING** `vectorSearch()` 기반 RAG 파이프라인 제거
- **BREAKING** 텍스트 키워드 검색(`textSearchRecords`) 파이프라인에서 제거
- **BREAKING** 평균 유사도 거부 게이트 제거
- 새 검색 파이프라인: 전체 기록 → compact 직렬화 → LLM → 자연어 답변
- 기록 추가 시 API 호출 횟수 감소 (요약 생성 1회만, 임베딩 호출 제거)
- 어떤 자연어 질문이든 답변 가능 (날짜, 집계, 패턴, 의미론적 모두)

## Capabilities

### New Capabilities

- `full-context-search`: 전체 기록을 compact 포맷으로 직렬화하여 LLM 단일 호출로 자연어 질문에 답변하는 검색 파이프라인

### Modified Capabilities

- `search-pattern-analysis`: 벡터 검색 기반 요구사항을 전체 컨텍스트 기반으로 대체. embedding 생성, threshold 기반 검색 범위, compact context 포맷 규칙 변경
- `token-efficient-context`: 유사도 점수 기반 압축이 아닌, 레코드 수 기반 컨텍스트 크기 관리로 요구사항 변경

## Impact

- `src/services/searchPipeline.ts` — 전면 재작성
- `src/services/vectorSearch.ts` — 제거 또는 빈 모듈로 축소
- `src/services/recordPipeline.ts` — `generateEmbedding()` 호출 제거
- `src/services/offlineQueue.ts` — `generateEmbedding()` 호출 제거
- `src/screens/SettingsScreen.tsx` — 재색인 버튼 제거 (임베딩 불필요)
- `src/db/schema.ts` — `embedding` 컬럼 사용 중단 (DB 컬럼은 NULL로 유지, 마이그레이션 불필요)
- `src/db/queries.ts` — `getRecordsWithEmbeddings()` 미사용 처리
