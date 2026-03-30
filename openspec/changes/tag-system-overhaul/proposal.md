## Why

태그 시스템이 아이별 데이터 분리(앱의 핵심 가치)를 구현하지 못하고 있다. 커스텀 태그가 전역 공유되어 아이별 구분이 불가능하고, 기본 태그가 삭제 가능하며, 기록 상세에서 태그를 수동으로 편집할 수 없다.

## What Changes

- **BREAKING** `tags` 테이블에 `child_id` 컬럼 추가 (기본 태그는 NULL = global, 커스텀 태그는 아이별)
- 기본 태그(`#의료` 등 5개) 삭제 방지 — TagsScreen에서 delete 버튼 숨김
- 기본 태그 하드코딩 3중 중복 제거 — `DEFAULT_TAGS` 단일 출처로 통일
- `RecordDetailScreen`에 태그 수동 편집 UI 추가 (추가/제거)
- TagsScreen: 활성 아이 기준으로 커스텀 태그 필터링

## Capabilities

### New Capabilities
- `per-child-tags`: 태그를 아이별로 격리. 기본 태그는 global(child_id=NULL), 커스텀 태그는 activeChild에 귀속
- `tag-manual-edit`: 기록 상세 화면에서 태그 수동 추가/제거

### Modified Capabilities
- `embedding-source-composition`: 해당 없음

## Impact

- `src/db/schema.ts` — tags 테이블 재생성 마이그레이션, DEFAULT_TAGS 단일 출처
- `src/db/tagsDao.ts` — getAllTags, createTag, getTagsWithCount child_id 필터 추가
- `src/services/recordPipeline.ts` — BASE_TAG_NAMES 하드코딩 제거
- `src/services/offlineQueue.ts` — baseTags 하드코딩 제거
- `src/screens/TagsScreen.tsx` — 기본 태그 삭제 버튼 숨김, activeChild 필터
- `src/screens/RecordDetailScreen.tsx` — 태그 편집 UI 추가
