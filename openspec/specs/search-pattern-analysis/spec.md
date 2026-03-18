# search-pattern-analysis

## Purpose

AI 등대(SearchScreen) RAG 파이프라인의 검색 품질 개선. 오프라인 큐 embedding 생성, 유사도 기반 검색 범위, 패턴 분석형 LLM 답변, compact context 포맷을 정의한다.

---

## Requirements

### Requirement: 오프라인 기록 embedding 생성
offlineQueue에서 AI 처리 완료 후, 해당 기록의 embedding을 생성하여 DB에 저장해야 한다. embedding 생성이 실패해도 큐 처리는 중단되지 않아야 한다.

#### Scenario: offlineQueue 처리 완료 후 embedding 저장
- **WHEN** offlineQueue가 pending 기록의 AI 처리를 완료하면
- **THEN** `generateEmbedding(summary)`를 호출하고 `updateRecord()`에 embedding을 포함하여 저장한다

#### Scenario: embedding 생성 실패 시 큐 처리 계속
- **WHEN** offlineQueue에서 embedding 생성이 네트워크 오류 등으로 실패하면
- **THEN** embedding은 null로 유지하고, 큐의 나머지 항목 처리를 계속한다

---

### Requirement: 유사도 threshold 기반 검색 범위
vectorSearch는 고정 topK 대신 유사도 threshold(0.3) 이상인 기록을 반환하되, 최대 50건으로 제한한다.

#### Scenario: threshold 이상 기록이 50건 이하
- **WHEN** 유사도 0.3 이상인 기록이 30건이면
- **THEN** 30건 전부를 반환한다

#### Scenario: threshold 이상 기록이 50건 초과
- **WHEN** 유사도 0.3 이상인 기록이 80건이면
- **THEN** 유사도 높은 순 상위 50건만 반환한다

#### Scenario: threshold 미만 기록 제외
- **WHEN** 유사도가 0.3 미만인 기록이 있으면
- **THEN** 해당 기록은 검색 결과에 포함하지 않는다

---

### Requirement: 패턴 분석형 LLM 답변
LLM은 여러 건의 기록에서 반복 패턴과 빈도를 분석하여 답변해야 한다. 답변 첫 문장에 분석한 총 기록 건수를 명시해야 한다.

#### Scenario: 단건 조회 질문
- **WHEN** 관련 기록이 1건이면
- **THEN** 해당 기록의 내용을 요약하여 답변한다

#### Scenario: 패턴 분석 질문 (다건)
- **WHEN** 관련 기록이 여러 건이고 반복 패턴이 존재하면
- **THEN** 총 N건 분석했음을 밝히고, 반복 패턴과 빈도를 구체적으로 답변한다 (예: "돼지고기 6회, 땅콩 5회")

#### Scenario: 분석 건수 표시
- **WHEN** 검색 결과가 반환되면
- **THEN** 답변 첫 문장 또는 UI에 "N건 분석" 정보가 포함된다

---

### Requirement: compact context 포맷
LLM에 전달하는 기록 context는 연도 생략, 구분자 최소화로 토큰을 절약한다.

#### Scenario: context 포맷 적용
- **WHEN** 기록을 LLM context로 변환하면
- **THEN** `MM-DD #태그 요약 [키:값,키:값]` 형식으로 직렬화한다
