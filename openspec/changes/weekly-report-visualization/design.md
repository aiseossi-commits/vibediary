## Context

`absorbService.ts`의 `buildWeeklyOverviewPrompt()`가 주간 요약을 생성하고, 결과는 `synthesis_articles.body`에 마크다운 텍스트로만 저장된다. `SearchScreen`의 항해일지 탭에서 카드 형태로 렌더링한다. 현재 시각적 요약 없이 전체 텍스트만 표시되어 패턴/빈도 정보를 한눈에 파악하기 어렵다.

## Goals / Non-Goals

**Goals:**
- AI가 패턴/빈도 데이터를 구조화된 JSON으로 함께 출력
- 주간 요약 카드 상단에 시각 요약 칩 렌더링 (이모지 + 라벨 + 횟수)
- DB에 visual_data 컬럼 추가 (마이그레이션)

**Non-Goals:**
- 차트 라이브러리 도입 (victory-native 등 외부 의존성 추가 안 함)
- 기존 텍스트 body 제거 또는 변경
- 다른 아티클 타입(developmental_domain 등)에 동일 적용

## Decisions

### 1. AI 출력 포맷: 구분자 방식

AI 응답의 **맨 앞**에 JSON 블록을 `VISUAL_DATA:` 접두어로 추가하고, `---` 구분자 뒤에 기존 마크다운 body가 따라오게 한다.

```
VISUAL_DATA:{"patterns":[{"emoji":"🌅","label":"아침 기상 어려움","count":6},{"emoji":"🚿","label":"샤워 중 배변","count":2}]}
---
## 이번 주 주요 기록
...
```

**이유**: 기존 body 파싱 로직 무변경. 구분자 파싱 실패 시 전체를 body로 fallback하여 안전하다.

**대안 고려**: JSON 래퍼 전체를 AI가 출력하는 방식 → body 파싱이 복잡해지고 JSON 탈출 오류 위험이 있어 기각.

### 2. DB 컬럼 추가: visual_data TEXT NULL

`synthesis_articles` 테이블에 `visual_data TEXT` 컬럼을 ALTER TABLE로 추가 (NULL 허용). 기존 레코드는 NULL 유지. `synthesisDao`의 mapRow, upsert 함수 수정.

**이유**: schema 버전 관리와 일관성. 기존 데이터를 건드리지 않는 최소 변경.

### 3. 렌더링: 칩 그리드 (라이브러리 없음)

`View` + `Text`로 수평 칩 나열. visual_data가 없거나 파싱 실패하면 칩 섹션 숨김.

```
[🌅 아침 기상 어려움 6회]  [🚿 샤워 중 배변 2회]
[😮‍💨 기침 3회]            [😴 민감한 수면 3회]
```

**이유**: 외부 의존성 없음, 오프라인 동작 보장.

### 4. maxOutputTokens 조정

주간 요약 AI 호출(`callAbsorbAI`)의 maxOutputTokens를 현재 값에서 +100 증가 (JSON 블록 추가분 보정).

## Risks / Trade-offs

- **AI가 포맷을 어길 수 있음** → `VISUAL_DATA:` 파싱 실패 시 전체 텍스트를 body로 사용하는 fallback 적용. visual_data는 null.
- **기존 저장된 weekly_overview 레코드는 visual_data = NULL** → 칩 섹션 숨김으로 처리. 재생성 시 자동 반영.
- **토큰 소폭 증가** → JSON 블록 약 100~150 토큰 추가 예상.

## Migration Plan

1. `database.ts` DB 마이그레이션 버전 증가, ALTER TABLE 실행
2. `synthesisDao.ts` mapRow + upsert에 visual_data 추가
3. `types/record.ts` SynthesisArticle 타입에 visualData 추가
4. `absorbService.ts` 프롬프트 수정 + 파싱 로직 추가
5. `SearchScreen.tsx` 주간 요약 카드에 칩 렌더링 추가
