# token-efficient-context

## Purpose

LLM 컨텍스트 전달 시 유사도 점수에 따라 포함 데이터 수준을 조절하여 토큰을 효율적으로 사용한다.

---

## Requirements

### Requirement: 유사도 기반 컨텍스트 압축
LLM에 전달하는 기록 컨텍스트는 유사도 점수에 따라 포함하는 데이터 수준이 달라야 한다.

#### Scenario: 고유사도 기록 (0.6 이상)
- **WHEN** 기록의 유사도 점수가 0.6 이상이면
- **THEN** `MM-DD #태그 요약 [키:값,키:값]` 전체 포맷으로 컨텍스트에 포함한다

#### Scenario: 저유사도 기록 (0.6 미만)
- **WHEN** 기록의 유사도 점수가 0.6 미만이면
- **THEN** `MM-DD #태그 요약` 포맷으로 structuredData를 제외하고 컨텍스트에 포함한다

#### Scenario: 임베딩 없는 fallback 기록
- **WHEN** vectorSearch 없이 fallback으로 가져온 기록이면
- **THEN** 유사도 점수가 없으므로 summary만 포함하는 저유사도 포맷을 적용한다
