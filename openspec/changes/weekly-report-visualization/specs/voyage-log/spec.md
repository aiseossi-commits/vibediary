## MODIFIED Requirements

### Requirement: 항해일지 카드 목록 조회
SearchScreen 내 항해일지 섹션에서 activeChild에 해당하는 저장된 검색 로그를 최신순으로 표시해야 한다. 주간 요약(weekly_overview) 카드는 visual_data가 존재하면 상단에 패턴 빈도 칩을 먼저 표시해야 한다.

#### Scenario: 저장된 항해일지 있음
- **WHEN** activeChild에 저장된 search_logs가 존재하면
- **THEN** 질문·답변(최대 4줄 truncate)·날짜를 카드 형태로 최신순 나열한다

#### Scenario: 저장된 항해일지 없음
- **WHEN** activeChild에 저장된 search_logs가 없으면
- **THEN** 항해일지 섹션을 표시하지 않거나 빈 상태 안내를 표시한다

#### Scenario: activeChild 전환
- **WHEN** 사용자가 activeChild를 변경하면
- **THEN** 항해일지 목록이 새 activeChild의 기록으로 갱신된다

#### Scenario: 주간 요약 카드에 visual_data 있음
- **WHEN** 항해일지 탭에서 weekly_overview 타입 카드를 렌더링할 때 visual_data.patterns 배열이 1개 이상이면
- **THEN** 마크다운 텍스트 body 위에 패턴 빈도 칩("[이모지] 라벨 N회")을 수평 나열하여 표시한다
