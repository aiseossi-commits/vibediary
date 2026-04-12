## ADDED Requirements

### Requirement: Lint 실행 — wiki 건강 체크
`runLint(childId)`는 해당 child의 모든 wiki_pages를 AI에 전달하고, stale pages, orphan pages, missing cross-refs, content gaps를 감지하여 LintResult를 반환해야 한다.

#### Scenario: stale 페이지 감지
- **WHEN** wiki_page의 updated_at이 현재 시각 기준 30일 이상 경과했으면
- **THEN** LintResult의 issues 배열에 해당 slug와 "30일 이상 미갱신" 사유가 포함된다

#### Scenario: orphan 페이지 감지
- **WHEN** wiki-index 페이지의 body에 링크되지 않은 wiki_page slug가 존재하면
- **THEN** LintResult의 issues 배열에 해당 slug와 "인덱스에 없는 고아 페이지" 사유가 포함된다

#### Scenario: wiki pages 없을 때 Lint
- **WHEN** childId에 wiki_pages가 없으면
- **THEN** LintResult는 빈 issues 배열과 "wiki가 아직 없습니다" 메시지를 반환한다

---

### Requirement: Lint는 데이터를 수정하지 않음
`runLint`는 읽기 전용 작업이어야 한다. wiki_pages 테이블에 INSERT/UPDATE/DELETE를 수행해서는 안 된다.

#### Scenario: Lint 실행 후 데이터 무변경
- **WHEN** runLint가 완료되면
- **THEN** wiki_pages 테이블의 어떤 row도 변경되지 않는다

---

### Requirement: Lint 결과 타입
`LintResult`는 `{ issues: LintIssue[], suggestions: string[] }` 구조를 가져야 한다. `LintIssue`는 `{ slug: string, reason: string }` 구조다.

#### Scenario: LintResult 구조 검증
- **WHEN** runLint가 정상 완료되면
- **THEN** 반환값은 issues(LintIssue 배열)와 suggestions(string 배열)를 포함한다

---

### Requirement: Lint는 수동 트리거만 지원
v1에서 Lint는 사용자가 명시적으로 실행할 때만 동작해야 한다. 자동 스케줄 실행은 지원하지 않는다.

#### Scenario: 수동 트리거
- **WHEN** 사용자가 SearchScreen의 Lint 버튼을 누르면
- **THEN** runLint가 호출되고 결과가 UI에 표시된다

#### Scenario: 자동 실행 없음
- **WHEN** 앱이 시작되거나 absorb가 완료되면
- **THEN** runLint는 자동으로 호출되지 않는다
