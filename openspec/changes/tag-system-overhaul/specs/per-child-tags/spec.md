## Capability: per-child-tags

커스텀 태그를 아이별로 격리한다. 기본 태그는 전체 공유(global), 커스텀 태그는 활성 아이에 귀속된다.

## Requirements

1. `tags` 테이블은 `child_id` 컬럼을 가진다. 기본 태그는 `child_id = NULL`, 커스텀 태그는 생성 시점의 activeChild.id를 가진다.
2. `getAllTags(childId)` 호출 시 `child_id IS NULL OR child_id = childId` 조건으로 조회한다.
3. `createTag(name, childId)`: 커스텀 태그 생성 시 childId를 저장한다.
4. TagsScreen에서 기본 태그(`DEFAULT_TAGS`에 포함된 태그)는 삭제 버튼을 표시하지 않는다.
5. AI 파이프라인(recordPipeline, offlineQueue)에서 기본 태그 목록은 `DEFAULT_TAGS`를 import하여 사용한다. 하드코딩 금지.
6. 마이그레이션: 기존 tags 데이터는 child_id = NULL(global)로 보존한다.
