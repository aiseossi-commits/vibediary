## Context

TagsScreen은 태그마다 ✎, × 버튼이 항상 렌더링된다. CalendarScreen의 이벤트 행에는 휴지통 아이콘이 항상 보인다. 두 화면 모두 읽기 목적의 조회가 주 용도인데 편집 버튼이 시각적 노이즈를 만든다.

## Goals / Non-Goals

**Goals:**
- 평상시 UI에서 수정/삭제 버튼 완전 제거
- 롱프레스로만 편집 액션 진입 가능
- TagsScreen: 인라인 토글 (기존 편집 흐름 유지)
- CalendarScreen: Bottom Sheet (실수 방지, 명확한 의도 확인)

**Non-Goals:**
- RecordDetailScreen 편집 버튼 변경 (별도 관심사)
- 일괄 삭제 모드 구현
- 햅틱 피드백 (향후 개선)

## Decisions

### 1. TagsScreen — 롱프레스 상태 분리

`editingTagId` (인라인 편집 중)와 별도로 `longPressedTagId` 상태를 추가한다.
- 롱프레스 → `longPressedTagId` 세팅 → 해당 행에 ✎, × 인라인 표시
- 다른 태그 탭/롱프레스 → `longPressedTagId` 초기화
- 수정 버튼 탭 → 기존 `editingTagId` 흐름으로 진입
- 삭제 버튼 탭 → 기존 Alert 확인 흐름 유지

**대안 검토:**
- 스와이프 삭제(swipe-to-delete) → RN에서 별도 라이브러리 필요, 오버스펙
- 롱프레스 → ActionSheet → 태그가 작아서 Bottom Sheet가 어울리지 않음

### 2. CalendarScreen — 롱프레스 → Bottom Sheet

Modal + `position: absolute` 오버레이로 간단히 구현한다. 외부 탭 시 닫힘.
- `selectedEvent` 상태로 어떤 이벤트의 시트를 열지 관리
- "삭제" 버튼 탭 → 기존 `handleDeleteEvent` 호출 → 시트 닫기

**대안 검토:**
- Alert → 이미 TagsScreen에서 사용 중. CalendarScreen은 이벤트 이름을 보여주며 더 명확한 UI가 적합.
- 외부 Bottom Sheet 라이브러리 → 의존성 불필요, 간단한 Modal로 충분.

## Risks / Trade-offs

- [발견가능성] 롱프레스 인터랙션은 직관적이지 않을 수 있음 → 온보딩/힌트는 범위 밖, 추후 고려
- [TagsScreen 롱프레스 후 다른 곳 탭] → FlatList/ScrollView의 onScrollBeginDrag 또는 외부 터치 시 `longPressedTagId` 초기화 처리 필요
