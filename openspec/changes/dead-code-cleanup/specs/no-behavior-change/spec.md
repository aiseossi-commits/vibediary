<!-- 이 변경은 순수 dead code 제거로, 새로운 capability나 동작 변경이 없습니다. -->
<!-- spec 파일은 tasks 언락을 위해 생성되었습니다. -->

## REMOVED Requirements

### Requirement: STTReviewScreen 화면
**Reason**: 네비게이터에 등록되지 않은 고아 파일. 사용되지 않는 화면.
**Migration**: 해당 없음 (사용된 적 없음)

### Requirement: getRecordsByTagNames 쿼리
**Reason**: 호출되는 곳이 없는 dead function. 동일 목적의 `getRecordsByTags`(ID 기반)가 사용 중.
**Migration**: 태그 이름 기반 조회가 필요할 경우 직접 구현

### Requirement: RecordTag 타입
**Reason**: 정의만 있고 import되는 곳 없음.
**Migration**: 해당 없음

### Requirement: COLORS 하위 호환 export
**Reason**: import되는 곳 없음. `useTheme().colors` 패턴이 표준화됨.
**Migration**: `useTheme()` 사용

### Requirement: USER_PROMPT_TEMPLATE의 subjectLine 플레이스홀더
**Reason**: 항상 빈 문자열로 치환되는 잔재. 아이 이름 힌트 기능 제거 시 누락된 정리.
**Migration**: 해당 없음
