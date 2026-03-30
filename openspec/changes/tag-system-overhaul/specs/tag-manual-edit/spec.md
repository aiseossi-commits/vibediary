## Capability: tag-manual-edit

기록 상세 화면에서 AI가 붙인 태그를 사용자가 수동으로 추가하거나 제거할 수 있다.

## Requirements

1. RecordDetailScreen에서 태그 영역에 편집 진입 수단(버튼 등)을 제공한다.
2. 편집 모드에서 현재 아이의 전체 태그 목록(global + 커스텀)을 표시한다.
3. 현재 기록에 연결된 태그는 선택된 상태로 표시된다.
4. 확인 시 `setTagsForRecord(recordId, selectedTagNames)`를 호출하여 저장한다.
5. 편집 중 취소하면 변경 사항을 적용하지 않는다.
