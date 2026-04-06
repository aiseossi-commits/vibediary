## MODIFIED Requirements

### Requirement: 항해일지 카드 목록 조회
SearchScreen 내 항해일지 섹션에서 activeChild에 해당하는 저장된 검색 로그를 최신순으로 표시해야 한다. 항해일지는 인사이트 카드(synthesis_articles) 아래에 "저장된 질문" 섹션으로 표시되어야 한다.

#### Scenario: 저장된 항해일지 있음
- **WHEN** activeChild에 저장된 search_logs가 존재하면
- **THEN** 질문·답변(최대 4줄 truncate)·날짜를 카드 형태로 최신순 나열하고, 인사이트 카드 아래 "저장된 질문" 섹션 헤더와 함께 표시한다

#### Scenario: 저장된 항해일지 없음
- **WHEN** activeChild에 저장된 search_logs가 없으면
- **THEN** "저장된 질문" 섹션을 표시하지 않는다

#### Scenario: activeChild 전환
- **WHEN** 사용자가 activeChild를 변경하면
- **THEN** 항해일지 목록이 새 activeChild의 기록으로 갱신된다
