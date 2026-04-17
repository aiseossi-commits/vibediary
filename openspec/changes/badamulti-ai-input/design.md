## Context

현재 AI 입력 모드(`parseMultiEntries`)는 날짜별 분리까지 구현됨. 반환 타입은 `{date, text}[]`. 처리 흐름은 HomeScreen의 `processInlineRecording`에서 단순 루프로 각 항목을 `processFromText(uri, text, createdAt, activeChild.id)`로 처리.

확장할 4가지:
1. 요일/범위 파싱 — 프롬프트 보강만으로 해결 가능
2. 복수 아이 라우팅 — `parseMultiEntries` 반환에 `childName?` 추가, HomeScreen에서 name→id 매핑
3. 이벤트 자동 등록 — 반환에 `eventHint?` 추가, `createEvent` 재사용
4. 발견성 — 버튼 하단 힌트 레이블

## Goals / Non-Goals

**Goals:**
- `parseMultiEntries` 단일 AI 호출로 날짜·아이·이벤트 의도를 한 번에 추출
- 기존 `createEvent`, `processFromText` 재사용 — 새 인프라 없음
- activeChild 이외의 아이 이름이 발화에 없으면 기존 동작 그대로
- 이벤트 자동 등록은 "시작" 의도만 처리 (종료는 유저가 직접)

**Non-Goals:**
- 이벤트 종료 자동 감지 ("어제부터 오늘까지 열 났어" → endedAt 자동 설정)
- 아이 신규 생성 (이름이 기존 children에 없으면 무시, activeChild로 fallback)
- STT 정확도 개선 (발음 변형 이름 매칭 등)

## Decisions

**D1. parseMultiEntries 반환 타입 확장 vs 별도 파싱 함수**

`{date, text, childName?, eventHint?}[]`로 확장 선택.
한 번의 AI 호출로 날짜·아이·이벤트를 동시 추출 → 토큰·지연 절약.
별도 함수로 쪼개면 호출이 3번 필요하고 문맥 손실 발생.

**D2. childName 매칭 전략**

정확히 일치하는 `children` 배열 항목 우선, 없으면 `includes` 부분 일치.
매칭 실패 시 `activeChild`로 fallback — 조용히 처리, Alert 없음.
이유: 발화에서 이름이 약간 달라도(수진 vs 이수진) 저장은 되어야 함.

**D3. 이벤트 등록 시점**

`eventHint` 필드에 이벤트 이름만 반환 (예: "발열", "발작"). 시작 시각은 해당 entry의 `date`로 설정.
즉, "어제 저녁부터 열 났어" → eventHint: "발열", date: 어제 → `createEvent(childId, "발열", 어제 timestamp)`.
중복 방지: 같은 이름의 이벤트가 이미 활성 상태면 등록 건너뜀.

**D4. 요일 파싱 책임**

클라이언트 계산 없이 AI에 위임. 시스템 프롬프트에 오늘 날짜 + 오늘 요일 전달 → AI가 "이번주 월수금" → 3개 날짜 계산.
이유: 요일 계산 로직을 클라이언트에 두면 연말/연초 엣지케이스 처리가 복잡해짐.

## Risks / Trade-offs

**[아이 이름 오인식]** STT가 이름을 잘못 전사하면 엉뚱한 아이 레코드로 저장됨  
→ Mitigation: 매칭 실패 시 activeChild fallback + 저장 후 결과 텍스트에 "누구의 기록으로 저장됐는지" 표시

**[이벤트 중복]** 같은 날 같은 이벤트를 두 번 말하면 2개 생성될 수 있음  
→ Mitigation: `getActiveEvents` 조회 후 동일 이름 존재 시 skip

**[요일 계산 오류]** AI가 "이번주 월요일"을 지난주로 오판할 수 있음 (월요일 이후에 말하는 경우)  
→ Mitigation: 프롬프트에 "오늘 기준 가장 최근 지난 날짜" 규칙 명시. 미래 날짜는 생성하지 않도록 제약.

**[AI 호출 실패 시 degradation]** parseMultiEntries 실패 → 오늘 날짜 단일 항목 fallback (기존 동작)  
→ 이미 구현됨. 확장 필드(childName, eventHint) 파싱 실패 시도 fallback으로 정상 저장.

## Migration Plan

배포 전 별도 마이그레이션 없음. parseMultiEntries 반환 타입 확장은 하위 호환 (옵셔널 필드 추가).
기존 단일 항목 fallback 경로 유지.
