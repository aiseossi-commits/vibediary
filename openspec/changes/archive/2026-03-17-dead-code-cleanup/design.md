## Context

탐색 결과 5가지 dead code가 확인됨:
1. `STTReviewScreen.tsx` — STT 결과 리뷰 화면. 아이 이름 힌트 기능 제거 이전 기획이었던 것으로 추정. 네비게이터에 등록되지 않았고 import도 없음.
2. `getRecordsByTagNames()` — 태그 이름 문자열 배열로 기록 조회. ID 기반인 `getRecordsByTags()`만 실제 사용되고 이 함수는 쓰이지 않음.
3. `RecordTag` interface — record_id/tag_id 조인 타입. `tagsDao`의 `getAllRecordTags()`는 인라인 타입을 직접 반환하므로 이 interface는 불필요.
4. `COLORS` export — `DARK_COLORS`의 별칭. "하위 호환용"으로 남겨뒀으나 import 없음.
5. `{subjectLine}` 플레이스홀더 — AI 프롬프트 템플릿에 남은 잔재. 아이 이름 힌트를 AI에 넘기는 기능이 제거될 때 함께 제거되지 않음. 항상 `''`로 치환됨.

## Goals / Non-Goals

**Goals:**
- 참조 없는 코드 완전 삭제 (주석 처리 금지)
- 삭제 후 `npx tsc --noEmit` 통과
- 동작 변경 없음

**Non-Goals:**
- 리팩터링이나 기능 개선
- queries.ts 내 다른 함수 정리
- 임시 로그나 TODO 주석 정리

## Decisions

**파일 삭제 vs 주석 처리**: 완전 삭제. CLAUDE.md 원칙("코드 제거 시 완전 삭제")에 따름.

**`USER_PROMPT_TEMPLATE` 처리**: `{subjectLine}\n` 줄을 제거하고 템플릿을 단순화. 빈 줄만 남기므로 가독성도 향상됨.

**`COLORS` 제거 타이밍**: import 없음이 확인되었으므로 즉시 제거. 향후 추가될 가능성 없음 — `useTheme()` 패턴이 표준화되어 있음.

## Risks / Trade-offs

- [Risk] 외부 파일(스크립트, 문서 등)에서 `COLORS`를 참조할 경우 런타임 에러 → `src/` 외부 `.ts/.tsx` 파일 검색으로 사전 확인
- [Risk] TypeScript가 감지 못한 dynamic import 존재 → 제거 후 tsc 통과로 충분히 검증됨
