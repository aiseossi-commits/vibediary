## Why

TagsScreen과 CalendarScreen에서 수정/삭제 버튼이 각 항목마다 항상 노출되어 UI가 복잡해 보인다. 이 버튼들은 자주 사용되지 않으며 항상 보일 필요가 없다. 롱프레스 제스처로 숨겨서 화면을 깔끔하게 만든다.

## What Changes

- **TagsScreen**: 태그 항목의 ✎(수정), ×(삭제) 버튼 제거 → 롱프레스 시 해당 태그 행에 인라인으로 버튼 토글 표시
- **CalendarScreen**: 이벤트 행의 휴지통(🗑) 버튼 제거 → 롱프레스 시 Bottom Sheet로 삭제 확인
- 기존 Alert 기반 삭제 확인은 유지 (TagsScreen), CalendarScreen은 Bottom Sheet로 교체

## Capabilities

### New Capabilities
- `tag-long-press-edit`: 태그 항목 롱프레스 → 인라인 수정/삭제 버튼 토글
- `event-long-press-delete`: 캘린더 이벤트 롱프레스 → Bottom Sheet 삭제 메뉴

### Modified Capabilities

## Impact

- `src/screens/TagsScreen.tsx` — 태그 렌더링 로직, 롱프레스 상태 추가
- `src/screens/CalendarScreen.tsx` — 이벤트 행 렌더링, Bottom Sheet 추가
- 신규 파일 없음 (기존 파일 내 수정으로 처리)
