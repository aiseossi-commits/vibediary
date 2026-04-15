## ADDED Requirements

### Requirement: 이벤트 행 롱프레스로 삭제 진입
캘린더의 이벤트 행은 평상시 삭제 버튼을 SHALL 표시하지 않는다. 사용자가 이벤트 행을 길게 누르면 Bottom Sheet가 SHALL 표시되며 삭제 액션을 제공한다.

#### Scenario: 평상시 삭제 버튼 미표시
- **WHEN** 캘린더 날짜 시트에서 이벤트 목록이 표시될 때
- **THEN** 각 이벤트 행에 삭제 버튼(휴지통)이 보이지 않는다

#### Scenario: 롱프레스로 Bottom Sheet 표시
- **WHEN** 사용자가 이벤트 행을 길게 누르면
- **THEN** 이벤트 이름과 함께 "삭제" 옵션이 담긴 Bottom Sheet가 아래에서 올라온다

#### Scenario: Bottom Sheet에서 삭제
- **WHEN** Bottom Sheet에서 "삭제" 버튼을 탭하면
- **THEN** 해당 이벤트가 삭제되고 Bottom Sheet가 닫힌다

#### Scenario: Bottom Sheet 취소
- **WHEN** Bottom Sheet 외부를 탭하거나 취소 버튼을 누르면
- **THEN** Bottom Sheet가 닫히고 이벤트는 유지된다
