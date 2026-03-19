## Context

현재 RecordingScreen의 OrganicBlob은 RN 기본 `Animated` API를 사용하며, borderRadius 4개 루프가 `useNativeDriver: false`로 JS 스레드에서 실행된다. scale 애니메이션만 `useNativeDriver: true`를 사용한다.

AI 등대(SearchScreen)는 단발 Q&A 구조로 질문 → 답변 + 근거 기록 리스트를 한 화면에 표시한다. 대화 히스토리가 없어 후속 질문이 불가능하고, 작은 화면에서 답변과 기록 목록이 함께 스크롤되어 정보 구조가 복잡하다.

vectorSearch는 유사도 점수를 계산하지만, generateAnswer의 컨텍스트 구성은 유사도와 무관하게 모든 기록을 동일 포맷(summary + structuredData)으로 전송한다.

Reanimated는 Expo SDK 55에 이미 포함되어 있어 별도 설치 없이 `import`만으로 사용 가능하다.

## Goals / Non-Goals

**Goals:**
- OrganicBlob의 borderRadius 애니메이션을 UI 스레드로 이전해 JS 부하 제거
- AI 등대를 대화형 버블 UI로 전환 (외부 채팅 라이브러리 미사용)
- 슬라이딩 윈도우(최근 2교환)로 대화 맥락 유지하면서 토큰 폭증 방지
- 유사도 기반 컨텍스트 압축으로 토큰 효율 개선

**Non-Goals:**
- gifted-chat / flyer-chat 등 외부 채팅 라이브러리 도입
- 대화 히스토리 영구 저장 (세션 내 메모리만 유지)
- WatermelonDB 또는 react-native-skia 도입
- RecordingScreen 외 다른 Animated 사용처 마이그레이션

## Decisions

### 1. Reanimated API 선택: `useSharedValue` + `useAnimatedStyle`

**결정**: OrganicBlob의 borderRadius 4개를 `useSharedValue` + `withRepeat(withSequence(...))` 패턴으로 재작성.

**이유**: `useNativeDriver: false`는 JS 스레드에서 레이아웃 프로퍼티를 직접 변경한다. Reanimated의 worklet은 UI 스레드에서 실행되므로 STT 처리, DB 쿼리 등 JS 부하와 완전히 분리된다.

**대안 고려**: Skia Canvas 기반 blob — 의존성(react-native-skia) 추가가 필요해 보류.

### 2. 채팅 버블 UI: 외부 라이브러리 미사용, DIY

**결정**: `FlatList` + 좌우 정렬 말풍선 컴포넌트를 직접 구현. Reanimated `FadeInDown`으로 메시지 등장 애니메이션 적용.

**이유**: gifted-chat은 내부 스타일 시스템이 Pretendard 폰트, `useTheme()` 색상과 충돌한다. 필요한 기능(버블, 스크롤, 입력창)은 80줄 내외로 직접 구현 가능하며, 의존성 추가 없이 Reanimated만으로 해결된다.

**구조**:
```
SearchScreen
  ├── FlatList (messages: ChatMessage[])
  │     ├── UserBubble (오른쪽 정렬, primary 배경)
  │     └── AssistantBubble (왼쪽 정렬, surface 배경)
  │           └── SourceRecords (접기/펼치기, 기본 접힘)
  └── InputArea (기존 유지)
```

### 3. 슬라이딩 윈도우: 최근 2교환

**결정**: `messages` 배열에서 LLM 호출 시 최근 4개 메시지(사용자 2 + 어시스턴트 2)만 컨텍스트로 전달.

**이유**: 돌봄 기록 조회는 대부분 독립적인 질문 패턴이다. 3교환 이상 유지 시 토큰이 선형으로 증가하며, 2교환으로도 "방금 말한 것에 대해 더 알려줘" 수준의 후속 질문을 처리할 수 있다.

### 4. 컨텍스트 압축: 유사도 임계값 0.6

**결정**: `score >= 0.6` 기록은 `summary + structuredData` 전송, 미만은 `summary`만 전송.

**이유**: 0.6 이상은 질문과 직접 관련된 기록이므로 상세 데이터가 답변 품질에 기여한다. 미만은 주변 맥락 역할만 하므로 summary로 충분하다. 현재 compact 포맷 대비 평균 20~30% 토큰 절감 예상.

## Risks / Trade-offs

- **Reanimated 마이그레이션**: `withRepeat`/`withSequence` API가 기존 `Animated.loop`과 다름 → 시각적 결과 동일성 테스트 필요
- **슬라이딩 윈도우**: 오래된 대화 맥락 손실 → 돌봄 기록 특성상 질문이 독립적이어서 실제 문제 가능성 낮음
- **DIY 버블 UI**: 외부 라이브러리 없으므로 엣지 케이스(긴 텍스트, 한국어 줄바꿈) 직접 처리 필요
- **유사도 임계값 0.6**: 임계값이 너무 높으면 structuredData 활용이 줄어들 수 있음 → 실사용 후 조정 가능하도록 상수로 분리

## Migration Plan

1. Reanimated OrganicBlob 재작성 → 시각적 동일성 확인
2. SearchScreen 채팅 버블 UI 구현 (기존 단발 Q&A 완전 교체)
3. generateAnswer 컨텍스트 압축 로직 수정
4. TypeScript 타입 체크 통과 확인
5. 두 화면 모두 다크/라이트 테마 확인

롤백: gitnew 브랜치에서 작업하므로 main은 영향 없음.
