## Why

태그 시스템에 버그 2개와 설계 결함 1개가 있다. 아이 전환 시 이전 아이 기록이 잔류하는 버그, childId 없는 기록 조회, #발달 태그 부재로 발달 기록이 #일상에 묻히는 문제를 한 번에 수정한다.

## What Changes

- **TagsScreen**: `activeChild` 전환 시 `selectedTagIds`, `filteredRecords` 상태 초기화
- **TagsScreen**: `getRecordsByTags` 호출 시 `activeChild.id` 전달
- **schema.ts**: `DEFAULT_TAGS`에 `#발달` 추가 (5개 → 6개)
- **aiProcessor.ts**: 태그별 semantic 정의 추가 + `event_type`과 태그 선택의 독립성 명시 + 커스텀 태그 섹션 분리

## Capabilities

### New Capabilities
- `tag-child-isolation`: 아이 전환 시 태그 필터 상태가 초기화되어 이전 아이 기록이 잔류하지 않음
- `tag-development`: `#발달` 기본 태그 도입. AI가 발달 관찰 기록을 `#일상` 대신 `#발달`로 분류

### Modified Capabilities
- (없음)

## Impact

- `src/screens/TagsScreen.tsx` — 상태 초기화 + childId 전달
- `src/db/schema.ts` — DEFAULT_TAGS 배열
- `src/services/aiProcessor.ts` — buildSystemPrompt 태그 정의 재작성
- `src/db/childrenDao.ts` — DEFAULT_TAGS import이므로 `#발달` 자동 시드 (코드 수정 불필요)
