## ADDED Requirements

### Requirement: 검색 결과 저장
사용자가 AI 등대 답변 카드의 저장 버튼을 누르면, 현재 질문·답변·날짜·activeChild를 DB에 저장해야 한다. 이미 저장된 결과에 대해 저장 버튼은 비활성화되어야 한다.

#### Scenario: 저장 버튼 누름
- **WHEN** 사용자가 답변 카드의 저장 버튼을 누르면
- **THEN** 현재 query, answer, created_at, child_id를 search_logs 테이블에 INSERT하고 버튼을 "저장됨" 상태로 전환한다

#### Scenario: 중복 저장 방지
- **WHEN** 검색 결과가 이미 저장된 상태이면
- **THEN** 저장 버튼이 비활성화되어 중복 저장을 막는다

#### Scenario: 저장 실패
- **WHEN** DB INSERT가 실패하면
- **THEN** 사용자에게 오류 메시지를 표시하고 버튼 상태를 원래대로 복원한다

---

### Requirement: 항해일지 카드 목록 조회
SearchScreen 내 항해일지 섹션에서 activeChild에 해당하는 저장된 검색 로그를 최신순으로 표시해야 한다.

#### Scenario: 저장된 항해일지 있음
- **WHEN** activeChild에 저장된 search_logs가 존재하면
- **THEN** 질문·답변(최대 4줄 truncate)·날짜를 카드 형태로 최신순 나열한다

#### Scenario: 저장된 항해일지 없음
- **WHEN** activeChild에 저장된 search_logs가 없으면
- **THEN** 항해일지 섹션을 표시하지 않거나 빈 상태 안내를 표시한다

#### Scenario: activeChild 전환
- **WHEN** 사용자가 activeChild를 변경하면
- **THEN** 항해일지 목록이 새 activeChild의 기록으로 갱신된다

---

### Requirement: 항해일지 카드 삭제
사용자는 항해일지 카드를 개별 삭제할 수 있어야 한다. 삭제 전 확인 다이얼로그를 표시해야 한다.

#### Scenario: 삭제 확인 후 삭제
- **WHEN** 사용자가 카드 삭제 버튼을 누르고 확인 다이얼로그에서 "삭제"를 선택하면
- **THEN** 해당 search_log를 DB에서 삭제하고 목록에서 제거한다

#### Scenario: 삭제 취소
- **WHEN** 사용자가 삭제 확인 다이얼로그에서 "취소"를 선택하면
- **THEN** 카드는 삭제되지 않고 목록이 유지된다
