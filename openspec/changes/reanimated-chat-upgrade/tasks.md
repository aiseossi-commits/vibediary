## 1. Reanimated 준비

- [x] 1.1 `react-native-reanimated` import 가능 여부 확인 (Expo SDK 55 내장)
- [x] 1.2 `babel.config.js`에 `react-native-reanimated/plugin` 추가

## 2. OrganicBlob Reanimated 마이그레이션

- [x] 2.1 `RecordingScreen.tsx`의 OrganicBlob을 `useSharedValue` + `useAnimatedStyle`로 재작성
- [x] 2.2 borderRadius 4개를 `withRepeat(withSequence(...))` 패턴으로 교체 (`useNativeDriver: false` 제거)
- [x] 2.3 scale 애니메이션을 `useSharedValue` + `withSpring`으로 교체
- [x] 2.4 시각적 동일성 확인 (oscillation 범위, duration 동일하게 유지)
- [x] 2.5 `npx tsc --noEmit` 통과 확인

## 3. 토큰 효율화 — 컨텍스트 압축

- [x] 3.1 `searchPipeline.ts`의 `searchRecords`에서 vectorSearch 결과에 score 포함하여 반환
- [x] 3.2 `generateAnswer`에 `scoredRecords: { record: RecordWithTags; score: number }[]` 파라미터 추가
- [x] 3.3 context 구성 로직에서 `score >= 0.6`이면 full 포맷, 미만이면 summary만 포함
- [x] 3.4 fallback 기록(score 없음)은 summary만 포함 처리
- [x] 3.5 `npx tsc --noEmit` 통과 확인

## 4. ChatMessage 타입 정의

- [x] 4.1 `src/types/record.ts`에 `ChatMessage` 타입 추가 (`id`, `role: 'user' | 'assistant'`, `text`, `sourceRecords?`, `createdAt`)
- [x] 4.2 `SearchResult` 타입에 `score` 필드 추가 (선택적)

## 5. AI 등대 채팅 버블 UI 구현

- [x] 5.1 `SearchScreen.tsx`의 state를 `query` + `messages: ChatMessage[]` + `isSearching`으로 재구성
- [x] 5.2 `UserBubble` 컴포넌트 구현 (오른쪽 정렬, primary 배경, Pretendard)
- [x] 5.3 `AssistantBubble` 컴포넌트 구현 (왼쪽 정렬, surface 배경, Reanimated FadeInDown)
- [x] 5.4 근거 기록 접기/펼치기 토글 구현 (기본 접힘, "근거 N건" 버튼)
- [x] 5.5 `FlatList`로 메시지 목록 렌더링, 새 메시지 도착 시 자동 스크롤
- [x] 5.6 슬라이딩 윈도우: `handleSearch`에서 최근 4개 메시지만 LLM 컨텍스트로 전달
- [x] 5.7 빈 상태(messages 없음) 화면 — 기존 등대 아이콘 + 안내 문구 유지
- [x] 5.8 다크/라이트 테마 양쪽 확인

## 6. 마무리

- [x] 6.1 `npx tsc --noEmit` 최종 통과
- [x] 6.2 `STATE.md` 업데이트
- [x] 6.3 커밋 (STATE.md 포함)
