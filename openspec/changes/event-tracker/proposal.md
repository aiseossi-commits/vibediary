## Why

돌봄 가족은 아이의 증상·상태(변비, 감기, 상동행동 등)가 언제 시작됐고 얼마나 지속됐는지 파악하기 어렵다. 캘린더나 음성 기록만으로는 기간 추적이 직관적이지 않아, 병원 상담 시 "몇 일째예요?"라는 질문에 바로 답하지 못하는 상황이 반복된다.

## What Changes

- 홈화면에 활성 이벤트 뱃지 추가: "감기 3일째", "변비 8일째" 형태로 표시
- 이벤트 추적 화면(EventTrackerScreen 또는 모달): 기본 이벤트 목록 + 커스텀 이벤트 추가
- 이벤트 활성화: 시작일 지정 (기본값 오늘) → 홈화면에 즉시 표시
- 이벤트 종료: 수동 종료 (종료일 지정 또는 지금 종료)
- 기간 단위 자동변환: 7일 미만 → "X일째" / 28일 미만 → "X주째" / 이상 → "X개월째"
- 여러 이벤트 동시 활성 가능
- 캘린더에 이벤트 활성 기간 색상 블록 표시
- DB v11: active_events 테이블 추가

## Capabilities

### New Capabilities
- `event-tracker`: 기간 추적 이벤트 생성·활성화·종료, 홈화면 뱃지, 캘린더 기간 표시

### Modified Capabilities
- `home-bottom-layout`: 홈화면 하단에 활성 이벤트 뱃지 섹션 추가

## Impact

- **새 파일**: `src/db/activeEventsDao.ts`, `src/screens/EventTrackerScreen.tsx` (또는 홈화면 내 모달)
- **수정 파일**: `src/db/schema.ts` (DB v11), `src/screens/HomeScreen.tsx` (뱃지 표시), `src/screens/CalendarScreen.tsx` (기간 블록), `src/navigation/AppNavigator.tsx` (진입점)
- **의존성 추가 없음** (expo-sqlite 기존 사용)
