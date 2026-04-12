## ADDED Requirements

### Requirement: AI 주간 리포트 시각 데이터 출력
AI가 주간 요약을 생성할 때 패턴/빈도 데이터를 `VISUAL_DATA:` 접두어 JSON 블록으로 마크다운 텍스트 앞에 함께 출력해야 한다.

#### Scenario: 정상 출력
- **WHEN** AI가 주간 요약 프롬프트에 응답하면
- **THEN** 응답 첫 줄은 `VISUAL_DATA:{"patterns":[{"emoji":"...","label":"...","count":N},...]}` 형식이고, 두 번째 줄은 `---` 구분자이며, 이후 기존 마크다운 body가 이어진다

#### Scenario: 패턴 없음
- **WHEN** 기록에서 반복 패턴이 발견되지 않으면
- **THEN** `VISUAL_DATA:{"patterns":[]}` 출력 후 마크다운 body가 이어진다

---

### Requirement: visual_data 파싱 및 저장
absorbService가 AI 응답에서 VISUAL_DATA JSON을 파싱하여 body와 분리하고, synthesis_articles.visual_data 컬럼에 저장해야 한다.

#### Scenario: 파싱 성공
- **WHEN** AI 응답이 `VISUAL_DATA:` 접두어를 포함하면
- **THEN** JSON을 파싱하여 visual_data로 저장하고, `---` 이후 텍스트를 body로 저장한다

#### Scenario: 파싱 실패 (포맷 불일치)
- **WHEN** AI 응답에 `VISUAL_DATA:` 접두어가 없거나 JSON 파싱에 실패하면
- **THEN** 전체 응답을 body로 저장하고 visual_data는 NULL로 저장한다 (fallback)

#### Scenario: DB 마이그레이션
- **WHEN** 앱이 업데이트되어 DB 마이그레이션이 실행되면
- **THEN** `synthesis_articles` 테이블에 `visual_data TEXT` 컬럼이 추가되고, 기존 레코드의 visual_data는 NULL이 된다

---

### Requirement: 주간 요약 카드 시각 요약 칩 표시
항해일지 탭의 주간 요약 카드 상단에 패턴 빈도 칩을 표시해야 한다.

#### Scenario: visual_data 있음
- **WHEN** 주간 요약 카드의 visual_data에 patterns 배열이 존재하고 1개 이상이면
- **THEN** 카드 텍스트 body 위에 "[이모지] 라벨 N회" 형태의 칩을 수평 나열한다

#### Scenario: visual_data 없거나 빈 배열
- **WHEN** visual_data가 NULL이거나 patterns 배열이 비어있으면
- **THEN** 칩 섹션을 표시하지 않고 기존 텍스트 body만 표시한다

#### Scenario: 파싱 실패
- **WHEN** visual_data 컬럼 값이 유효하지 않은 JSON이면
- **THEN** 칩 섹션을 표시하지 않고 기존 텍스트 body만 표시한다 (try-catch)
