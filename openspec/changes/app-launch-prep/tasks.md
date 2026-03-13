## 1. 코드 정리

- [x] 1.1 `stt.ts` console.log 4개 제거 (소음 판정, 무음 감지, 환각 감지, 온라인 상태)

## 2. 개인정보 처리방침 링크

- [x] 2.1 개인정보 처리방침 URL 확보 (GitHub Pages: https://aiseossi-commits.github.io/vibediary/privacy-policy.html)
- [ ] 2.2 `SettingsScreen.tsx` 앱 정보 섹션에 "개인정보 처리방침" 링크 추가 (`Linking.openURL`)

## 3. 앱 스토어 메타데이터

- [ ] 3.1 스토어 표시 앱 이름 확정 ("바다 - 돌봄 기록 앱")
- [ ] 3.2 짧은 설명 작성 (80자 이내)
- [ ] 3.3 긴 설명 작성 (4000자 이내)
- [ ] 3.4 키워드/카테고리 확정
- [ ] 3.5 스크린샷 캡처 (Android: 폰 최소 2장)

## 4. Android AAB 빌드

- [ ] 4.1 키스토어 파일 위치 및 비밀번호 확인
- [ ] 4.2 `./android/gradlew bundleRelease` 로 AAB 빌드
- [ ] 4.3 빌드된 AAB 파일 확인 (`android/app/build/outputs/bundle/release/`)

## 5. 최종 검증

- [ ] 5.1 릴리즈 APK 설치 후 핵심 플로우 테스트 (녹음 → AI 처리 → 백업)
- [ ] 5.2 설정 화면 개인정보 처리방침 링크 동작 확인
