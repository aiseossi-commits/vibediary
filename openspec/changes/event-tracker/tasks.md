## 1. DB 스키마 (v11)

- [x] 1.1 schema.ts에 CREATE_ACTIVE_EVENTS_TABLE 추가
- [x] 1.2 database.ts v10→v11 마이그레이션 블록 추가 (CREATE TABLE IF NOT EXISTS)
- [x] 1.3 신규 설치 경로에도 active_events 테이블 생성 포함 확인

## 2. DAO

- [x] 2.1 src/db/activeEventsDao.ts 생성: getActiveEvents(childId), createEvent, endEvent, getEventsByDateRange
- [x] 2.2 src/db/index.ts에 activeEventsDao export 추가

## 3. 타입 및 상수

- [x] 3.1 src/types/record.ts에 ActiveEvent 타입 추가 (activeEventsDao.ts에 정의)
- [x] 3.2 src/constants/events.ts 생성: DEFAULT_EVENT_NAMES 배열, formatEventDuration 유틸 함수 (일/주/월 변환)

## 4. 이벤트 관리 모달 컴포넌트

- [x] 4.1 src/components/EventTrackerModal.tsx 생성
  - 활성 이벤트 목록 (종료 버튼 포함)
  - 새 이벤트 추가: 기본 목록 칩 + 직접 입력
  - 시작일 선택 (TimePickerModal 패턴 참고)
  - 종료일 선택 ("오늘" / 날짜 선택)

## 5. 홈화면 뱃지 통합

- [x] 5.1 HomeScreen.tsx에 activeEvents state 추가, useFocusEffect로 로드
- [x] 5.2 홈화면 하단에 이벤트 뱃지 행 추가 (수평 ScrollView, "이름 · X일째")
- [x] 5.3 "+" 버튼 및 뱃지 탭 → EventTrackerModal 오픈
- [x] 5.4 아이 전환 시 activeEvents 재로드

## 6. 캘린더 기간 표시

- [x] 6.1 CalendarScreen.tsx에 activeEvents 로드 (월 범위 기준)
- [x] 6.2 날짜→이벤트 매핑 useMemo로 캐싱
- [x] 6.3 날짜 셀 하단에 이벤트 dot 인디케이터 추가 (최대 3개, 초과시 "…")

## 7. 타입 체크 및 검증

- [x] 7.1 npx tsc --noEmit 통과 확인
- [ ] 7.2 신규 설치 / 기존 설치(마이그레이션) 시나리오 동작 확인
