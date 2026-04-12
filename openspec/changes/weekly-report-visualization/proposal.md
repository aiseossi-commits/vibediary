## Why

항해일지의 주간 요약이 긴 텍스트로만 제공되어 한눈에 파악하기 어렵다. 특히 "패턴 및 빈도" 섹션의 횟수 데이터를 시각적으로 보여주면 돌봄 가족이 이번 주 주요 패턴을 즉시 인식할 수 있다.

## What Changes

- AI 주간 리포트 프롬프트에 패턴/빈도 데이터를 구조화된 JSON으로 함께 출력하도록 수정
- 주간 요약 카드 상단에 패턴 빈도 시각 요약 칩(이모지 + 횟수) 렌더링
- search_logs 테이블에 `visual_data` JSON 컬럼 추가 (DB 마이그레이션)

## Capabilities

### New Capabilities
- `weekly-report-visual-summary`: 주간 리포트 카드 상단에 패턴 빈도 시각 요약(칩 형태) 표시

### Modified Capabilities
- `voyage-log`: 주간 요약 카드 렌더링에 visual_data 칩 섹션 추가

## Impact

- `src/services/aiProcessor.ts` — 주간 리포트 프롬프트 수정, visual_data JSON 파싱 추가
- `src/db/schema.ts` — search_logs 테이블에 visual_data TEXT 컬럼 추가
- `src/db/recordsDao.ts` (또는 searchLogsDao) — visual_data 저장/조회
- `src/screens/SearchScreen.tsx` — 주간 요약 카드 UI에 시각 요약 칩 렌더링
- 외부 의존성 없음 (차트 라이브러리 불필요, 칩 형태로 구현)
