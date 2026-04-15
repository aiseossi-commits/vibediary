## Context

현재 App.tsx는 네이티브 스플래시 자동 해제 → `ActivityIndicator` 방식으로 로딩을 처리한다.
iOS에서는 스플래시 시도 중 "기록에 치이지 말고, 그냥 말하세요" 문구가 보였으나 이는 미커밋 실험 코드였고, Android에는 적용되지 않았다.

목표: 양 플랫폼에서 동일한 JS 기반 브랜드 스플래시를 보여주고, 네이티브 스플래시는 즉시 숨긴다.

## Goals / Non-Goals

**Goals:**
- iOS/Android 모두 "기록에 치이지 말고, 그냥 말하세요" 문구 스플래시 표시
- 폰트 로딩 + DB 초기화 완료 시점까지 스플래시 유지
- 완료 후 자연스러운 fade-out 전환
- 네이티브 스플래시(앱 로고)가 보이지 않도록 처리

**Non-Goals:**
- 로티/애니메이션 로고 등 복잡한 인트로 시퀀스
- 네이티브 스플래시 이미지 리소스 수정 (JS로 완전 대체)
- 온보딩과의 연계 (별도 관심사)

## Decisions

### 1. 네이티브 스플래시 즉시 숨기기

`SplashScreen.preventAutoHideAsync()`로 네이티브 스플래시를 잡은 뒤, JS가 마운트되자마자 `SplashScreen.hideAsync()`를 호출한다. 이후 JS 스플래시가 이어받는다.

**대안 검토:**
- 네이티브 스플래시를 텍스트 이미지로 교체 → iOS/Android 해상도·다크모드 대응 복잡, 유지보수 어려움
- 네이티브 스플래시 그대로 노출 후 앱으로 전환 → 로고가 보이는 문제 동일

### 2. JS 스플래시 컴포넌트 분리

`src/components/SplashOverlay.tsx` 신규 파일로 분리한다.
- `Animated.View`로 `opacity` fade-out 구현 (300ms)
- `fontsLoaded && dbReady` 시점에 fade-out 시작, 완료 후 언마운트

**App.tsx에서 직접 구현 대신 컴포넌트 분리 이유:**
App.tsx는 Provider 트리 구성에 집중해야 하며, 애니메이션 로직이 섞이면 가독성이 떨어진다.

### 3. 배경색 통일

스플래시 배경색 `#070D1A` (기존 미커밋 코드와 동일)을 `app.json`의 `android.backgroundColor`에도 적용하여 네이티브→JS 전환 시 색상 점프 방지.

## Risks / Trade-offs

- [네이티브→JS 전환 순간 깜빡임] → `SplashScreen.preventAutoHideAsync()`로 네이티브를 잡고, 첫 번째 JS 렌더에서 즉시 `hideAsync()` 호출하면 사실상 연속으로 보임. JS 스플래시가 네이티브 스플래시와 동일한 배경색이면 시각적 이음새 없음.
- [Android 폰트 로딩 시간] → iOS 대비 느릴 수 있으나 동일 로직(`fontsLoaded && dbReady`)이므로 자연스럽게 처리됨.

## Migration Plan

1. `expo-splash-screen` 패키지 확인 (이미 package.json에 추가됨)
2. `src/components/SplashOverlay.tsx` 생성
3. `App.tsx` 수정 — SplashOverlay 통합
4. `app.json` android splash backgroundColor 설정
5. iOS/Android 시뮬레이터 및 실기기 확인
