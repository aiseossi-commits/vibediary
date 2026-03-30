## Approach

태그 테이블을 재설계하여 기본 태그(global)와 커스텀 태그(per-child)를 구분한다. DB 마이그레이션은 기존 데이터를 보존하면서 child_id 컬럼을 추가한다.

## DB 마이그레이션

SQLite는 UNIQUE 제약 변경이 불가하므로 테이블 재생성 방식 사용:

```sql
-- 1. 임시 테이블로 복사
CREATE TABLE tags_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  UNIQUE(name, child_id)
);

-- 2. 기존 데이터 이전 (child_id = NULL로 global 처리)
INSERT INTO tags_new (id, name, child_id)
SELECT id, name, NULL FROM tags;

-- 3. 교체
DROP TABLE tags;
ALTER TABLE tags_new RENAME TO tags;
```

`database.ts`의 마이그레이션 버전을 올려 최초 1회만 실행되도록 한다.

## DEFAULT_TAGS 단일 출처

`schema.ts`의 `DEFAULT_TAGS`를 모든 파일에서 import. recordPipeline.ts의 `BASE_TAG_NAMES`, offlineQueue.ts의 `baseTags` 하드코딩 제거.

## tagsDao 변경

- `getAllTags(childId?)`: child_id IS NULL OR child_id = childId
- `createTag(name, childId?)`: 커스텀 태그 생성 시 childId 전달
- `getTagsWithCount(childId?)`: 동일 필터
- 기본 태그 판별: `DEFAULT_TAGS.includes(tag.name)`

## TagsScreen 변경

- 기본 태그: delete 버튼 숨김 (isDefault 여부로 판별)
- 커스텀 태그 생성: `createTag(name, activeChild.id)` 호출
- 태그 목록: `getTagsWithCount(activeChild.id)` — global + 아이별 커스텀

## RecordDetailScreen 태그 편집

- 태그 칩 옆 편집 버튼(연필 아이콘) → 편집 모드 진입
- 편집 모드: 전체 태그 목록 표시, 현재 태그는 선택된 상태
- 확인 시 `setTagsForRecord(recordId, selectedTagNames)` 호출

## 결정 사항

- 커스텀 태그 생성 시 child_id 필수 (activeChild 없으면 생성 불가 — 실제로 발생 안함)
- 기존 커스텀 태그(마이그레이션 후 child_id=NULL): TagsScreen에서 global로 표시, 삭제는 가능
- 태그 이름 수정 기능은 이번 범위 외
