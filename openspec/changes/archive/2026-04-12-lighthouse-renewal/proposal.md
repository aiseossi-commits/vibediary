## Why

AI 등대(SearchScreen)는 현재 매 질문마다 전체 raw records를 AI에게 던지는 구조로, 기록이 쌓일수록 토큰 비용이 증가하고 인사이트 품질이 불안정하다. 부모가 능동적으로 질문하지 않으면 아무 인사이트도 받지 못하며, 항해일지는 수동 저장 Q&A 목록에 그치고 있다.

## What Changes

- **synthesis 레이어 신설**: 개별 기록(raw)에서 패턴·발달 궤적·이정표를 주기적으로 합성하는 absorb 파이프라인 추가
- **DB 확장**: `synthesis_articles` + `absorb_log` 테이블 추가 (DB v9 마이그레이션)
- **Ingest 프롬프트 개선**: `ontology_code` (발달 영역 코드) + `is_milestone` (이정표 감지) 필드 추가
- **AI 등대 컨텍스트 개선**: full raw context dump → synthesis 아티클 우선 참조 + 최근 raw 보조
- **항해일지 리뉴얼**: 수동 저장 Q&A → 자동 인사이트 카드 + 이정표 카드 + 수동 Q&A 혼합 피드
- **인사이트 트리거 UX**: 기록 10개 누적 시 "인사이트 생성 가능" 배너 → 탭하면 absorb 실행

## Capabilities

### New Capabilities

- `synthesis-absorb`: 기록에서 패턴·발달 궤적·이정표를 합성하는 absorb 파이프라인. `synthesis_articles` DB 테이블 + `absorbService.ts` + `synthesisDao.ts` 포함
- `insights-feed`: 항해일지를 자동 인사이트 카드(synthesis) + 이정표 카드 + 수동 Q&A 혼합 피드로 리뉴얼. SearchScreen 내 탭 패널 형태

### Modified Capabilities

- `voyage-log`: 항해일지가 수동 저장 Q&A 전용에서 synthesis 아티클 포함 혼합 피드로 요구사항 변경
- `search-context-enrichment`: 검색 컨텍스트가 raw records 전체에서 synthesis 우선 + raw 보조 방식으로 요구사항 변경
- `rich-structured-data`: `structured_data` 스키마에 `ontology_code` + `is_milestone` 필드 추가

## Impact

- `src/db/schema.ts` — synthesis_articles, absorb_log 테이블
- `src/db/database.ts` — v9 마이그레이션
- `src/services/aiProcessor.ts` — 프롬프트 ontology_code + is_milestone 추가
- `src/services/absorbService.ts` — 신규: absorb 파이프라인
- `src/db/synthesisDao.ts` — 신규: synthesis CRUD
- `src/services/searchPipeline.ts` — synthesis 컨텍스트 우선 참조
- `src/screens/SearchScreen.tsx` — 항해일지 탭 UI 리뉴얼
- `src/types/record.ts` — SynthesisArticle 타입 추가
