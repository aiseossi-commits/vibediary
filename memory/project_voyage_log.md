---
name: 항해일지 기능
description: AI 등대 검색 결과를 카드로 저장·조회·삭제하는 항해일지 기능 구현 상태
type: project
---

AI 등대(SearchScreen)에서 검색 답변을 저장하는 항해일지 기능 구현 완료 (2026-03-18).

**구현 내용:**
- `src/db/schema.ts`: `search_logs` 테이블 추가
- `src/db/searchLogsDao.ts`: createSearchLog / getSearchLogs / deleteSearchLog
- `src/types/record.ts`: SearchLog 타입 추가
- `SearchScreen.tsx`: 헤더 우상단 항해일지 토글 버튼, 저장 버튼, 항해일지 뷰

**OpenSpec 변경:** `openspec/changes/voyage-log/` — 4/4 아티팩트 완료, 코드 구현 완료. tasks 6.2/6.3 수동 테스트 후 `/opsx:archive voyage-log` 필요

**후속 버그 수정 완료:**
- 항해일지 모드에서 하단 입력창 숨김
- SearchScreen/CalendarScreen SafeAreaView bottom 추가 (Android)
- searchPipeline context 날짜 YYYY-MM-DD 포함 (AI 연도 오추론 수정)
- 카드 날짜 형식 YYYY.M.D

**Why:** 기록의 휘발 방지 + 인사이트 재참조

**How to apply:** 수동 테스트 후 아카이브. 이후 스킬화된 3원칙 체크리스트 적용 사례로 참조.
