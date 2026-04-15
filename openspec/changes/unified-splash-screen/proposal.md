## Why

앱 실행 시 iOS에서는 "기록에 치이지 말고, 그냥 말하세요" 문구 스플래시가 보이지만 Android에서는 기본 앱 로고가 표시되어 플랫폼 간 경험이 불일치한다. 로고 대신 브랜드 문구를 일관되게 보여줌으로써 첫인상을 통일한다.

## What Changes

- Android 스플래시를 앱 아이콘/로고 대신 "기록에 치이지 말고, 그냥 말하세요" 텍스트 화면으로 교체
- JS 레벨 커스텀 스플래시 컴포넌트(`SplashOverlay`)를 도입하여 iOS/Android 동일 렌더링
- 네이티브 스플래시 화면(`expo-splash-screen`)을 최대한 빠르게 숨기고 JS 스플래시로 전환
- iOS의 기존 스플래시 노출 시간(폰트+DB 로딩 완료 기준)을 Android에도 동일하게 적용
- `App.tsx`에서 로딩 완료 전까지 JS 스플래시를 렌더링하고 완료 시 fade-out 후 앱 본체 표시

## Capabilities

### New Capabilities
- `splash-overlay`: JS 기반 브랜드 문구 스플래시 — 플랫폼 무관하게 "기록에 치이지 말고, 그냥 말하세요" 표시, 로딩 완료 시 fade-out 전환

### Modified Capabilities
<!-- 없음 — 기존 spec의 요구사항이 변경되지 않음 -->

## Impact

- `App.tsx` — SplashOverlay 컴포넌트 통합, `expo-splash-screen` 즉시 hideAsync 처리
- `android/app/src/main/res/` — Android 네이티브 스플래시 리소스 (기존 로고 이미지 대체 불필요, JS로 처리)
- `app.json` — Android splash backgroundColor 설정 (JS 스플래시 배경색과 일치)
- 신규 파일: `src/components/SplashOverlay.tsx`
- 의존성: `expo-splash-screen` (package.json에 이미 추가됨)
