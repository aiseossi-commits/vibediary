## 1. TagsScreen — 롱프레스 인라인 토글

- [x] 1.1 `longPressedTagId` 상태 추가 (`useState<number | null>(null)`)
- [x] 1.2 태그 항목에 `onLongPress` 핸들러 추가 → `longPressedTagId` 세팅
- [x] 1.3 평상시 ✎, × 버튼 렌더링 제거
- [x] 1.4 `longPressedTagId === tag.id`일 때만 ✎, × 버튼 인라인 표시
- [x] 1.5 다른 태그 탭 시 `longPressedTagId` 초기화 (기존 `handleToggleTag` 내에서 처리)
- [x] 1.6 편집 모드 진입 시(`handleStartEdit`) `longPressedTagId` 초기화

## 2. CalendarScreen — 롱프레스 Bottom Sheet

- [x] 2.1 `selectedEventForSheet` 상태 추가 (`useState<{id: number, name: string} | null>(null)`)
- [x] 2.2 이벤트 행 휴지통 버튼 렌더링 제거
- [x] 2.3 이벤트 행에 `onLongPress` 핸들러 추가 → `selectedEventForSheet` 세팅
- [x] 2.4 Bottom Sheet Modal 구현 (Modal + absoluteFill 오버레이 + 하단 시트)
- [x] 2.5 시트 내 이벤트 이름 표시 + "삭제" 버튼 → `handleDeleteEvent` 호출 후 시트 닫기
- [x] 2.6 오버레이 탭 시 시트 닫기 (취소)

## 3. 검증

- [x] 3.1 `npx tsc --noEmit` 타입 체크 통과
- [ ] 3.2 TagsScreen: 평상시 버튼 미노출, 롱프레스 후 버튼 표시, 다른 곳 탭 시 숨김 확인
- [ ] 3.3 CalendarScreen: 평상시 버튼 미노출, 롱프레스 후 시트 표시, 삭제/취소 동작 확인
