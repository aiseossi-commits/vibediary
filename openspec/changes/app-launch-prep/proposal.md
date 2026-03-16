## Why

앱 출시 전 보안, 코드 품질, 스토어 메타데이터, 빌드 등 런칭 필수 항목을 점검·완료한다.
기능 개발은 완료됐으나 출시 준비 작업이 체계적으로 정리되지 않은 상태다.

## What Changes

- `stt.ts` 운영 불필요 console.log 4개 제거
- `app.json` 앱 이름/버전/빌드번호 스토어 기준으로 확정
- Android AAB 릴리즈 빌드 (Play Store용)
- iOS Archive 빌드 준비 확인
- 개인정보 처리방침 URL 앱 내 링크 추가 (Google Play 필수)
- 앱 스토어 메타데이터 문서화 (설명문, 키워드, 스크린샷 가이드)

## Capabilities

### New Capabilities
- `store-metadata`: 스토어 제출용 앱 이름, 설명문, 키워드, 스크린샷 스펙 정의
- `privacy-policy-link`: 앱 내 개인정보 처리방침 링크 (설정 화면)

### Modified Capabilities
- 없음

## Impact

- `src/services/stt.ts`: console.log 제거
- `src/screens/SettingsScreen.tsx`: 개인정보 처리방침 링크 추가
- `app.json`: 버전/빌드번호 확정
- Android 빌드: APK → AAB 전환
- 외부: 개인정보 처리방침 페이지 필요 (URL 확보)
