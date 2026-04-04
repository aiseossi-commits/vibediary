## 1. 태그 택소노미 — #발달 추가

- [x] 1.1 `schema.ts`: `DEFAULT_TAGS`에 `'#발달'` 추가 (5개 → 6개)

## 2. TagsScreen 버그 수정

- [x] 2.1 `TagsScreen.tsx`: `activeChild?.id` 의존성 useEffect 추가 — 변경 시 `setSelectedTagIds([])` + `setFilteredRecords([])` 초기화
- [x] 2.2 `TagsScreen.tsx`: `loadFilteredRecords`에 `activeChild?.id` 전달 — `getRecordsByTags(tagIds, 50, 0, activeChild?.id)` + useCallback 의존성 추가

## 3. AI 분류 규칙 재설계

- [x] 3.1 `aiProcessor.ts`: `buildSystemPrompt`의 태그 나열 방식을 semantic 정의 테이블로 교체 (기본 태그 6개 각 정의 + 적용 기준)
- [x] 3.2 `aiProcessor.ts`: `event_type` 설명 앞에 "event_type은 structured_data 추출 전략이며 태그 선택과 독립적으로 결정" 명시
- [x] 3.3 `aiProcessor.ts`: 커스텀 태그 섹션 분리 — "기록 내용이 태그 이름과 명확히 관련되면 추가 적용, 기본 태그 대체 아님" 설명 추가
- [x] 3.4 `aiProcessor.ts`: JSON 예시에서 developmental 예시 태그를 `#일상` → `#발달`로 수정

## 4. 검증 및 커밋

- [x] 4.1 `npx tsc --noEmit` 통과 확인
- [ ] 4.2 `STATE.md` 업데이트 후 커밋
