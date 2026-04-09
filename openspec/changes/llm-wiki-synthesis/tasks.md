## 1. 타입 및 DB 스키마

- [x] 1.1 `src/types/record.ts`에 `WikiPage`, `WikiPageType`, `LintIssue`, `LintResult` 타입 추가
- [x] 1.2 `src/db/schema.ts`에 `CREATE_WIKI_PAGES_TABLE`, `CREATE_WIKI_PAGES_INDEXES` 상수 추가 (synthesis_articles 상수는 유지)
- [x] 1.3 `src/db/database.ts`에 v11→v12 마이그레이션 작성: wiki_pages 테이블 생성 + synthesis_articles → wiki_pages 변환 INSERT (slug 매핑 적용)

## 2. wikiDao

- [x] 2.1 `src/db/wikiDao.ts` 신규 작성: `getWikiPages`, `getWikiPageBySlug`, `upsertWikiPage`, `deleteWikiPage` 구현
- [x] 2.2 `getLastAbsorbTime`, `insertAbsorbLog`는 synthesisDao에서 wikiDao로 이전 (absorb_log 테이블은 그대로 사용)

## 3. absorbService 교체

- [x] 3.1 `WIKI_SCHEMA` 상수 정의 (slug 체계, 타입별 작성 규칙, entity 생성 조건 3회 이상)
- [x] 3.2 absorb 프롬프트 빌더 교체: 신규 기록 + 기존 wiki pages 전체를 인풋으로, JSON 멀티페이지 출력 요청
- [x] 3.3 AI 응답 JSON 파서 구현: `{ pages: [...], index: string }` 파싱, 실패 시 fallback 분기
- [x] 3.4 pages 배열 순회하며 `wikiDao.upsertWikiPage` 호출 (각 페이지 독립 try-catch)
- [x] 3.5 wiki-index 페이지 upsert (index 필드 → slug `wiki-index`)
- [x] 3.6 타임아웃 30초 → 45초로 상향
- [x] 3.7 fallback 경로: JSON 파싱 실패 시 overview/weekly + timeline/milestones 최소 생성

## 4. searchPipeline 전환

- [x] 4.1 `getSynthesisArticles` import → `getWikiPages` import로 교체
- [x] 4.2 `formatSynthesisArticle` → `formatWikiPage` 함수로 교체 (`[{title}]\n{body}` 형식)
- [x] 4.3 wiki-index 페이지를 다른 페이지보다 먼저 배치하는 정렬 로직 추가
- [x] 4.4 시스템 프롬프트의 wiki 존재 시 안내 문구 업데이트 (`<wiki>` 섹션 참조 안내)
- [x] 4.5 컨텍스트 구성 변경: `<wiki>` + `<records>` 구조로 래핑

## 5. wiki-lint 서비스

- [x] 5.1 `src/services/wikiLintService.ts` 신규 작성: `runLint(childId)` 구현
- [x] 5.2 stale 감지 로직: updated_at 기준 30일 초과 페이지 → issues 추가 (AI 호출 없이 클라이언트 판단)
- [x] 5.3 orphan 감지 로직: wiki-index body에 없는 slug → issues 추가
- [x] 5.4 AI 호출로 content gaps / missing cross-refs 감지 후 suggestions 반환

## 6. SearchScreen UI 연결

- [x] 6.1 `getSynthesisArticles` → `getWikiPages` 호출로 교체
- [x] 6.2 synthesis 아티클 렌더링 → wiki pages 렌더링으로 교체 (타입 라벨 매핑 업데이트)
- [x] 6.3 Lint 실행 버튼 및 결과 표시 UI 추가 (LintResult.issues 목록)

## 7. backupService 업데이트

- [x] 7.1 `backupService.ts`에 wiki_pages 백업 쿼리 추가
- [x] 7.2 복원 로직에 wiki_pages INSERT 추가
- [x] 7.3 기존 `synthesisArticles` 복원 로직은 하위호환을 위해 유지 (synthesis_articles 테이블 v12에서 존재하므로)

## 8. 정리 및 검증

- [ ] 8.1 `npx tsc --noEmit` 통과 확인 — 특히 synthesisDao 참조 제거된 파일 전수 점검
- [ ] 8.2 synthesisDao.ts의 import가 남은 파일이 없는지 grep으로 확인
- [ ] 8.3 STATE.md 업데이트
