## MODIFIED Requirements

### Requirement: 검색 결과 저장
사용자가 AI 등대 답변 카드의 저장 버튼을 누르면, 현재 질문·답변·날짜·activeChild를 DB에 저장해야 한다. 이미 저장된 결과에 대해 저장 버튼은 비활성화되어야 한다. search_logs 테이블은 wiki_pages 테이블과 무관하게 독립적으로 유지된다.

#### Scenario: 저장 버튼 누름
- **WHEN** 사용자가 답변 카드의 저장 버튼을 누르면
- **THEN** 현재 query, answer, created_at, child_id를 search_logs 테이블에 INSERT하고 버튼을 "저장됨" 상태로 전환한다

#### Scenario: 중복 저장 방지
- **WHEN** 검색 결과가 이미 저장된 상태이면
- **THEN** 저장 버튼이 비활성화되어 중복 저장을 막는다

#### Scenario: 저장 실패
- **WHEN** DB INSERT가 실패하면
- **THEN** 사용자에게 오류 메시지를 표시하고 버튼 상태를 원래대로 복원한다
