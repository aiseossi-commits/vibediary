## Context

바다 앱은 부모가 음성으로 아이 돌봄 기록을 남기면 AI가 요약·태깅·구조화하는 앱이다. 현재 AI는 기록 저장 시(Ingest)만 작동한다. AI 등대(SearchScreen)는 질문마다 전체 raw records를 Gemini에 던지는 구조로, 기록 수가 늘수록 토큰 비용이 선형으로 증가한다. 항해일지는 수동 저장 Q&A 목록에 그친다.

DB: expo-sqlite (v8 현재). AI: Gemini 2.5 Flash Lite via Deno Deploy 프록시. 오프라인 큐(`offline_queue`) 패턴이 이미 있어 비동기 AI 처리 선례가 있다.

## Goals / Non-Goals

**Goals:**
- Ingest와 분리된 Synthesis 레이어 도입 (absorb 파이프라인)
- AI 등대 컨텍스트를 synthesis 우선 + raw 보조 구조로 전환
- 항해일지를 자동 인사이트 카드 + 이정표 카드 + 수동 Q&A 혼합 피드로 리뉴얼
- Ingest AI가 발달 영역 온톨로지 코드(`ontology_code`) + 이정표 감지(`is_milestone`) 추출

**Non-Goals:**
- 벡터 임베딩 재도입
- 외부 공유/PDF 내보내기
- 태그 v2 계층 구조 변경 (별도 작업)
- 실시간 스트리밍 응답

## Decisions

### D1. synthesis_articles를 별도 테이블로 분리

**결정**: `synthesis_articles` 신규 테이블. records와 분리.

**이유**: raw records는 불변(immutable) 관찰 데이터. synthesis는 AI가 합성한 가변(mutable) 지식이다. 분리해야 absorb가 synthesis만 갱신할 때 raw records를 건드리지 않는다.

**대안**: records 테이블에 `is_synthesis` 컬럼 추가 → 거부. 타입 혼재로 쿼리 복잡도 증가.

### D2. Absorb 트리거: 반자동 (배너 → 탭하면 실행)

**결정**: 기록 10개 누적 후 "인사이트 생성 가능" 배너 표시 → 사용자가 탭하면 absorb 실행.

**이유**: 완전 자동은 백그라운드 AI 호출 = 사용자 모르게 토큰 소비. 완전 수동은 부모가 잊어버림. 반자동이 컨트롤 느낌 + 동기부여 루프 모두 충족.

**대안**: 주기 타이머(7일) 자동 → 거부. 앱이 비활성이면 타이머 미작동.

### D3. 항해일지 위치: SearchScreen 내 탭 패널 (탭 추가 아님)

**결정**: SearchScreen 상단에 "등대" / "항해일지" 세그먼트 컨트롤. 탭 네비게이터에 5번째 탭 추가 안 함.

**이유**: 현재 탭 4개가 이미 적절한 정보 밀도. 항해일지는 등대의 부속 기능이므로 같은 화면에서 전환이 자연스럽다. 탭 추가는 전체 네비게이션 리팩터 필요.

### D4. Synthesis 아티클 타입: weekly_overview + developmental_domain + milestone_timeline 먼저

**결정**: 초기 구현은 3개 타입만. `behavioral_pattern`, `medical_summary`, `therapy_log`는 단기 후속.

**이유**: 부모에게 가장 즉각적 가치가 있는 것: 주간 요약, 발달 성장, 이정표. behavioral_pattern은 ABC 클러스터링이 필요해 복잡도 높음 → 후속.

### D5. Query 레이어: synthesis 인덱스 → relevance 분류 → context 조립

**결정**: 질문 텍스트로 synthesis 아티클 관련도 판단(키워드 매칭) → 관련 아티클 + 최근 30개 raw records → Gemini.

**이유**: 임베딩 없이도 type별 인덱스(weekly_overview, developmental_domain 등)로 충분한 relevance 분류 가능. 임베딩 재도입은 Non-Goal.

## Risks / Trade-offs

- [Absorb AI 품질 불안정] → 기록 수 임계값(10개) + 아티클 최소 길이 검증. 짧은 결과는 저장 안 함.
- [토큰 비용 증가] → absorb는 사용자 트리거. 월 1-2회 실행 예상. weekly_overview는 최근 7일 records만 입력.
- [synthesis 아티클 오래됨] → `updated_at` + "N일 전 업데이트" 표시. 사용자가 stale 인식 가능.
- [기록 없을 때 빈 항해일지] → 빈 상태 안내: "기록이 10개 이상 쌓이면 인사이트를 생성할 수 있어요."

## Migration Plan

1. DB v9 마이그레이션 (synthesis_articles, absorb_log 테이블 추가) — 기존 데이터 영향 없음
2. aiProcessor.ts 프롬프트 업데이트 — 기존 records의 ontology_code는 null, 신규 기록부터 적용
3. absorbService.ts 구현 + SearchScreen UI 리뉴얼
4. 기존 search_logs 데이터는 유지 — 항해일지에 그대로 표시

롤백: synthesis_articles 테이블은 신규라 기존 기능에 영향 없음. SearchScreen 세그먼트 컨트롤은 UI 변경이므로 이전 빌드로 롤백 가능.

## Open Questions

- weekly_overview absorb 시 최근 N일 기록을 입력으로 쓸지, 전체 기록 쓸지: **최근 14일로 고정** (토큰 제한)
- milestone 감지 오탐 처리: 부모가 milestone 카드를 수동 삭제할 수 있어야 하는가 → **Yes, 삭제 가능**으로 구현
