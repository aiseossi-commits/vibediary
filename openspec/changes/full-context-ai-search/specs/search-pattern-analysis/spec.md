## REMOVED Requirements

### Requirement: 오프라인 기록 embedding 생성
**Reason:** full-context-search로 전환하면서 임베딩 기반 검색을 제거함. 기록 추가 시 embedding 생성이 불필요해짐.
**Migration:** recordPipeline.ts, offlineQueue.ts에서 generateEmbedding() 호출 제거.

### Requirement: 유사도 threshold 기반 검색 범위
**Reason:** 벡터 검색 자체가 제거됨. 전체 기록을 컨텍스트로 전달하므로 threshold 필터링이 불필요.
**Migration:** vectorSearch() 및 관련 유사도 게이트 코드 삭제.

### Requirement: compact context 포맷
**Reason:** 유사도 점수 기반 포맷 분기가 제거됨. full-context-search 스펙의 compact 직렬화 요구사항으로 대체.
**Migration:** full-context-search spec의 "기록 compact 직렬화" 요구사항을 따름.

## MODIFIED Requirements

### Requirement: 패턴 분석형 LLM 답변
LLM은 전달된 전체 기록에서 반복 패턴과 빈도를 분석하여 답변해야 한다. 답변 첫 문장에 분석에 사용된 전체 기록 건수를 명시해야 한다.

#### Scenario: 단건 조회 질문
- **WHEN** 관련 기록이 1건이면
- **THEN** 해당 기록의 내용을 요약하여 날짜와 함께 답변한다

#### Scenario: 패턴 분석 질문 (다건)
- **WHEN** 관련 기록이 여러 건이고 반복 패턴이 존재하면
- **THEN** 총 N건 분석했음을 밝히고, 반복 패턴과 빈도를 구체적으로 답변한다 (예: "돼지고기 6회, 땅콩 5회")

#### Scenario: 전체 기록 건수 표시
- **WHEN** 검색 결과가 반환되면
- **THEN** 답변에 컨텍스트로 사용된 전체 기록 건수가 포함된다
