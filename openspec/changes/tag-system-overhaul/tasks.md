## Tasks

- [ ] T1. `schema.ts`: tags 테이블 재생성 마이그레이션 (child_id 추가, UNIQUE(name, child_id))
- [ ] T2. `database.ts`: DB 버전 올려 마이그레이션 1회 실행 보장
- [ ] T3. `tagsDao.ts`: getAllTags(childId?), createTag(name, childId?), getTagsWithCount(childId?) — child_id 필터 적용
- [ ] T4. `recordPipeline.ts`: BASE_TAG_NAMES 하드코딩 제거 → DEFAULT_TAGS import
- [ ] T5. `offlineQueue.ts`: baseTags 하드코딩 제거 → DEFAULT_TAGS import
- [ ] T6. `TagsScreen.tsx`: 기본 태그 삭제 버튼 숨김, createTag 호출 시 activeChild.id 전달, getTagsWithCount(activeChild.id) 호출
- [ ] T7. `RecordDetailScreen.tsx`: 태그 편집 UI 추가 (편집 모드, 전체 태그 선택, setTagsForRecord 저장)
- [ ] T8. `npx tsc --noEmit` 통과 확인 후 STATE.md 업데이트 및 커밋
