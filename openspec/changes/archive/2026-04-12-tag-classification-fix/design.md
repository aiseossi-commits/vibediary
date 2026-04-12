## Context

TagsScreen은 `activeChild` 기반으로 태그 목록을 조회하지만, 아이 전환 시 `selectedTagIds`와 `filteredRecords` 상태가 초기화되지 않아 이전 아이 기록이 잔류한다. 또한 `getRecordsByTags` 호출 시 `childId`를 전달하지 않아 안전망이 없다.

`schema.ts`의 `DEFAULT_TAGS`에 `#발달`이 없어 AI가 `event_type: developmental`로 분류한 기록이 `#일상` 태그에 묻힌다. `aiProcessor.ts`의 `buildSystemPrompt`는 태그를 이름만 나열하므로 AI가 semantic 정의 없이 추론하며, `event_type`과 태그를 암묵적으로 1:1 매핑한다.

## Goals / Non-Goals

**Goals:**
- 아이 전환 시 TagsScreen 상태 완전 초기화
- `getRecordsByTags`에 childId 안전망 추가
- `#발달` 기본 태그 도입 및 신규 아이 자동 시드
- AI 태그 분류 규칙 명확화 (semantic 정의 + event_type 독립성)
- 커스텀 태그 AI 적용 계약 명확화

**Non-Goals:**
- structured_data 스키마 온톨로지 정렬 (AI 항해사 연동 시 별도)
- v2 하위 태그 계층 UI 노출
- 기존 기록의 태그 소급 재분류

## Decisions

**D1. 상태 초기화 위치: activeChild?.id를 의존성으로 하는 별도 useEffect**

`loadTags`의 useEffect와 분리하여 `activeChild?.id`가 바뀔 때 선택 상태만 초기화한다.

```typescript
useEffect(() => {
  setSelectedTagIds([]);
  setFilteredRecords([]);
}, [activeChild?.id]);
```

`loadTags`와 합치면 loadTags가 실행되기 전 상태가 잠깐 불일치하는 구간이 생길 수 있어 분리한다.

**D2. getRecordsByTags childId 전달**

`loadFilteredRecords` 내부에서 `activeChild?.id`를 클로저로 직접 읽는 대신, `useCallback` 의존성에 포함시켜 전달한다.

```typescript
const loadFilteredRecords = useCallback(async (tagIds: number[]) => {
  const records = await getRecordsByTags(tagIds, 50, 0, activeChild?.id);
  ...
}, [activeChild?.id]);
```

**D3. AI 프롬프트 태그 정의: 이름 나열 → 정의 테이블 방식**

각 태그에 포함/제외 기준을 명시하고, event_type과 태그의 독립성을 명시한다.

```
기본 태그 및 적용 기준:
- #발달: 언어, 운동, 인지, 사회성 등 발달 영역 관찰 또는 성장 이정표
- #행동: 텐트럼, 거부, 자해, 공격, 상동행동 등 도전적 행동
- #치료: 언어치료, 작업치료, ABA 등 치료 세션 기록
- #의료: 투약, 병원 방문, 처치 등 의료 행위 (단순 체온 관찰/신체 증상만 있으면 제외)
- #투약: 약 복용 기록 (의약품명 또는 용량 포함 시)
- #일상: 위에 해당하지 않는 일상 케어

커스텀 태그 (사용자 정의):
- 기록 내용이 태그 이름과 명확히 관련되면 추가 적용
- 기본 태그를 대체하지 않음, 추가만 함
```

event_type은 structured_data 추출 전략임을 주석으로 명시하여 AI가 태그 선택과 혼동하지 않도록 한다.

**D4. DEFAULT_TAGS 변경만으로 충분**

`childrenDao.createChild`가 `DEFAULT_TAGS`를 for-loop으로 시드하므로 `#발달` 추가 시 신규 아이에 자동 반영된다. 기존 아이는 DB 마이그레이션 없이 `TagsScreen` 진입 시 `getTagsWithCount`가 해당 아이의 태그만 반환하므로 `#발달`이 없어도 오류 없음. 기존 아이에게 `#발달` 소급 추가는 Out of Scope.

## Risks / Trade-offs

**[AI 분류 정확도 일시 변화]** 프롬프트 변경으로 신규 기록의 태그 패턴이 바뀜
→ 기존 기록 불변. 새 기록부터 적용. `#발달` 추가로 발달 기록 가시성 향상이 기대 효과.

**[기존 아이에 #발달 없음]** 기존 아이는 `#발달` 태그가 DB에 없어 AI가 붙여도 TagsScreen에 안 보일 수 있음
→ `setTagsForRecord` → `createTag('#발달', childId)` 호출 시 per-child 태그가 자동 생성됨. 문제 없음.

**[maxOutputTokens 700 여유]** 프롬프트 시스템 instruction 길이 증가
→ 입력 토큰 증가는 출력 토큰에 영향 없음. 현재 700 출력 토큰 한도는 유지.
