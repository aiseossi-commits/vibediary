## ADDED Requirements

### Requirement: 전체 기록 컨텍스트 조회
검색 시 activeChild의 모든 기록을 created_at DESC 순으로 조회하여 LLM 컨텍스트로 사용한다. 기록 수가 2000건을 초과하면 최근 2000건만 사용한다.

#### Scenario: 기록 2000건 이하 조회
- **WHEN** activeChild의 기록이 1500건이면
- **THEN** 1500건 전부를 created_at DESC 순으로 컨텍스트에 포함한다

#### Scenario: 기록 2000건 초과 시 제한
- **WHEN** activeChild의 기록이 3000건이면
- **THEN** 최근 2000건만 컨텍스트에 포함한다

---

### Requirement: 기록 compact 직렬화
각 기록은 `YYYY-MM-DD #태그 요약` 포맷으로 직렬화된다. structured_data는 `#의료` 또는 `#투약` 태그가 있는 기록에만 `[key:val]` 형태로 포함한다.

#### Scenario: 일반 기록 직렬화
- **WHEN** `#일상` 태그만 있는 기록을 직렬화하면
- **THEN** `2026-03-15 #일상 오늘 산책 나감` 형식으로 직렬화한다

#### Scenario: 의료/투약 기록 직렬화 (structured_data 포함)
- **WHEN** `#투약` 태그와 `{ drug: "류코보린", dose: "20mg" }` structured_data가 있는 기록을 직렬화하면
- **THEN** `2026-03-10 #투약 류코보린 20mg 복용함 [drug:류코보린,dose:20mg]` 형식으로 직렬화한다

#### Scenario: structured_data가 있어도 의료/투약 태그 없으면 제외
- **WHEN** `#일상` 태그만 있고 structured_data가 비어있지 않은 기록을 직렬화하면
- **THEN** structured_data를 포함하지 않고 `YYYY-MM-DD #일상 요약` 형식으로 직렬화한다

---

### Requirement: 시스템 프롬프트에 현재 날짜 포함
LLM이 "3월에", "이번달", "지난주" 같은 상대적 날짜 표현을 해석할 수 있도록 시스템 프롬프트에 오늘 날짜를 포함한다.

#### Scenario: 시스템 프롬프트 날짜 포함
- **WHEN** searchRecords()가 호출되면
- **THEN** 시스템 프롬프트에 `오늘: YYYY-MM-DD` 형태로 현재 날짜가 포함된다

---

### Requirement: 단일 LLM 호출 답변 생성
전체 기록 컨텍스트와 사용자 질문을 단일 LLM 호출로 전달하여 답변을 생성한다. 벡터 검색, 텍스트 검색, 임베딩 생성 등 별도 전처리 단계가 없다.

#### Scenario: 날짜 기반 질문 답변
- **WHEN** 사용자가 "3월에 무슨일이 있었지?"라고 질문하면
- **THEN** LLM이 컨텍스트에서 3월 기록을 직접 찾아 답변한다

#### Scenario: 집계 질문 답변
- **WHEN** 사용자가 "약 몇 번 먹었어?"라고 질문하면
- **THEN** LLM이 `#투약` 태그 기록을 세어 답변한다

#### Scenario: 의미론적 질문 답변
- **WHEN** 사용자가 "기분이 안 좋아 보인 날이 있었어?"라고 질문하면
- **THEN** LLM이 요약 내용을 의미론적으로 해석하여 관련 기록을 찾아 답변한다

---

### Requirement: 오프라인 시 안내
네트워크 미연결 상태에서는 LLM 호출 없이 즉시 안내 메시지를 반환한다.

#### Scenario: 오프라인 검색 시도
- **WHEN** 네트워크가 연결되지 않은 상태에서 검색하면
- **THEN** "오프라인 상태에서는 AI 등대를 사용할 수 없어요."를 반환한다
