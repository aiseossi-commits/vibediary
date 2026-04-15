## 1. 패키지 및 설정

- [x] 1.1 `expo-splash-screen`이 package.json에 등록되었는지 확인 (이미 추가됨)
- [x] 1.2 `app.json`의 `android.backgroundColor`를 `#070D1A`로 설정 (네이티브→JS 전환 시 색상 점프 방지)

## 2. SplashOverlay 컴포넌트 구현

- [x] 2.1 `src/components/SplashOverlay.tsx` 파일 생성
- [x] 2.2 `Animated.Value` opacity로 fade-out 애니메이션(300ms) 구현
- [x] 2.3 `fontsLoaded && dbReady` props를 받아 완료 시 fade-out 트리거
- [x] 2.4 배경색 `#070D1A`, 텍스트 색 `#F1F5F9`, 두 줄 레이아웃 스타일 적용

## 3. App.tsx 통합

- [x] 3.1 `SplashScreen.preventAutoHideAsync()` 모듈 레벨에서 호출 추가
- [x] 3.2 첫 렌더 후 즉시 `SplashScreen.hideAsync()` 호출 (useEffect 빈 deps 또는 컴포넌트 마운트 시점)
- [x] 3.3 `SplashOverlay`를 앱 최상단에 절대 위치로 렌더링 (Provider 트리 위에 overlay)
- [x] 3.4 `fontsLoaded`, `dbReady` 상태를 SplashOverlay에 전달
- [x] 3.5 기존 `ActivityIndicator` 로딩 화면 완전 제거

## 4. 검증

- [ ] 4.1 iOS 시뮬레이터에서 앱 로고 없이 문구만 표시되는지 확인
- [ ] 4.2 Android 시뮬레이터에서 동일 문구 표시 및 fade-out 확인
- [x] 4.3 `npx tsc --noEmit` 타입 체크 통과
