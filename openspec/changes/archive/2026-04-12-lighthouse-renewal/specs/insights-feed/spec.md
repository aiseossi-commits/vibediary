## ADDED Requirements

### Requirement: SearchScreen 세그먼트 컨트롤
SearchScreen 상단에 "등대" / "항해일지" 세그먼트 컨트롤이 표시되어야 하며, 탭 전환으로 뷰를 변경해야 한다.

#### Scenario: 세그먼트 전환
- **WHEN** 사용자가 "항해일지" 탭을 탭하면
- **THEN** 채팅 인터페이스가 숨겨지고 항해일지 피드가 표시되어야 한다

#### Scenario: 등대 탭 복귀
- **WHEN** 사용자가 "등대" 탭을 탭하면
- **THEN** 항해일지 피드가 숨겨지고 채팅 인터페이스가 표시되어야 한다

---

### Requirement: 인사이트 카드 표시
항해일지 피드는 synthesis_articles를 카드 형태로 최신순 표시해야 한다.

#### Scenario: 인사이트 카드 목록
- **WHEN** activeChild에 synthesis_articles가 존재하면
- **THEN** type, title, body(최대 4줄), updated_at을 카드 형태로 표시해야 한다

#### Scenario: 카드 타입 레이블
- **WHEN** synthesis_article의 type이 표시될 때
- **THEN** weekly_overview → "주간 요약", developmental_domain → "발달 성장", milestone_timeline → "이정표"로 한국어 레이블로 표시해야 한다

#### Scenario: 인사이트 카드 없음
- **WHEN** synthesis_articles가 없으면
- **THEN** "기록이 10개 이상 쌓이면 인사이트를 생성할 수 있어요." 안내 텍스트를 표시해야 한다

---

### Requirement: 인사이트 생성 가능 배너
`shouldAbsorb(childId)`가 true이면 SearchScreen 상단에 "인사이트 생성 가능" 배너를 표시해야 한다.

#### Scenario: 배너 표시
- **WHEN** shouldAbsorb가 true이고 항해일지 탭에 있으면
- **THEN** "새 기록이 쌓였어요. 인사이트를 업데이트할 수 있어요." 배너가 표시되어야 한다

#### Scenario: 배너 탭 → absorb 실행
- **WHEN** 사용자가 배너를 탭하면
- **THEN** `runAbsorb(childId)`가 실행되고 로딩 상태가 표시되어야 한다

#### Scenario: Absorb 완료
- **WHEN** runAbsorb가 완료되면
- **THEN** 배너가 사라지고 새 인사이트 카드가 피드에 추가되어야 한다

#### Scenario: Absorb 실패
- **WHEN** runAbsorb가 실패하면
- **THEN** 오류 메시지를 표시하고 배너는 유지되어야 한다

---

### Requirement: 인사이트 카드 삭제
사용자는 인사이트 카드를 개별 삭제할 수 있어야 한다.

#### Scenario: 카드 삭제
- **WHEN** 사용자가 인사이트 카드 삭제 버튼을 누르고 확인하면
- **THEN** 해당 synthesis_article이 DB에서 삭제되고 피드에서 제거되어야 한다

#### Scenario: 삭제 취소
- **WHEN** 사용자가 삭제 확인 다이얼로그에서 취소를 선택하면
- **THEN** 카드는 삭제되지 않아야 한다

---

### Requirement: activeChild 전환 시 피드 갱신
activeChild가 변경되면 항해일지 피드가 새 child의 데이터로 갱신되어야 한다.

#### Scenario: activeChild 변경
- **WHEN** 사용자가 activeChild를 변경하면
- **THEN** 인사이트 카드 목록과 수동 Q&A 목록 모두 새 child 기준으로 갱신되어야 한다
