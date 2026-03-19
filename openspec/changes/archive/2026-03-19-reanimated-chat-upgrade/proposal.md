## Why

현재 OrganicBlob 애니메이션은 `useNativeDriver: false`로 JS 스레드에서 실행되어 녹음 중 성능 저하 위험이 있고, AI 등대는 단발 Q&A 구조라 작은 화면에서 답변과 근거 기록을 한 번에 보여주기 어렵다. 또한 벡터 검색 컨텍스트가 유사도 무관하게 동일 포맷으로 전송되어 토큰이 낭비된다.

## What Changes

- **OrganicBlob** `Animated` API → Reanimated worklet 마이그레이션 (borderRadius 4개를 UI 스레드에서 실행)
- **AI 등대 UI** 단발 Q&A → 커스텀 채팅 버블 레이아웃 (gifted-chat 미사용, DIY ~80줄)
- **대화 슬라이딩 윈도우** 최근 2교환(질문+답변)만 유지, 히스토리 폭증 방지
- **컨텍스트 압축** 유사도 0.6↑ 기록은 summary + structuredData 전송, 미만은 summary만 전송

## Capabilities

### New Capabilities

- `reanimated-blob`: OrganicBlob을 Reanimated worklet 기반으로 구현 (UI 스레드 60fps)
- `chat-bubble-ui`: AI 등대 채팅 버블 UI 및 슬라이딩 윈도우 대화 관리
- `token-efficient-context`: 유사도 점수 기반 컨텍스트 압축 전략

### Modified Capabilities

- `search-pattern-analysis`: 컨텍스트 포맷 변경 (유사도 기반 조건부 structuredData 포함)

## Impact

- `src/screens/RecordingScreen.tsx` — OrganicBlob 컴포넌트 재작성
- `src/screens/SearchScreen.tsx` — 채팅 버블 UI로 전면 교체
- `src/services/searchPipeline.ts` — generateAnswer 컨텍스트 구성 로직 수정
- **신규 의존성**: `react-native-reanimated` (Expo SDK 55에 포함, 별도 설치 불필요)
