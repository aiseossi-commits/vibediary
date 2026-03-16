## Context

기능 개발이 완료된 바다(VibeDiary) 앱을 Google Play Store / App Store에 제출하기 위한 준비 작업이다.
코드 변경은 최소화하고, 스토어 제출에 필요한 항목들을 빠르게 완료하는 것이 목표다.

## Goals / Non-Goals

**Goals:**
- 운영 불필요 로그 제거로 릴리즈 빌드 정리
- 개인정보 처리방침 링크를 설정 화면에 추가 (Play Store 필수)
- Android AAB 빌드 완료
- 스토어 제출용 메타데이터 문서 작성

**Non-Goals:**
- 개인정보 처리방침 페이지 직접 제작 (외부 URL 링크만 추가)
- iOS App Store 제출 (Android 우선)
- 신규 기능 추가

## Decisions

**console.log 제거 범위**
`stt.ts`의 운영 진단용 log 4개 제거. `console.error`/`warn`은 에러 추적 목적이므로 유지.
이유: 릴리즈 빌드에서 로그가 성능에 미치는 영향은 미미하나, 민감한 STT 텍스트가 노출될 수 있음.

**개인정보 처리방침 구현 방식**
설정 화면 "앱 정보" 섹션에 텍스트 링크 추가 → `Linking.openURL()`로 외부 브라우저 오픈.
이유: 인앱 웹뷰보다 구현이 단순하고, Play Store 정책 요건(접근 가능한 URL)을 충족함.

**Android 빌드 형식**
APK → AAB(Android App Bundle)로 전환.
이유: Play Store 신규 앱 등록 시 AAB 필수(2021년 이후).

**앱 이름**
스토어 표시명: "바다 - 돌봄 기록 앱" (영문: Bada - Care Diary)
`app.json`의 `name`은 "VibeDiary" 유지 (내부 슬러그/패키지명 변경 비용이 큼).

## Risks / Trade-offs

- [개인정보 처리방침 URL 미확보] → URL 확보 전까지 링크 비활성화 또는 플레이스홀더 사용
- [AAB 빌드 서명키 분실] → 키스토어 파일 안전한 위치에 백업 필수, 분실 시 앱 업데이트 불가
- [스크린샷 준비 지연] → 스토어 등록 타임라인에 영향, 사전 캡처 필요
