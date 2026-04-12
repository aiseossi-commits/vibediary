## 1. DB 마이그레이션

- [x] 1.1 `src/db/schema.ts` — `wiki_pages` 테이블에 `visual_data TEXT` 컬럼 추가 (synthesis_articles → wiki_pages로 전환됨)
- [x] 1.2 `src/db/database.ts` — DB 마이그레이션 버전 증가, ALTER TABLE로 visual_data 컬럼 추가

## 2. 타입 및 DAO 수정

- [x] 2.1 `src/types/record.ts` — `WikiPage` 타입에 `visualData?: string | null` 필드 추가
- [x] 2.2 `src/db/wikiDao.ts` — `mapRow()`에 `visualData: row.visual_data ?? null` 추가 (synthesisDao → wikiDao 전환됨)
- [x] 2.3 `src/db/wikiDao.ts` — `upsertWikiPage()` 파라미터에 `visualData?: string | null` 추가 및 INSERT/UPDATE 쿼리 반영

## 3. AI 프롬프트 수정 및 파싱

- [x] 3.1 `src/services/absorbService.ts` — `buildWeeklyOverviewPrompt()`에 VISUAL_DATA JSON 출력 지시 추가
- [x] 3.2 `src/services/absorbService.ts` — `runAbsorb()` weekly_overview 처리 블록에 `parseVisualData()` 헬퍼 호출 추가 (VISUAL_DATA: 접두어 파싱, fallback 처리)
- [x] 3.3 `src/services/absorbService.ts` — `upsertSynthesisArticle()` 호출에 `visualData` 전달

## 4. UI 렌더링

- [x] 4.1 `src/screens/SearchScreen.tsx` — 주간 요약 카드에 `VisualPatternChips` 인라인 컴포넌트 추가 (visual_data 파싱 → 칩 렌더링, try-catch)
- [x] 4.2 칩 스타일: `theme.ts`의 SPACING, BORDER_RADIUS, `useTheme()` colors 사용, 하드코딩 금지
- [x] 4.3 visual_data가 없거나 patterns 배열이 비어있으면 칩 섹션 숨김 처리

## 5. 검증

- [x] 5.1 `npx tsc --noEmit` 타입 에러 없음 확인
- [ ] 5.2 실기기에서 absorb 실행 후 칩 렌더링 확인
- [ ] 5.3 기존 weekly_overview (visual_data=NULL) 카드 정상 표시 확인
