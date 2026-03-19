## MODIFIED Requirements

### Requirement: compact context 포맷
LLM에 전달하는 기록 context는 연도 생략, 구분자 최소화로 토큰을 절약한다. 유사도 점수에 따라 포함 데이터 수준이 달라진다.

#### Scenario: 고유사도 기록 context 포맷 적용
- **WHEN** 유사도 0.6 이상인 기록을 LLM context로 변환하면
- **THEN** `MM-DD #태그 요약 [키:값,키:값]` 형식으로 직렬화한다

#### Scenario: 저유사도 기록 context 포맷 적용
- **WHEN** 유사도 0.6 미만인 기록을 LLM context로 변환하면
- **THEN** `MM-DD #태그 요약` 형식으로 직렬화한다 (structuredData 제외)
