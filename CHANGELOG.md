# CHANGELOG

> 빌드 전 **현재 배포 현황** 확인 → 변경사항 작성 → 빌드 → 현황 업데이트

---

## 현재 배포 현황

| 플랫폼 | 버전 | 빌드 | 채널 | 날짜 |
|--------|------|------|------|------|
| iOS | 1.0.1 | build 9 | TestFlight (외부 테스터) | 2026-03-30 |
| Android | 1.0.1 | versionCode 6 | Play 내부테스트 | 2026-03-30 |

> **iOS**: EAS remote 관리 (`autoIncrement: true`) — app.json buildNumber 무관. EAS 대시보드 기준.
> **Android**: 로컬 Gradle 빌드 (`cd android && ./gradlew bundleRelease`) — versionCode 수동 관리.

---

## 빌드 체크리스트

빌드할 때마다 순서대로:

- [ ] 이 파일에 새 항목 작성 (변경사항 정리)
- [ ] iOS: `eas build --platform ios --profile production`
- [ ] iOS: `npx eas submit --platform ios --latest`
- [ ] iOS: App Store Connect → 외부 테스터 그룹에 새 빌드 수동 추가
- [ ] Android: `app.json` + `android/app/build.gradle` versionCode 동시 올리기 → `cd android && ./gradlew bundleRelease` → Play Console 직접 업로드
- [ ] **현재 배포 현황** 표 업데이트 (빌드 번호, 날짜)

---

## v1.0.1

### build 9 (iOS) · versionCode 6 (Android) — 2026-03-30

- AI 등대 프롬프트 개선: 아이 이름 컨텍스트 주입, 멀티턴 연속성 규칙 추가
- AI 등대 structuredData 전체 태그 확장 (기존 #의료/#투약 한정 → 전체)
- AI 등대 대화 기억 창 4→8 메시지

---

### build 7 (iOS) · versionCode 4 (Android) — 2026-03-28

- Android 앱 아이콘 수정 (foreground 이미지 누락 반영)
- 다크모드 마이크 아이콘 색상 수정 (primaryLight 통일)
- offlineQueue force 파라미터 추가 + 수동 처리 피드백 개선
- 텍스트 검색 limit 제거 (오래된 기록도 검색 가능)
- AI 등대 텍스트 검색 폴백 추가 (키워드 LIKE 검색)
- 임베딩 소스 합성: buildEmbeddingText (raw_text + summary)
- 인앱 팔레트 선택 8종 (설정 화면)
- AI summary 문체 ~함/~음 체 고정
- 커스텀 태그 색상 이름 해시 기반 다양화 (8색 팔레트)
- AI 등대 full-context 검색 전환 (벡터 임베딩 완전 제거)
- HomeScreen 기록 10개 고정, 무한스크롤 제거
- 태그 시스템 개편: child_id 격리 + RecordDetail 태그 편집 UI

---

## v1.0.0

### build 5 (iOS) — 2026-03-24

- AI 무한로딩 근본 수정: warmDeno AbortController (iOS Hermes 호환), 타임아웃 25초
- offlineQueue 지수 백오프 자동 재시도 (10s → 30s → 1m → 2m)
- offlineQueue onQueueProcessed 콜백
- RecordDetailScreen aiPending 배너 자동 갱신

### build 3 (iOS) — 2026-03-22

- aiseossi-knowledge 서브모듈 → 독립 클론 전환

### build 2 (iOS) — 2026-03-20

- Pretendard 폰트 4종 적용
- RecordingScreen OrganicBlob 시각화 (Reanimated)
- 커스텀 태그 AI 자동 적용
- 항해일지 독립 탭 (VoyageLogScreen)
- SearchScreen 채팅 버블 UI (multi-turn 대화)
- CalendarScreen 날짜 카드 스와이프 애니메이션
- 탭 바 레이아웃 수정 (입력창 겹침 근본 수정)
- eas.json 하드코딩 시크릿 제거

### build 1 (iOS) — 2026-03-20

- 최초 TestFlight 제출 (실패 → build 2로 재시도)
